import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, AlertCircle, Sparkles, Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKS, CreditPack } from "@/lib/commercialProducts";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  currentBalance: number;
  onAdjustCampaign?: () => void;
}

export const InsufficientCreditsModal = ({
  isOpen,
  onClose,
  requiredCredits,
  currentBalance,
  onAdjustCampaign,
}: InsufficientCreditsModalProps) => {
  const { startCheckout } = useSubscription();
  const { toast } = useToast();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const creditsNeeded = requiredCredits - currentBalance;

  // Find recommended pack (first one that covers the deficit)
  const recommendedPack = CREDIT_PACKS.find(pack => pack.credits >= creditsNeeded);

  const handleBuyPack = async (pack: CreditPack) => {
    setLoadingPackId(pack.id);
    try {
      const result = await startCheckout("credits", { packId: pack.id });
      if (result.success) {
        onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            Insufficient Credits
          </DialogTitle>
          <DialogDescription>
            You need more credits to launch this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance Summary */}
          <div className="rounded-xl bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Required credits:</span>
              <span className="font-bold text-lg">{requiredCredits}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your balance:</span>
              <span className="font-semibold text-primary">{currentBalance}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-muted-foreground">You need:</span>
              <span className="font-bold text-amber-600 text-lg">+{creditsNeeded} credits</span>
            </div>
          </div>

          {/* Recommended Pack */}
          {recommendedPack && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="absolute -top-2 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                Recommended
              </div>
              <button
                onClick={() => handleBuyPack(recommendedPack)}
                disabled={loadingPackId === recommendedPack.id}
                className={cn(
                  "w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all",
                  loadingPackId === recommendedPack.id && "opacity-75 pointer-events-none"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2 bg-primary text-primary-foreground">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg">{recommendedPack.credits} Credits</p>
                      {recommendedPack.bonus > 0 && (
                        <p className="text-xs text-primary">+{recommendedPack.bonus}% bonus</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl">${recommendedPack.price}</span>
                    {loadingPackId === recommendedPack.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* Other Packs */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Other options:</p>
            <div className="grid grid-cols-2 gap-2">
              {CREDIT_PACKS.filter(p => p.id !== recommendedPack?.id).slice(0, 4).map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleBuyPack(pack)}
                  disabled={loadingPackId === pack.id}
                  className={cn(
                    "p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-all",
                    pack.credits < creditsNeeded && "opacity-50",
                    loadingPackId === pack.id && "opacity-75 pointer-events-none"
                  )}
                >
                  <div className="text-center">
                    <p className="font-bold">{pack.credits}</p>
                    <p className="text-xs text-muted-foreground">credits</p>
                    <p className="text-sm font-semibold mt-1">${pack.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Adjust Campaign Option */}
          {onAdjustCampaign && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                className="w-full"
                onClick={onAdjustCampaign}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Adjust campaign to fit my budget
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsufficientCreditsModal;
