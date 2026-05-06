import { useState } from "react";
import { Coins, ChevronUp, Loader2, Sparkles, ShoppingCart } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CREDIT_PACKS, CreditPack } from "@/lib/commercialProducts";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreditsDisplayProps {
  compact?: boolean;
}

export const CreditsDisplay = ({ compact = false }: CreditsDisplayProps) => {
  const { balance, currentPlan, isLoading } = useCredits();
  const { startCheckout, isSubscribed, subscription } = useSubscription();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const planName = isSubscribed ? (currentPlan?.name || "Starter") : "No Plan";
  const isStarterPlan = !isSubscribed || subscription.planId === "starter";
  const isLowCredits = balance <= 5;
  const isZeroCredits = balance === 0;

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const nextPlan = !isSubscribed || isStarterPlan ? "pro" : "business";
      await startCheckout("subscription", { planId: nextPlan });
    } catch (error) {
      console.error("Upgrade error:", error);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleBuyPack = async (pack: CreditPack) => {
    setLoadingPackId(pack.id);
    try {
      const result = await startCheckout("credits", { packId: pack.id });
      if (result.success) {
        setOpen(false);
      } else {
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
      setLoadingPackId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {!compact && <span className="text-sm text-muted-foreground">Loading...</span>}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all border group",
          isZeroCredits
            ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
            : isLowCredits
            ? "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20"
            : "bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-primary/20"
        )}>
          <div className="flex items-center gap-1.5">
            <Coins className={cn("h-4 w-4", isZeroCredits ? "text-destructive" : isLowCredits ? "text-orange-500" : "text-primary")} />
            <span className="font-bold text-foreground">{balance}</span>
          </div>
          {!compact && (
            <>
              <span className="text-xs text-muted-foreground">credits</span>
              <ChevronUp className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-popover z-50" align="end" side="top">
        <div className="space-y-4">
          {/* Current Plan */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                {planName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Credits</p>
              <p className={cn("font-bold text-lg", isZeroCredits ? "text-destructive" : isLowCredits ? "text-orange-500" : "")}>{balance}</p>
            </div>
          </div>

          {/* Zero credits alert */}
          {isZeroCredits && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <ShoppingCart className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs font-medium text-destructive">You're out of credits! Buy more below.</p>
            </div>
          )}

          {/* Buy Credits Section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Buy Credits · $1 = 1 credit</p>
            <div className="grid grid-cols-2 gap-2">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleBuyPack(pack)}
                  disabled={loadingPackId === pack.id}
                  className={cn(
                    "p-3 rounded-lg border-2 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-center",
                    loadingPackId === pack.id && "opacity-75 pointer-events-none",
                    pack.id === "pack-50" ? "border-primary/30 shadow-sm" : "border-border"
                  )}
                >
                  {loadingPackId === pack.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <>
                      <p className="font-bold text-lg">{pack.credits}</p>
                      <p className="text-[11px] text-muted-foreground">credits</p>
                      <p className="text-sm font-semibold text-primary mt-1">${pack.price}</p>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Upgrade Button */}
          {(!isSubscribed || subscription.planId !== "business") && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-popover px-2 text-muted-foreground">or upgrade plan</span>
                </div>
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={upgradeLoading}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {upgradeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {!isSubscribed ? "Subscribe Now" : `Upgrade to ${isStarterPlan ? "Pro" : "Business"}`}
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreditsDisplay;
