import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRICING_PLANS, CREDIT_COSTS, PricingPlan } from "@/lib/commercialProducts";

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

      // If no subscription, create default starter
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

      // If no credits, create with default 10
      if (!creditsData) {
        const { data: newCredits } = await supabase
          .from("credits")
          .insert({
            user_id: user.id,
            balance: 10,
          })
          .select()
          .single();
        setCredits(newCredits);
        
        // Log welcome bonus
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          amount: 10,
          type: "bonus",
          description: "Welcome bonus credits",
        });
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

  const deductCredits = async (productId: string, description: string): Promise<boolean> => {
    if (!user || !credits) return false;

    const cost = CREDIT_COSTS[productId];
    if (!cost) return false;

    if (credits.balance < cost) {
      return false;
    }

    // Use RPC function for atomic deduction
    const { data: success } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: cost,
    });

    if (success) {
      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -cost,
        type: "consumption",
        description,
      });

      // Refresh data
      await fetchData();
      return true;
    }

    return false;
  };

  const addCredits = async (amount: number, description: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await supabase.rpc("add_credits", {
        p_user_id: user.id,
        p_amount: amount,
      });

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: amount,
        type: "purchase",
        description,
      });

      // Refresh data
      await fetchData();
      return true;
    } catch (error) {
      console.error("Error adding credits:", error);
      return false;
    }
  };

  const canAfford = (productId: string): boolean => {
    const cost = CREDIT_COSTS[productId];
    return credits ? credits.balance >= cost : false;
  };

  const checkDailyLimit = async (contentType: "image" | "video"): Promise<{ allowed: boolean; reason?: string }> => {
    if (!user || !currentPlan) return { allowed: false, reason: "no_subscription" };

    const limit = contentType === "image" 
      ? currentPlan.limits.autopostImages 
      : currentPlan.limits.autopostVideos;

    // -1 means unlimited
    if (limit === -1) return { allowed: true };

    // For Starter plan, no videos allowed
    if (contentType === "video" && limit === 0) {
      return { allowed: false, reason: "plan_limit" };
    }

    // Count today's generations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("scheduled_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("content_type", contentType)
      .gte("created_at", today.toISOString());

    if ((count || 0) >= limit) {
      return { allowed: false, reason: "daily_limit_reached" };
    }

    return { allowed: true };
  };

  return {
    subscription,
    credits,
    transactions,
    currentPlan,
    isLoading,
    balance: credits?.balance || 0,
    deductCredits,
    addCredits,
    canAfford,
    checkDailyLimit,
    refresh: fetchData,
  };
};
