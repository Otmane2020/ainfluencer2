import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CampaignCostConfig, ContentType, QualityTier } from "@/lib/commercialProducts";
import { CLIPMOTION_PLANS, type ClipMotionPlan } from "@/lib/clipmotionEconomics";

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  renews_at: string | null;
}

interface Credits {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export const useCredits = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentPlan: ClipMotionPlan =
    CLIPMOTION_PLANS.find((plan) => plan.id === subscription?.plan_id) ?? CLIPMOTION_PLANS[0];

  const fetchData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setCredits(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [subscriptionResult, creditsResult, transactionsResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id,user_id,plan_id,status,started_at,renews_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("credits")
          .select("id,user_id,balance,updated_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("credit_transactions")
          .select("id,user_id,amount,type,description,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setSubscription((subscriptionResult.data as Subscription | null) ?? null);
      setCredits((creditsResult.data as Credits | null) ?? null);
      setTransactions((transactionsResult.data as CreditTransaction[] | null) ?? []);
    } catch (error) {
      console.error("Error fetching ClipMotion credits", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Legacy compatibility only. Paid ClipMotion generation credits are mutated by
  // authenticated Edge Functions, never directly from the browser.
  const deductCredits = async (
    _contentType: ContentType,
    _quality: QualityTier,
    _description: string,
  ): Promise<boolean> => {
    console.warn("Client-side credit deduction is disabled. Use a billed generation Edge Function.");
    return false;
  };

  const deductCreditsRaw = async (_amount: number, _description: string): Promise<boolean> => {
    console.warn("Client-side credit deduction is disabled. Use a billed generation Edge Function.");
    return false;
  };

  const addCredits = async (_amount: number, _description: string): Promise<boolean> => {
    console.warn("Client-side credit minting is disabled. Credits are granted by Stripe/webhooks only.");
    return false;
  };

  const getGenerationCost = (contentType: ContentType, _quality?: QualityTier) => {
    return contentType === "video" ? 24 : 5;
  };

  const canAfford = (contentType: ContentType, quality: QualityTier) => {
    return (credits?.balance ?? 0) >= getGenerationCost(contentType, quality);
  };

  const getCampaignCost = (config: CampaignCostConfig) => {
    const daily = (config.imagesPerDay * 5) + (config.videosPerDay * 24);
    return daily * config.campaignDays;
  };

  const canAffordCampaign = (config: CampaignCostConfig) => {
    return (credits?.balance ?? 0) >= getCampaignCost(config);
  };

  return {
    subscription,
    credits,
    transactions,
    currentPlan,
    isLoading,
    balance: credits?.balance ?? 0,
    deductCredits,
    deductCreditsRaw,
    addCredits,
    refresh: fetchData,
    canAfford,
    canAffordCampaign,
    getGenerationCost,
    getCampaignCost,
  };
};
