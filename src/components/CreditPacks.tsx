import { motion } from "framer-motion";
import { Coins, Gift, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKS, CreditPack } from "@/lib/commercialProducts";
import { useToast } from "@/hooks/use-toast";

interface CreditPacksProps {
  onSelectPack?: (pack: CreditPack) => void;
  compact?: boolean;
}

export const CreditPacks = ({ onSelectPack, compact = false }: CreditPacksProps) => {
  const { toast } = useToast();

  const handleSelect = (pack: CreditPack) => {
    if (onSelectPack) {
      onSelectPack(pack);
    } else {
      // Default: show coming soon
      toast({
        title: "Coming Soon",
        description: "Credit purchases will be available soon via Stripe.",
      });
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
          1 credit = 1€ · Recharge anytime · No commitment
        </p>
      </div>

      <div className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
      )}>
        {CREDIT_PACKS.map((pack, index) => {
          const isPopular = pack.id === "pack-250";
          const isBestValue = pack.id === "pack-1000";

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
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handleSelect(pack)}
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
                <div className="text-2xl font-bold text-gradient mb-1">
                  {pack.credits}
                </div>
                <div className="text-xs text-muted-foreground mb-2">credits</div>
                
                {pack.bonus > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent mb-2">
                    <Sparkles className="h-3 w-3" />
                    +{pack.bonus}% bonus
                  </div>
                )}

                <div className="text-lg font-bold">
                  {pack.price}€
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
