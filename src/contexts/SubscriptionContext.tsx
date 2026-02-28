import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRICING_PLANS, PricingPlan, getPlanAccess, PlanAccess } from "@/lib/commercialProducts";
import { buildCheckoutDebug, formatDebugForClipboard, isCheckoutDebugEnabled, logCheckoutDebug } from "@/lib/checkoutDebug";

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
  startCheckout: (type: "subscription" | "credits", options: { planId?: string; packId?: string }) => Promise<{ success: boolean; error?: unknown; debug?: import("@/lib/checkoutDebug").CheckoutDebugPayload }>;
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

    // Best-effort: ensure founder org has lifetime grant
    if (user.email) {
      try {
        await supabase.functions.invoke("grant-founder-lifetime", {
          body: { email: user.email },
        });
      } catch {
        // ignore errors, fallback to normal subscription flow
      }
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "?";
    const debug = (payload: Partial<Parameters<typeof buildCheckoutDebug>[0]>) =>
      buildCheckoutDebug({ supabaseUrl, planId: options.planId, type, ...payload });

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !sessionData?.session?.access_token) {
        const isInvalidToken = String(sessionError?.message ?? "").includes("Refresh Token") || String(sessionError?.message ?? "").includes("Invalid");
        if (isInvalidToken) {
          await supabase.auth.signOut();
        }
        logCheckoutDebug("session failed", { sessionError, hasSession: false });
        const msg = isInvalidToken
          ? "Session invalide (ancien projet ?). Tu as été déconnecté. Reconnecte-toi."
          : "Session expirée. Reconnecte-toi.";
        return {
          success: false,
          error: new Error(msg),
          debug: debug({ step: "session", hasSession: false, responseError: sessionError, errorMessage: msg }),
        };
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.clipmotion.ai";
      logCheckoutDebug("invoke start", { supabaseUrl, planId: options.planId, type });

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type, planId: options.planId, packId: options.packId, origin },
      });

      const rawPayload = { data, error, errorKeys: error ? Object.keys(error as object) : [], errorMessage: (error as { message?: string })?.message };
      logCheckoutDebug("invoke response", rawPayload);
      if (data?.error || error) {
        console.warn("[CHECKOUT] erreur:", { dataError: data?.error, errorMsg: (error as { message?: string })?.message, errorKeys: error ? Object.keys(error as object) : [] });
      }

      if (data?.error) {
        const msg = typeof data.error === "string" ? data.error : "Checkout failed";
        const hint = msg.includes("STRIPE_SECRET_KEY")
          ? " → Supabase Dashboard → Edge Functions → Secrets : STRIPE_SECRET_KEY (sk_...)"
          : "";
        return {
          success: false,
          error: new Error(msg + hint),
          debug: debug({ step: "data.error", hasSession: true, responseData: data, responseError: null, errorMessage: msg }),
        };
      }

      if (error) {
        let msg = "Échec du démarrage du checkout.";
        try {
          const err = error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } };
          if (typeof err?.context?.json === "function") {
            const body = await err.context.json();
            msg = body?.error ?? err?.message ?? msg;
          } else {
            msg = (err as { message?: string })?.message ?? msg;
          }
        } catch (parseErr) {
          msg = (error as { message?: string })?.message ?? msg;
          console.warn("[checkout] failed to parse error body:", parseErr);
        }
        if (!msg || msg.trim() === "") msg = `Erreur invoquant create-checkout (${String((error as { name?: string })?.name ?? "unknown")})`;
        const hint = String(msg).includes("STRIPE_SECRET_KEY")
          ? " → Supabase Dashboard → Edge Functions → Secrets : STRIPE_SECRET_KEY (sk_...)"
          : "";
        const errStr = String(msg).toLowerCase();
        const isUnreachable = errStr.includes("failed") || errStr.includes("network") || errStr.includes("cors") || errStr.includes("load") || errStr.includes("not_found") || errStr.includes("404");
        const friendlyMsg = isUnreachable
          ? "Checkout indisponible. VITE_SUPABASE_URL doit être https://axwwpawvezqsybttulyo.supabase.co et create-checkout déployé."
          : msg + hint;
        return {
          success: false,
          error: new Error(friendlyMsg),
          debug: debug({ step: "invoke error", hasSession: true, responseData: data, responseError: error, errorMessage: msg }),
        };
      }

      if (data?.url) {
        const opened = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!opened) window.location.href = data.url;
        return { success: true };
      }

      return {
        success: false,
        error: new Error("No checkout URL returned"),
        debug: debug({ step: "no url", hasSession: true, responseData: data, errorMessage: "No checkout URL returned" }),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec du démarrage du checkout.";
      logCheckoutDebug("catch", err);
      return {
        success: false,
        error: err instanceof Error ? err : new Error("Échec du démarrage du checkout."),
        debug: debug({ step: "catch", hasSession: true, responseError: err, errorMessage: msg }),
      };
    }
  };

  const openCustomerPortal = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.clipmotion.ai";
      const { data, error } = await supabase.functions.invoke("customer-portal", { body: { origin } });
      if (error) throw error;
      if (data?.url) {
        const opened = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!opened) window.location.href = data.url;
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
