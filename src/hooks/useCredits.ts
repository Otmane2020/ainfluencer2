import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  PRICING_PLANS, 
  PricingPlan, 
  QualityTier,
  ContentType,
  getCreditCost,
  calculateCampaignCost,
  CampaignCostConfig,
} from "@/lib/commercialProducts";

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

  const currentPlan: PricingPlan | undefined = subscription
    ? PRICING_PLANS.find(p => p.id === subscription.plan_id)
    : PRICING_PLANS.find(p => p.id === "starter");

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!subData) {
        const { data: newSub } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan_id: "starter",
            status: "active",
          })
          .select()
          .single();
        setSubscription(newSub);
      } else {
        setSubscription(subData);
      }

      // Fetch credits
      const { data: creditsData } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!creditsData) {
        const { data: existingBonus } = await supabase
          .from("credit_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("type", "bonus")
          .eq("description", "Welcome bonus credits")
          .limit(1)
          .maybeSingle();

        if (!existingBonus) {
          const { data: newCredits, error: insertError } = await supabase
            .from("credits")
            .insert({ user_id: user.id, balance: 500 })
            .select()
            .single();

          if (!insertError && newCredits) {
            setCredits(newCredits);
            await supabase.from("credit_transactions").insert({
              user_id: user.id,
              amount: 500,
              type: "bonus",
              description: "Welcome bonus credits",
            });
          } else {
            const { data: retryCredits } = await supabase
              .from("credits")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();
            setCredits(retryCredits);
          }
        } else {
          const { data: retryCredits } = await supabase
            .from("credits")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          setCredits(retryCredits);
        }
      } else {
        setCredits(creditsData);
      }

      // Fetch recent transactions
      const { data: txData } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransactions(txData || []);
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deduct credits for a generation
  const deductCredits = async (
    contentType: ContentType, 
    quality: QualityTier, 
    description: string
  ): Promise<boolean> => {
    if (!user || !credits) return false;

    const cost = getCreditCost(contentType, quality);
    
    if (credits.balance < cost) {
      return false;
    }

    const { data: success } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: cost,
    });

    if (success) {
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -cost,
        type: "consumption",
        description,
      });

      await fetchData();
      return true;
    }

    return false;
  };

  // Deduct by raw amount (for campaigns)
  const deductCreditsRaw = async (amount: number, description: string): Promise<boolean> => {
    if (!user || !credits || credits.balance < amount) return false;

    const { data: success } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: amount,
    });

    if (success) {
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -amount,
        type: "consumption",
        description,
      });

      await fetchData();
      return true;
    }

    return false;
  };

  // Add credits
  const addCredits = async (amount: number, description: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await supabase.rpc("add_credits", {
        p_user_id: user.id,
        p_amount: amount,
      });

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: amount,
        type: "purchase",
        description,
      });

      await fetchData();
      return true;
    } catch (error) {
      console.error("Error adding credits:", error);
      return false;
    }
  };

  // Check if user can afford a specific generation
  const canAfford = (contentType: ContentType, quality: QualityTier): boolean => {
    const cost = getCreditCost(contentType, quality);
    return credits ? credits.balance >= cost : false;
  };

  // Check if user can afford a campaign
  const canAffordCampaign = (config: CampaignCostConfig): boolean => {
    const totalCost = calculateCampaignCost(config);
    return credits ? credits.balance >= totalCost : false;
  };

  // Get cost for a generation
  const getGenerationCost = (contentType: ContentType, quality: QualityTier): number => {
    return getCreditCost(contentType, quality);
  };

  // Get campaign cost
  const getCampaignCost = (config: CampaignCostConfig): number => {
    return calculateCampaignCost(config);
  };

  return {
    subscription,
    credits,
    transactions,
    currentPlan,
    isLoading,
    balance: credits?.balance || 0,
    // Actions
    deductCredits,
    deductCreditsRaw,
    addCredits,
    refresh: fetchData,
    // Checks
    canAfford,
    canAffordCampaign,
    getGenerationCost,
    getCampaignCost,
  };
};
