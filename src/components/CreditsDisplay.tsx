import { useState } from "react";
import { Coins, ChevronUp, Loader2, Sparkles, CreditCard } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreditPacks } from "@/components/CreditPacks";
import { PRICING_PLANS } from "@/lib/commercialProducts";
import { useSubscription } from "@/hooks/useSubscription";

interface CreditsDisplayProps {
  compact?: boolean;
}

export const CreditsDisplay = ({ compact = false }: CreditsDisplayProps) => {
  const { balance, currentPlan, isLoading } = useCredits();
  const { startCheckout } = useSubscription();
  const [open, setOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const planName = currentPlan?.name || "Starter";
  const isStarterPlan = currentPlan?.id === "starter";

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      // Get the next plan (Pro if on Starter)
      const nextPlan = isStarterPlan ? "pro" : "business";
      await startCheckout("subscription", { planId: nextPlan });
    } catch (error) {
      console.error("Upgrade error:", error);
    } finally {
      setUpgradeLoading(false);
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
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all border border-primary/20 group">
          <div className="flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-primary" />
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
      <PopoverContent className="w-80 p-4" align="end" side="top">
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
              <p className="font-bold text-lg">{balance}</p>
            </div>
          </div>

          {/* Upgrade Button (if not on Business) */}
          {currentPlan?.id !== "business" && (
            <Button
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="w-full gradient-primary"
              size="sm"
            >
              {upgradeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Upgrade to {isStarterPlan ? "Pro" : "Business"}
            </Button>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-popover px-2 text-muted-foreground">or buy credits</span>
            </div>
          </div>

          {/* Credit Packs */}
          <CreditPacks compact onSelectPack={() => setOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreditsDisplay;
