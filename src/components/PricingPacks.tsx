import { motion } from "framer-motion";
import { Check, Crown, Zap, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PRICING_PACKS, PricingPack } from "@/lib/commercialProducts";

interface PricingPacksProps {
  onSelectPack?: (pack: PricingPack) => void;
  currentPackId?: string;
  compact?: boolean;
}

const getPackIcon = (packId: string) => {
  switch (packId) {
    case "starter":
      return Sparkles;
    case "pro":
      return Zap;
    case "agency":
      return Building2;
    default:
      return Crown;
  }
};

const getPackGradient = (packId: string) => {
  switch (packId) {
    case "starter":
      return "from-blue-500 to-cyan-500";
    case "pro":
      return "from-primary to-secondary";
    case "agency":
      return "from-purple-500 to-pink-500";
    default:
      return "from-gray-500 to-gray-600";
  }
};

export const PricingPacks = ({
  onSelectPack,
  currentPackId,
  compact = false,
}: PricingPacksProps) => {
  return (
    <div className={cn(
      "grid gap-6",
      compact ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 lg:grid-cols-3"
    )}>
      {PRICING_PACKS.map((pack, index) => {
        const Icon = getPackIcon(pack.id);
        const isCurrentPack = currentPackId === pack.id;
        const isPopular = pack.popular;

        return (
          <motion.div
            key={pack.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative flex flex-col rounded-2xl border-2 bg-card p-6 transition-all",
              isPopular
                ? "border-primary shadow-xl shadow-primary/20"
                : "border-border hover:border-primary/50",
              isCurrentPack && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {/* Badge */}
            {pack.badge && (
              <div className={cn(
                "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white shadow-lg",
                `bg-gradient-to-r ${getPackGradient(pack.id)}`
              )}>
                {pack.badge}
              </div>
            )}

            {/* Current pack indicator */}
            {isCurrentPack && (
              <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-lg">
                CURRENT
              </div>
            )}

            {/* Header */}
            <div className="mb-6 text-center">
              <div className={cn(
                "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
                `bg-gradient-to-br ${getPackGradient(pack.id)}`
              )}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-1 font-display text-2xl font-bold">{pack.name}</h3>
              <p className="text-sm text-muted-foreground">{pack.description}</p>
            </div>

            {/* Price */}
            <div className="mb-6 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gradient">${pack.price}</span>
                <span className="text-muted-foreground">{pack.priceUnit}</span>
              </div>
            </div>

            {/* Included content summary */}
            <div className="mb-6 rounded-xl bg-muted/50 p-4">
              <h4 className="mb-3 text-sm font-semibold">Included:</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-primary">
                    {pack.included.images === -1 ? "∞" : pack.included.images}
                  </div>
                  <div className="text-xs text-muted-foreground">Images</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-secondary">
                    {pack.included.videos === -1 ? "∞" : pack.included.videos}
                  </div>
                  <div className="text-xs text-muted-foreground">Videos</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-accent">
                    {pack.included.influencerVideos === -1 ? "∞" : pack.included.influencerVideos}
                  </div>
                  <div className="text-xs text-muted-foreground">Influencer</div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6 flex-1 space-y-3">
              {pack.features.map((feature) => (
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
              onClick={() => onSelectPack?.(pack)}
              disabled={isCurrentPack}
              className={cn(
                "w-full",
                isPopular && "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              )}
              variant={isPopular ? "default" : "outline"}
              size="lg"
            >
              {isCurrentPack ? "Current Plan" : isPopular ? "Choose Pro" : `Choose ${pack.name}`}
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PricingPacks;
