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
  requiresCheckout: boolean;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>({
    planId: "starter",
    status: "inactive",
    subscriptionEnd: null,
    isSubscribed: false,
    stripeCustomerId: null,
    requiresCheckout: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingStripe, setIsCheckingStripe] = useState(false);

  const currentPlan: PricingPlan = subscription.isSubscribed 
    ? (PRICING_PLANS.find(p => p.id === subscription.planId) || PRICING_PLANS[0])
    : PRICING_PLANS[0]; // Default to starter limits if not subscribed
  
  const planAccess = subscription.isSubscribed 
    ? (PLAN_QUALITY_ACCESS[subscription.planId] || PLAN_QUALITY_ACCESS.starter)
    : { 
        image: [], 
        video: [], 
        maxProjects: 0, 
        maxCampaigns: 0, 
        autopostImagesPerDay: 0, 
        autopostVideosPerDay: 0 
      };

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
        const isValidSubscription = data.subscribed === true && data.plan_id !== null;
        
        setSubscription({
          planId: data.plan_id || "starter",
          status: data.status || "inactive",
          subscriptionEnd: data.subscription_end,
          isSubscribed: isValidSubscription,
          stripeCustomerId: null,
          requiresCheckout: data.requires_checkout || !isValidSubscription,
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
      // Only consider valid if status is "active" and plan is recognized
      const validPlans = ["starter", "pro", "business"];
      const isValidSubscription = data.status === "active" && validPlans.includes(data.plan_id);
      
      setSubscription({
        planId: data.plan_id || "starter",
        status: data.status || "inactive",
        subscriptionEnd: data.renews_at,
        isSubscribed: isValidSubscription,
        stripeCustomerId: data.stripe_customer_id || null,
        requiresCheckout: !isValidSubscription,
      });
    } else {
      // No subscription record at all
      setSubscription({
        planId: "starter",
        status: "inactive",
        subscriptionEnd: null,
        isSubscribed: false,
        stripeCustomerId: null,
        requiresCheckout: true,
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

  // Guard functions - STRICT: No access if not subscribed
  const canAccessFeature = (feature: "video" | "campaigns" | "projects" | "studio"): boolean => {
    // No valid subscription = no access
    if (!subscription.isSubscribed) {
      return false;
    }
    
    switch (feature) {
      case "video":
        return planAccess.video.length > 0;
      case "campaigns":
        return planAccess.maxCampaigns !== 0;
      case "projects":
        return planAccess.maxProjects !== 0;
      case "studio":
        return planAccess.image.includes("studio-image");
      default:
        return false;
    }
  };

  const canAccessQuality = (qualityId: string): boolean => {
    if (!subscription.isSubscribed) return false;
    return planAccess.image.includes(qualityId) || planAccess.video.includes(qualityId);
  };

  const getAutopostLimit = (contentType: "image" | "video"): number => {
    if (!subscription.isSubscribed) return 0;
    return contentType === "image" 
      ? planAccess.autopostImagesPerDay 
      : planAccess.autopostVideosPerDay;
  };

  const getRemainingQuota = (contentType: "image" | "video"): { limit: number; used: number; remaining: number } => {
    if (!subscription.isSubscribed) {
      return { limit: 0, used: 0, remaining: 0 };
    }
    const limit = getAutopostLimit(contentType);
    // In a real implementation, this would check actual usage from database
    return { limit, used: 0, remaining: limit === -1 ? Infinity : limit };
  };

  // Redirect to checkout for the appropriate plan
  const redirectToCheckout = async (planId: string = "starter") => {
    return startCheckout("subscription", { planId });
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
    redirectToCheckout,
    // Guards
    canAccessFeature,
    canAccessQuality,
    getAutopostLimit,
    getRemainingQuota,
    // Convenience
    isPro: subscription.isSubscribed && (subscription.planId === "pro" || subscription.planId === "business"),
    isBusiness: subscription.isSubscribed && subscription.planId === "business",
    isSubscribed: subscription.isSubscribed,
    requiresCheckout: subscription.requiresCheckout,
  };
};
