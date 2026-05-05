import { motion } from "framer-motion";
import { Check, Award, Zap, Building2, Wand2, Image, Video, Loader2, Tag, Clock, Coins, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS, PricingPlan } from "@/lib/commercialProducts";
import { PlanPopularityBadge } from "@/components/nudges/PlanPopularityBadge";
import { AnchoringLabel } from "@/components/nudges/AnchoringLabel";
import { LiveViewersCount } from "@/components/nudges/LiveViewersCount";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { formatDebugForClipboard } from "@/lib/checkoutDebug";
import { useState, useEffect } from "react";

// Flash sale: highlight savings vs. equivalent stock photography costs
const FLASH_SALE_DISCOUNTS: Record<string, { discount: number; originalPrice: number }> = {
  pro: { discount: 50, originalPrice: 58 },
  business: { discount: 30, originalPrice: 113 },
};

interface PricingPacksProps {
  onSelectPack?: (plan: PricingPlan) => void;
  currentPlanId?: string;
  compact?: boolean;
  showFlashSale?: boolean;
}

const getPlanIcon = (planId: string) => {
  switch (planId) {
    case "starter":
      return Sparkles;
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
      return "from-emerald-500 to-teal-500";
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
  showFlashSale = true,
}: PricingPacksProps) => {
  const { startCheckout, openCustomerPortal, subscription } = useSubscription();
  const { toast } = useToast();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 33 });

  const effectiveCurrentPlanId = subscription.isSubscribed ? (currentPlanId || subscription.planId) : null;

  // Flash sale countdown timer
  useEffect(() => {
    if (!showFlashSale) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showFlashSale]);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (onSelectPack) {
      onSelectPack(plan);
      return;
    }

    const isCurrentPlan = subscription.isSubscribed && effectiveCurrentPlanId === plan.id;
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
        const msg =
          result.error instanceof Error
            ? result.error.message
            : result.error != null
              ? String(result.error)
              : "Échec du checkout (voir console F12)";
        console.error("[PricingPacks] checkout failed:", { result, msg });
        const debugPayload = result.debug ?? {
          timestamp: new Date().toISOString(),
          step: "unknown",
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "?",
          hasSession: true,
          planId: plan.id,
          responseData: null,
          responseError: result.error,
          errorMessage: msg,
        };
        const copyDebug = () => {
          try {
            const text = result.debug ? formatDebugForClipboard(result.debug) : JSON.stringify(debugPayload, null, 2);
            navigator.clipboard.writeText(text);
            toast({ title: "Debug copié", description: "Colle dans la console ou envoie au support." });
          } catch (e) {
            toast({ title: "Erreur copie", description: String(e), variant: "destructive" });
          }
        };
        toast({
          title: "Checkout error",
          description: msg,
          variant: "destructive",
          action: (
            <ToastAction altText="Copier debug" onClick={copyDebug}>
              Copier debug
            </ToastAction>
          ),
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error("[PricingPacks] checkout threw:", error);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Flash Sale Timer Header */}
      {showFlashSale && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 border border-orange-500/20"
        >
          <div className="flex items-center gap-2 text-orange-500">
            <Tag className="h-5 w-5" />
            <span className="font-bold text-lg">LIMITED TIME FLASH SALE</span>
            <Tag className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ends in:</span>
            <div className="flex gap-1">
              <span className="bg-card border rounded px-2 py-1 font-mono font-bold">{formatTime(timeLeft.hours)}</span>
              <span className="font-bold">:</span>
              <span className="bg-card border rounded px-2 py-1 font-mono font-bold">{formatTime(timeLeft.minutes)}</span>
              <span className="font-bold">:</span>
              <span className="bg-card border rounded px-2 py-1 font-mono font-bold">{formatTime(timeLeft.seconds)}</span>
            </div>
          </div>
        </motion.div>
      )}

      <div className={cn(
        "grid gap-6",
        compact ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {PRICING_PLANS.map((plan, index) => {
          const Icon = getPlanIcon(plan.id);
          const isCurrentPlan = subscription.isSubscribed && effectiveCurrentPlanId === plan.id;
          const isPopular = plan.popular;
          const isLoading = loadingPlanId === plan.id;
          const flashSale = showFlashSale ? FLASH_SALE_DISCOUNTS[plan.id] : null;

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
              {/* Discount Badge */}
              {flashSale && (
                <div className="absolute -top-3 -right-3 z-10">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                    -{flashSale.discount}% OFF
                  </div>
                </div>
              )}

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
              {isCurrentPlan && !flashSale && (
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

              {/* Price with flash sale */}
              <div className="mb-6 text-center">
                {flashSale ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg text-muted-foreground line-through">${flashSale.originalPrice}</span>
                      <span className="text-4xl font-bold text-gradient">${plan.price}</span>
                    </div>
                    <span className="text-muted-foreground">{plan.priceUnit}</span>
                    <div className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-500 text-xs font-medium px-2 py-1 rounded-full">
                      <Tag className="h-3 w-3" />
                      Save ${flashSale.originalPrice - plan.price}/month
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gradient">${plan.price}</span>
                    <span className="text-muted-foreground">{plan.priceUnit}</span>
                  </div>
                )}
              </div>

              {/* 7-day free trial badge — boosts conversion */}
              {!subscription.isSubscribed && (
                <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs font-semibold text-green-600 dark:text-green-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  7-day free trial — cancel anytime
                </div>
              )}

            {/* Credits included badge */}
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                <Coins className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold text-primary">{plan.credits} credits</span>
                <span className="text-xs text-muted-foreground">included</span>
              </div>

              <div className="mb-2 text-center text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Image className="h-3 w-3" /> ≈ {plan.credits} images</span>
                <span className="mx-2">or</span>
                <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> ≈ {Math.floor(plan.credits / 4)} videos</span>
              </div>

            {/* Features */}
            <div className="mb-6 flex-1 space-y-3">
              {plan.features.filter(f => !f.includes('credit')).map((feature) => (
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

              {/* Nudge: Anchoring per-credit value */}
              <div className="mt-3">
                <AnchoringLabel planId={plan.id} credits={plan.credits} price={plan.price} />
              </div>

              {/* Nudge: Social proof popularity */}
              <PlanPopularityBadge planId={plan.id} />

              {/* Nudge: Live viewers */}
              <LiveViewersCount planId={plan.id} />
          </motion.div>
        );
      })}
      </div>
    </div>
  );
};

export default PricingPacks;
