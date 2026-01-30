import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { QUALITY_TIERS, QualityTier, ContentType, getCreditCost } from "@/lib/commercialProducts";
import { Coins } from "lucide-react";

interface QualitySelectorProps {
  contentType: ContentType;
  value: QualityTier;
  onChange: (quality: QualityTier) => void;
  compact?: boolean;
}

export const QualitySelector = ({
  contentType,
  value,
  onChange,
  compact = false,
}: QualitySelectorProps) => {
  const tiers = Object.values(QUALITY_TIERS);

  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3")}>
      {tiers.map((tier) => {
        const cost = getCreditCost(contentType, tier.id);
        const isSelected = value === tier.id;

        return (
          <motion.button
            key={tier.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(tier.id)}
            className={cn(
              "relative flex flex-col items-center p-3 rounded-xl border-2 transition-all",
              isSelected
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50 bg-card"
            )}
          >
            {/* Icon */}
            <span className="text-2xl mb-1">{tier.icon}</span>
            
            {/* Name */}
            <span className={cn(
              "font-semibold text-sm",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {tier.name}
            </span>
            
            {/* Cost */}
            <div className={cn(
              "flex items-center gap-1 mt-1 text-xs",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              <Coins className="h-3 w-3" />
              <span>{cost} cr/{contentType === "image" ? "img" : "vid"}</span>
            </div>

            {/* Description (non-compact) */}
            {!compact && (
              <span className="text-xs text-muted-foreground mt-1">
                {tier.description}
              </span>
            )}

            {/* Selected indicator */}
            {isSelected && (
              <motion.div
                layoutId={`quality-indicator-${contentType}`}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default QualitySelector;
