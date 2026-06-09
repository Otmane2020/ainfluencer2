import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TRIAL_DAYS = 30;

export interface TrialStatus {
  isLoading: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number;
}

/**
 * Determines if the current user is still within the 30-day free trial
 * of the starter plan. Uses subscriptions.started_at as anchor.
 * Pro/Business or lifetime users are never considered "in trial".
 */
export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();
  const [state, setState] = useState<TrialStatus>({
    isLoading: true,
    isTrial: false,
    isTrialExpired: false,
    trialEndsAt: null,
    daysRemaining: TRIAL_DAYS,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id, status, started_at, stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const planId = data?.plan_id || "starter";
      const isLifetime = data?.stripe_customer_id === "lifetime_grant";
      const isPaid = planId === "pro" || planId === "business" || isLifetime;

      if (isPaid) {
        setState({
          isLoading: false,
          isTrial: false,
          isTrialExpired: false,
          trialEndsAt: null,
          daysRemaining: 0,
        });
        return;
      }

      const startedAt = data?.started_at ? new Date(data.started_at) : new Date();
      const endsAt = new Date(startedAt.getTime() + TRIAL_DAYS * 86400000);
      const now = Date.now();
      const msLeft = endsAt.getTime() - now;
      const daysRemaining = Math.max(0, Math.ceil(msLeft / 86400000));
      const isTrialExpired = msLeft <= 0;

      setState({
        isLoading: false,
        isTrial: !isTrialExpired,
        isTrialExpired,
        trialEndsAt: endsAt,
        daysRemaining,
      });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
