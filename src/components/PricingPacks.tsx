import { motion } from "framer-motion";
import { Check, Award, Zap, Building2, Wand2, Image, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS, PricingPlan } from "@/lib/commercialProducts";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PricingPacksProps {
  onSelectPack?: (plan: PricingPlan) => void;
  currentPlanId?: string;
  compact?: boolean;
}

const getPlanIcon = (planId: string) => {
  switch (planId) {
    case "starter":
      return Wand2;
    case "pro":
      return Zap;
    case "business":
      return Building2;
    default:
      return Award;
  }
};

const getPlanGradient = (planId: string) => {
  switch (planId) {
    case "starter":
      return "from-blue-500 to-cyan-500";
    case "pro":
      return "from-primary to-secondary";
    case "business":
      return "from-purple-500 to-pink-500";
    default:
      return "from-gray-500 to-gray-600";
  }
};

export const PricingPacks = ({
  onSelectPack,
  currentPlanId,
  compact = false,
}: PricingPacksProps) => {
  const { startCheckout, openCustomerPortal, subscription } = useSubscription();
  const { toast } = useToast();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const effectiveCurrentPlanId = currentPlanId || subscription.planId;

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (onSelectPack) {
      onSelectPack(plan);
      return;
    }

    const isCurrentPlan = effectiveCurrentPlanId === plan.id;
    if (isCurrentPlan) return;

    // If user has an active subscription, open customer portal to manage/upgrade
    if (subscription.isSubscribed) {
      setLoadingPlanId(plan.id);
      try {
        const result = await openCustomerPortal();
        if (!result.success) {
          toast({
            title: "Error",
            description: "Failed to open subscription management. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setLoadingPlanId(null);
      }
      return;
    }

    // Start new checkout
    setLoadingPlanId(plan.id);
    try {
      const result = await startCheckout("subscription", { planId: plan.id });
      if (!result.success) {
        toast({
          title: "Error",
          description: "Failed to start checkout. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className={cn(
      "grid gap-6",
      compact ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 lg:grid-cols-3"
    )}>
      {PRICING_PLANS.map((plan, index) => {
        const Icon = getPlanIcon(plan.id);
        const isCurrentPlan = effectiveCurrentPlanId === plan.id;
        const isPopular = plan.popular;
        const isLoading = loadingPlanId === plan.id;

        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative flex flex-col rounded-2xl border-2 bg-card p-6 transition-all",
              isPopular
                ? "border-primary shadow-xl shadow-primary/20"
                : "border-border hover:border-primary/50",
              isCurrentPlan && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {/* Badge */}
            {plan.badge && (
              <div className={cn(
                "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white shadow-lg",
                `bg-gradient-to-r ${getPlanGradient(plan.id)}`
              )}>
                {plan.badge}
              </div>
            )}

            {/* Current plan indicator */}
            {isCurrentPlan && (
              <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-lg">
                CURRENT
              </div>
            )}

            {/* Header */}
            <div className="mb-6 text-center">
              <div className={cn(
                "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
                `bg-gradient-to-br ${getPlanGradient(plan.id)}`
              )}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-1 font-display text-2xl font-bold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>

            {/* Price */}
            <div className="mb-6 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gradient">${plan.price}</span>
                <span className="text-muted-foreground">{plan.priceUnit}</span>
              </div>
            </div>

            {/* AutoPost Limits */}
            <div className="mb-6 rounded-xl bg-muted/50 p-4">
              <h4 className="mb-3 text-sm font-semibold">AutoPost AI Limits:</h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-card p-2">
                  <div className="flex items-center justify-center gap-1">
                    <Image className="h-3 w-3 text-primary" />
                    <span className="text-lg font-bold text-primary">
                      {plan.limits.autopostImages === -1 ? "∞" : plan.limits.autopostImages}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Images/day</div>
                </div>
                <div className="rounded-lg bg-card p-2">
                  <div className="flex items-center justify-center gap-1">
                    <Video className="h-3 w-3 text-secondary" />
                    <span className="text-lg font-bold text-secondary">
                      {plan.limits.autopostVideos === -1 ? "∞" : plan.limits.autopostVideos}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Videos/day</div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => handleSelectPlan(plan)}
              disabled={isCurrentPlan || isLoading}
              className={cn(
                "w-full",
                isPopular && "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              )}
              variant={isPopular ? "default" : "outline"}
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isCurrentPlan ? (
                "Current Plan"
              ) : subscription.isSubscribed ? (
                "Manage Subscription"
              ) : (
                `Choose ${plan.name}`
              )}
            </Button>

            {/* Credit info */}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              + Pay per generation with credits
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PricingPacks;
