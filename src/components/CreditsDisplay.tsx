import { useEffect, useState } from "react";
import { ChevronUp, Coins, Loader2, ShoppingCart, Sparkles } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CLIPMOTION_CREDIT_PACKS, getPlan, type ClipMotionCreditPack } from "@/lib/clipmotionEconomics";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreditsDisplayProps {
  compact?: boolean;
}

export const CreditsDisplay = ({ compact = false }: CreditsDisplayProps) => {
  const { balance, isLoading, refresh } = useCredits();
  const { startCheckout, isSubscribed, subscription } = useSubscription();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const plan = getPlan(subscription.planId);
  const planName = isSubscribed ? plan.name : "No Plan";
  const isStarterPlan = subscription.planId === "starter";
  const isLowCredits = balance > 0 && balance < 24;
  const isZeroCredits = balance === 0;

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("clipmotion:credits-changed", handler);
    return () => window.removeEventListener("clipmotion:credits-changed", handler);
  }, [refresh]);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const nextPlan = !isSubscribed ? "starter" : isStarterPlan ? "pro" : "business";
      const result = await startCheckout("subscription", { planId: nextPlan });
      if (!result.success) throw new Error(result.error instanceof Error ? result.error.message : "Checkout failed");
    } catch (error) {
      toast({
        title: "Upgrade error",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleBuyPack = async (pack: ClipMotionCreditPack) => {
    setLoadingPackId(pack.id);
    try {
      const result = await startCheckout("credits", { packId: pack.id });
      if (result.success) {
        setOpen(false);
      } else {
        throw new Error(result.error instanceof Error ? result.error.message : "Checkout failed");
      }
    } catch (error) {
      toast({
        title: "Credit purchase error",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPackId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {!compact && <span className="text-sm text-muted-foreground">Loading…</span>}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
            isZeroCredits
              ? "border-destructive/30 bg-destructive/10"
              : isLowCredits
                ? "border-orange-500/30 bg-orange-500/10"
                : "border-primary/20 bg-primary/10 hover:bg-primary/15",
          )}
        >
          <Coins className={cn("h-4 w-4", isZeroCredits ? "text-destructive" : isLowCredits ? "text-orange-500" : "text-primary")} />
          <span className="font-bold">{balance}</span>
          {!compact && <span className="text-xs text-muted-foreground">credits</span>}
          {!compact && <ChevronUp className="h-3 w-3 text-muted-foreground" />}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-4" align="end" side="top">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Current plan</p>
              <p className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> {planName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-bold">{balance}</p>
            </div>
          </div>

          {(isZeroCredits || isLowCredits) && (
            <div className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-xs",
              isZeroCredits ? "border-destructive/20 bg-destructive/10" : "border-orange-500/20 bg-orange-500/10",
            )}>
              <ShoppingCart className={cn("mt-0.5 h-4 w-4 shrink-0", isZeroCredits ? "text-destructive" : "text-orange-500")} />
              <p>
                {isZeroCredits
                  ? "You are out of generation credits."
                  : "You have less than the typical cost of a 5-second product-motion clip."}
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top up</p>
              <p className="text-[11px] text-muted-foreground">$0.10 / credit</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CLIPMOTION_CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleBuyPack(pack)}
                  disabled={loadingPackId === pack.id}
                  className="rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                >
                  {loadingPackId === pack.id ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <p className="font-bold">{pack.credits.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">credits</p>
                      <p className="mt-1 text-sm font-semibold text-primary">${pack.price}</p>
                    </>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              Generation cost is displayed before you run it. Duration and resolution can change the credit cost.
            </p>
          </div>

          {(!isSubscribed || subscription.planId !== "business") && (
            <Button onClick={handleUpgrade} disabled={upgradeLoading} variant="outline" className="w-full" size="sm">
              {upgradeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {!isSubscribed ? "Choose a plan" : `Upgrade to ${isStarterPlan ? "Pro" : "Business"}`}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreditsDisplay;
