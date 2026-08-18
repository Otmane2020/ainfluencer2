import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Check, Coins, Loader2, Sparkles, Wand2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { CLIPMOTION_PLANS, type ClipMotionPlan } from "@/lib/clipmotionEconomics";

interface PricingPacksProps {
  onSelectPack?: (plan: ClipMotionPlan) => void;
  currentPlanId?: string;
  compact?: boolean;
  /** Kept for backwards compatibility. Scarcity countdowns are intentionally disabled. */
  showFlashSale?: boolean;
}

const iconForPlan = (planId: string) => {
  if (planId === "pro") return Zap;
  if (planId === "business") return Building2;
  return Wand2;
};

export const PricingPacks = ({ onSelectPack, currentPlanId, compact = false }: PricingPacksProps) => {
  const { startCheckout, openCustomerPortal, subscription } = useSubscription();
  const { toast } = useToast();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const activePlanId = subscription.isSubscribed ? (currentPlanId || subscription.planId) : null;

  const handleSelect = async (plan: ClipMotionPlan) => {
    if (onSelectPack) {
      onSelectPack(plan);
      return;
    }

    if (subscription.isSubscribed && activePlanId === plan.id) return;
    setLoadingPlanId(plan.id);
    try {
      if (subscription.isSubscribed) {
        const result = await openCustomerPortal();
        if (!result.success) throw new Error("Could not open subscription management");
      } else {
        const result = await startCheckout("subscription", { planId: plan.id });
        if (!result.success) {
          const message = result.error instanceof Error ? result.error.message : String(result.error || "Checkout failed");
          throw new Error(message);
        }
      }
    } catch (error) {
      toast({
        title: "Checkout error",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className={cn("grid gap-5", compact ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 lg:grid-cols-3")}>
      {CLIPMOTION_PLANS.map((plan, index) => {
        const Icon = iconForPlan(plan.id);
        const isCurrent = subscription.isSubscribed && activePlanId === plan.id;
        const isLoading = loadingPlanId === plan.id;
        const motionClips = Math.floor(plan.credits / 24);
        const productVisuals = Math.floor(plan.credits / 5);

        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              "relative flex h-full flex-col rounded-3xl border bg-card p-6",
              plan.popular ? "border-primary shadow-xl shadow-primary/10" : "border-border",
              isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-3 py-1 text-[10px] font-bold tracking-wide text-primary-foreground">
                {plan.badge}
              </span>
            )}

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="mt-6 flex items-end gap-1">
              <span className="font-display text-4xl font-bold">${plan.price}</span>
              <span className="pb-1 text-sm text-muted-foreground">{plan.priceUnit}</span>
            </div>

            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold text-primary">{plan.credits}</span>
                <span className="text-sm text-muted-foreground">generation credits / month</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Roughly {motionClips} standard 5s product-motion clips or {productVisuals} 720p product visuals when used on one format only.
              </p>
            </div>

            <div className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              variant={plan.popular ? "default" : "outline"}
              className={cn("mt-7 w-full", plan.popular && "gradient-primary")}
              disabled={isCurrent || isLoading}
              onClick={() => handleSelect(plan)}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isCurrent ? (
                "Current plan"
              ) : subscription.isSubscribed ? (
                "Manage subscription"
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Choose {plan.name}
                </>
              )}
            </Button>

            <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">
              Credits are shown before every generation. Higher duration or resolution uses more credits.
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PricingPacks;
