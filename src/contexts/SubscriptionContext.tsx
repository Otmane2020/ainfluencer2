import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRICING_PLANS, PricingPlan, getPlanAccess, PlanAccess } from "@/lib/commercialProducts";

interface SubscriptionState {
  planId: string;
  status: string;
  subscriptionEnd: string | null;
  isSubscribed: boolean;
  stripeCustomerId: string | null;
  requiresCheckout: boolean;
  isLifetime: boolean;
}

interface SubscriptionContextValue {
  subscription: SubscriptionState;
  currentPlan: PricingPlan;
  planAccess: PlanAccess;
  isLoading: boolean;
  isCheckingStripe: boolean;
  checkSubscription: () => Promise<void>;
  startCheckout: (type: "subscription" | "credits", options: { planId?: string; packId?: string }) => Promise<{ success: boolean; error?: unknown }>;
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

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>({
    planId: "starter",
    status: "inactive",
    subscriptionEnd: null,
    isSubscribed: false,
    stripeCustomerId: null,
    requiresCheckout: true,
    isLifetime: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingStripe, setIsCheckingStripe] = useState(false);

  const effectivePlanId = subscription.isLifetime ? "business" : subscription.planId;

  const currentPlan: PricingPlan = subscription.isSubscribed
    ? (PRICING_PLANS.find(p => p.id === effectivePlanId) || PRICING_PLANS[0])
    : PRICING_PLANS[0];

  const planAccess: PlanAccess = subscription.isSubscribed
    ? getPlanAccess(effectivePlanId)
    : { maxProjects: 0, maxCampaigns: 0, canAutopost: false, hasPriorityQueue: false, hasApiAccess: false };

  const loadFromDatabase = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const validPlans = ["starter", "pro", "business"];
      const isValidSubscription = data.status === "active" && validPlans.includes(data.plan_id);
      const isLifetime = data.stripe_customer_id === "lifetime_grant";
      setSubscription({
        planId: data.plan_id || "starter",
        status: data.status || "inactive",
        subscriptionEnd: data.renews_at,
        isSubscribed: isValidSubscription,
        stripeCustomerId: data.stripe_customer_id || null,
        requiresCheckout: !isValidSubscription,
        isLifetime,
      });
    } else {
      setSubscription({
        planId: "starter",
        status: "inactive",
        subscriptionEnd: null,
        isSubscribed: false,
        stripeCustomerId: null,
        requiresCheckout: true,
        isLifetime: false,
      });
    }
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.access_token) {
      setIsLoading(false);
      await loadFromDatabase();
      return;
    }

    const tokenExpiry = sessionData.session.expires_at;
    if (tokenExpiry && tokenExpiry * 1000 < Date.now()) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await loadFromDatabase();
        return;
      }
    }

    setIsCheckingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        await loadFromDatabase();
      } else if (data) {
        const isValidSubscription = data.subscribed === true && data.plan_id !== null;
        const isLifetime = data.lifetime === true;
        setSubscription({
          planId: data.plan_id || "starter",
          status: data.status || "inactive",
          subscriptionEnd: data.subscription_end,
          isSubscribed: isValidSubscription,
          stripeCustomerId: null,
          requiresCheckout: data.requires_checkout || !isValidSubscription,
          isLifetime,
        });
      }
    } catch {
      await loadFromDatabase();
    } finally {
      setIsLoading(false);
      setIsCheckingStripe(false);
    }
  }, [user, loadFromDatabase]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const startCheckout = async (type: "subscription" | "credits", options: { planId?: string; packId?: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type, planId: options.planId, packId: options.packId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        return { success: true };
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        return { success: true };
      }
      throw new Error("No portal URL returned");
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const redirectToCheckout = async (planId: string = "starter") => {
    return startCheckout("subscription", { planId });
  };

  const canAccessFeature = (feature: "campaigns" | "projects" | "autopost" | "priority" | "api"): boolean => {
    if (!subscription.isSubscribed) return false;
    switch (feature) {
      case "campaigns": return planAccess.maxCampaigns !== 0;
      case "projects": return planAccess.maxProjects !== 0;
      case "autopost": return planAccess.canAutopost;
      case "priority": return planAccess.hasPriorityQueue;
      case "api": return planAccess.hasApiAccess;
      default: return false;
    }
  };

  const canCreateProject = async (): Promise<boolean> => {
    if (!subscription.isSubscribed || !user) return false;
    if (planAccess.maxProjects === -1) return true;
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    return (count || 0) < planAccess.maxProjects;
  };

  const canCreateCampaign = async (): Promise<boolean> => {
    if (!subscription.isSubscribed || !user) return false;
    if (planAccess.maxCampaigns === -1) return true;
    const { count } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    return (count || 0) < planAccess.maxCampaigns;
  };

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

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
