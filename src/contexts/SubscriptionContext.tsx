import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CLIPMOTION_PLANS, type ClipMotionPlan } from "@/lib/clipmotionEconomics";
import { buildCheckoutDebug, logCheckoutDebug } from "@/lib/checkoutDebug";

interface SubscriptionState {
  planId: string;
  status: string;
  subscriptionEnd: string | null;
  isSubscribed: boolean;
  stripeCustomerId: string | null;
  requiresCheckout: boolean;
  isLifetime: boolean;
}

interface CompatiblePlan extends Omit<ClipMotionPlan, "limits"> {
  creditValue: number;
  limits: {
    projects: number;
    campaigns: number;
  };
}

interface PlanAccess {
  maxProjects: number;
  maxCampaigns: number;
  canAutopost: boolean;
  hasPriorityQueue: boolean;
  hasApiAccess: boolean;
}

interface SubscriptionContextValue {
  subscription: SubscriptionState;
  currentPlan: CompatiblePlan;
  planAccess: PlanAccess;
  isLoading: boolean;
  isCheckingStripe: boolean;
  checkSubscription: () => Promise<void>;
  startCheckout: (
    type: "subscription" | "credits",
    options: { planId?: string; packId?: string },
  ) => Promise<{ success: boolean; error?: unknown; debug?: import("@/lib/checkoutDebug").CheckoutDebugPayload }>;
  openCustomerPortal: () => Promise<{ success: boolean; error?: unknown }>;
  redirectToCheckout: (planId?: string) => Promise<{ success: boolean; error?: unknown }>;
  canAccessFeature: (feature: "campaigns" | "projects" | "autopost" | "priority" | "api") => boolean;
  canCreateProject: () => Promise<boolean>;
  canCreateCampaign: () => Promise<boolean>;
  isPro: boolean;
  isBusiness: boolean;
  isSubscribed: boolean;
  requiresCheckout: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const inactiveState: SubscriptionState = {
  planId: "starter",
  status: "inactive",
  subscriptionEnd: null,
  isSubscribed: false,
  stripeCustomerId: null,
  requiresCheckout: true,
  isLifetime: false,
};

function compatiblePlan(planId: string): CompatiblePlan {
  const plan = CLIPMOTION_PLANS.find((item) => item.id === planId) ?? CLIPMOTION_PLANS[0];
  return {
    ...plan,
    creditValue: 0.1,
    limits: {
      projects: plan.limits.projects,
      campaigns: 0,
    },
  };
}

function accessFor(planId: string, active: boolean): PlanAccess {
  if (!active) {
    return { maxProjects: 0, maxCampaigns: 0, canAutopost: false, hasPriorityQueue: false, hasApiAccess: false };
  }
  const plan = compatiblePlan(planId);
  return {
    maxProjects: plan.limits.projects,
    maxCampaigns: 0,
    canAutopost: false,
    hasPriorityQueue: planId === "business",
    hasApiAccess: false,
  };
}

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(inactiveState);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingStripe, setIsCheckingStripe] = useState(false);

  const effectivePlanId = subscription.isLifetime ? "business" : subscription.planId;
  const currentPlan = compatiblePlan(effectivePlanId);
  const planAccess = accessFor(effectivePlanId, subscription.isSubscribed);

  const loadFromDatabase = useCallback(async () => {
    if (!user) {
      setSubscription(inactiveState);
      return;
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      setSubscription(inactiveState);
      return;
    }

    const validPlans = ["starter", "pro", "business"];
    const isLifetime = data.stripe_customer_id === "lifetime_grant";
    const hasStripeSubscription = Boolean(data.stripe_subscription_id);
    const isValidSubscription =
      data.status === "active" &&
      validPlans.includes(data.plan_id) &&
      (hasStripeSubscription || isLifetime);

    setSubscription({
      planId: data.plan_id || "starter",
      status: data.status || "inactive",
      subscriptionEnd: data.renews_at,
      isSubscribed: isValidSubscription,
      stripeCustomerId: data.stripe_customer_id || null,
      requiresCheckout: !isValidSubscription,
      isLifetime,
    });
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(inactiveState);
      setIsLoading(false);
      return;
    }

    if (user.email) {
      try {
        await supabase.functions.invoke("grant-founder-lifetime", { body: { email: user.email } });
      } catch {
        // founder grant is best-effort only
      }
    }

    setIsCheckingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error || !data) {
        await loadFromDatabase();
        return;
      }

      const isValidSubscription = data.subscribed === true && data.plan_id !== null;
      setSubscription({
        planId: data.plan_id || "starter",
        status: data.status || "inactive",
        subscriptionEnd: data.subscription_end || null,
        isSubscribed: isValidSubscription,
        stripeCustomerId: data.stripe_customer_id || null,
        requiresCheckout: data.requires_checkout || !isValidSubscription,
        isLifetime: data.lifetime === true,
      });
    } catch {
      await loadFromDatabase();
    } finally {
      setIsLoading(false);
      setIsCheckingStripe(false);
    }
  }, [user, loadFromDatabase]);

  useEffect(() => {
    void checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => void checkSubscription(), 60_000);
    return () => window.clearInterval(interval);
  }, [user, checkSubscription]);

  const startCheckout = async (
    type: "subscription" | "credits",
    options: { planId?: string; packId?: string },
  ) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "?";
    const debug = (payload: Partial<Parameters<typeof buildCheckoutDebug>[0]>) =>
      buildCheckoutDebug({ supabaseUrl, planId: options.planId, type, ...payload });

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !sessionData?.session?.access_token) {
        const message = "Session expired. Please sign in again.";
        return {
          success: false,
          error: new Error(message),
          debug: debug({ step: "session", hasSession: false, responseError: sessionError, errorMessage: message }),
        };
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.clipmotion.ai";
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type, planId: options.planId, packId: options.packId, origin },
      });
      logCheckoutDebug("checkout response", { type, planId: options.planId, packId: options.packId, data, error });

      if (data?.error) {
        const message = typeof data.error === "string" ? data.error : "Checkout failed";
        return {
          success: false,
          error: new Error(message),
          debug: debug({ step: "data.error", hasSession: true, responseData: data, responseError: error, errorMessage: message }),
        };
      }

      if (error) {
        let message = "Failed to start checkout.";
        try {
          const candidate = error as { message?: string; context?: Response };
          const body = await candidate.context?.clone().json();
          message = body?.error || candidate.message || message;
        } catch {
          message = (error as { message?: string })?.message || message;
        }
        return {
          success: false,
          error: new Error(message),
          debug: debug({ step: "invoke error", hasSession: true, responseData: data, responseError: error, errorMessage: message }),
        };
      }

      if (data?.url) {
        window.location.href = data.url;
        return { success: true };
      }

      const message = "No checkout URL returned";
      return {
        success: false,
        error: new Error(message),
        debug: debug({ step: "no url", hasSession: true, responseData: data, errorMessage: message }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start checkout.";
      return {
        success: false,
        error: error instanceof Error ? error : new Error(message),
        debug: debug({ step: "catch", hasSession: true, responseError: error, errorMessage: message }),
      };
    }
  };

  const openCustomerPortal = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.clipmotion.ai";
      const { data, error } = await supabase.functions.invoke("customer-portal", { body: { origin } });
      if (error) throw error;
      if (!data?.url) throw new Error("No portal URL returned");
      window.location.href = data.url;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const redirectToCheckout = async (planId = "starter") => startCheckout("subscription", { planId });

  const canAccessFeature = (feature: "campaigns" | "projects" | "autopost" | "priority" | "api") => {
    if (!subscription.isSubscribed) return false;
    if (feature === "projects") return planAccess.maxProjects !== 0;
    if (feature === "priority") return planAccess.hasPriorityQueue;
    return false;
  };

  const canCreateProject = async () => {
    if (!subscription.isSubscribed || !user) return false;
    if (planAccess.maxProjects === -1) return true;
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    return (count || 0) < planAccess.maxProjects;
  };

  const canCreateCampaign = async () => false;

  const value: SubscriptionContextValue = {
    subscription,
    currentPlan,
    planAccess,
    isLoading,
    isCheckingStripe,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
    redirectToCheckout,
    canAccessFeature,
    canCreateProject,
    canCreateCampaign,
    isPro: subscription.isSubscribed && (subscription.planId === "pro" || subscription.planId === "business"),
    isBusiness: subscription.isSubscribed && subscription.planId === "business",
    isSubscribed: subscription.isSubscribed,
    requiresCheckout: subscription.requiresCheckout,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return context;
};
