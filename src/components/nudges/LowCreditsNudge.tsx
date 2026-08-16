import { motion } from "framer-motion";
import { AlertTriangle, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "@/lib/router-compat";

export const LowCreditsNudge = () => {
  const { balance } = useCredits();
  const { subscription, startCheckout } = useSubscription();
  const navigate = useNavigate();

  // Don't show if balance is above threshold or not subscribed
  if (!subscription.isSubscribed || balance > 5) return null;

  const isZero = balance === 0;

  const handleBuyCredits = async () => {
    // Upgrade to next plan for more credits
    const nextPlan = subscription.planId === "starter" ? "pro" : "business";
    await startCheckout("subscription", { planId: nextPlan });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
        isZero
          ? "bg-destructive/5 border-destructive/20"
          : "bg-orange-500/5 border-orange-500/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
          isZero ? "bg-destructive/10" : "bg-orange-500/10"
        }`}>
          {isZero ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Zap className="h-4 w-4 text-orange-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">
            {isZero ? "You're out of credits!" : `Only ${balance} credits left`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isZero
              ? "Upgrade your plan to keep creating amazing content"
              : "Running low — upgrade for more credits and unlock more features"}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={handleBuyCredits}
        className={isZero ? "bg-destructive hover:bg-destructive/90" : ""}
      >
        Upgrade
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </motion.div>
  );
};
