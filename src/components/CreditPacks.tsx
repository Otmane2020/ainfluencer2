import { motion } from "framer-motion";
import { Coins, Gift, Sparkles, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CREDIT_PACKS, CreditPack } from "@/lib/commercialProducts";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";

interface CreditPacksProps {
  onCheckoutStarted?: () => void;
  compact?: boolean;
}

export const CreditPacks = ({ onCheckoutStarted, compact = false }: CreditPacksProps) => {
  const { toast } = useToast();
  const { startCheckout } = useSubscription();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const handleSelect = async (pack: CreditPack) => {
    setLoadingPackId(pack.id);
    try {
      const result = await startCheckout("credits", { packId: pack.id });
      if (result.success) {
        // Close popover after checkout starts
        onCheckoutStarted?.();
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
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="font-display text-xl font-bold mb-2 flex items-center justify-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Buy Credits
        </h3>
        <p className="text-sm text-muted-foreground">
          1 credit = $1 · Recharge anytime · No commitment
        </p>
      </div>

      <div className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
      )}>
        {CREDIT_PACKS.map((pack, index) => {
          const isPopular = pack.id === "pack-250";
          const isBestValue = pack.id === "pack-1000";
          const isLoading = loadingPackId === pack.id;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative flex flex-col rounded-xl border-2 bg-card p-4 transition-all cursor-pointer hover:shadow-lg",
                isPopular
                  ? "border-primary shadow-md shadow-primary/10"
                  : isBestValue
                  ? "border-accent shadow-md shadow-accent/10"
                  : "border-border hover:border-primary/50",
                isLoading && "opacity-75 pointer-events-none"
              )}
              onClick={() => !isLoading && handleSelect(pack)}
            >
              {/* Badge */}
              {isPopular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-white">
                  POPULAR
                </div>
              )}
              {isBestValue && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  BEST VALUE
                </div>
              )}

              {/* Content */}
              <div className="text-center">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gradient mb-1">
                      {pack.credits}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">credits</div>
                  </>
                )}
                
                {pack.bonus > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent mb-2">
                    <Sparkles className="h-3 w-3" />
                    +{pack.bonus}% bonus
                  </div>
                )}

                <div className="text-lg font-bold">
                  ${pack.price}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Instant delivery
        </span>
        <span>•</span>
        <span>Secure payment via Stripe</span>
      </div>
    </div>
  );
};

export default CreditPacks;
