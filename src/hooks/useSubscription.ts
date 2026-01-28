import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRICING_PLANS, PricingPlan, PLAN_QUALITY_ACCESS } from "@/lib/commercialProducts";

interface SubscriptionState {
  planId: string;
  status: string;
  subscriptionEnd: string | null;
  isSubscribed: boolean;
  stripeCustomerId: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>({
    planId: "starter",
    status: "active",
    subscriptionEnd: null,
    isSubscribed: false,
    stripeCustomerId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingStripe, setIsCheckingStripe] = useState(false);

  const currentPlan: PricingPlan = PRICING_PLANS.find(p => p.id === subscription.planId) || PRICING_PLANS[0];
  const planAccess = PLAN_QUALITY_ACCESS[subscription.planId] || PLAN_QUALITY_ACCESS.starter;

  // Check subscription status via Stripe
  const checkSubscription = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check if we have a valid session before calling the edge function
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.log("No valid session, skipping subscription check");
      setIsLoading(false);
      await loadFromDatabase();
      return;
    }

    setIsCheckingStripe(true);

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        console.error("Error checking subscription:", error);
        // Fall back to database
        await loadFromDatabase();
      } else if (data) {
        setSubscription({
          planId: data.plan_id || "starter",
          status: data.status || "active",
          subscriptionEnd: data.subscription_end,
          isSubscribed: data.subscribed || false,
          stripeCustomerId: null, // Not returned from check-subscription
        });
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
      await loadFromDatabase();
    } finally {
      setIsLoading(false);
      setIsCheckingStripe(false);
    }
  }, [user]);

  // Load from local database as fallback
  const loadFromDatabase = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setSubscription({
        planId: data.plan_id || "starter",
        status: data.status || "active",
        subscriptionEnd: data.renews_at,
        isSubscribed: data.plan_id !== "starter",
        stripeCustomerId: data.stripe_customer_id || null,
      });
    }
  };

  // Initial load
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh subscription periodically (every 60 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Start checkout session
  const startCheckout = async (type: "subscription" | "credits", options: { planId?: string; packId?: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type,
          planId: options.planId,
          packId: options.packId,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        return { success: true };
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      console.error("Checkout error:", err);
      return { success: false, error: err };
    }
  };

  // Open customer portal
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
      console.error("Portal error:", err);
      return { success: false, error: err };
    }
  };

  // Guard functions
  const canAccessFeature = (feature: "video" | "campaigns" | "projects" | "studio"): boolean => {
    switch (feature) {
      case "video":
        return planAccess.video.length > 0;
      case "campaigns":
        return subscription.planId !== "starter" || planAccess.maxCampaigns > 0;
      case "projects":
        return true; // All plans have at least some projects
      case "studio":
        return planAccess.image.includes("studio-image");
      default:
        return false;
    }
  };

  const canAccessQuality = (qualityId: string): boolean => {
    return planAccess.image.includes(qualityId) || planAccess.video.includes(qualityId);
  };

  const getAutopostLimit = (contentType: "image" | "video"): number => {
    return contentType === "image" 
      ? planAccess.autopostImagesPerDay 
      : planAccess.autopostVideosPerDay;
  };

  const getRemainingQuota = (contentType: "image" | "video"): { limit: number; used: number; remaining: number } => {
    const limit = getAutopostLimit(contentType);
    // In a real implementation, this would check actual usage from database
    return { limit, used: 0, remaining: limit === -1 ? Infinity : limit };
  };

  return {
    subscription,
    currentPlan,
    planAccess,
    isLoading,
    isCheckingStripe,
    // Actions
    checkSubscription,
    startCheckout,
    openCustomerPortal,
    // Guards
    canAccessFeature,
    canAccessQuality,
    getAutopostLimit,
    getRemainingQuota,
    // Convenience
    isPro: subscription.planId === "pro" || subscription.planId === "business",
    isBusiness: subscription.planId === "business",
    isSubscribed: subscription.isSubscribed,
  };
};
