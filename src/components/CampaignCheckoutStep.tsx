import { motion } from "framer-motion";
import { Coins, Video, Image as ImageIcon, Calculator, Check, AlertCircle } from "lucide-react";
import { 
  QualityTier, 
  getCampaignCostBreakdown,
  QUALITY_TIERS 
} from "@/lib/commercialProducts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CampaignCheckoutStepProps {
  videosPerDay: number;
  imagesPerDay: number;
  videoQuality: QualityTier;
  imageQuality: QualityTier;
  campaignDays: number;
  campaignType: "video" | "image" | "mixed";
  currentBalance: number;
  onProceed: () => void;
  onBuyCredits: () => void;
  isSubmitting?: boolean;
}

export const CampaignCheckoutStep = ({
  videosPerDay,
  imagesPerDay,
  videoQuality,
  imageQuality,
  campaignDays,
  campaignType,
  currentBalance,
  onProceed,
  onBuyCredits,
  isSubmitting,
}: CampaignCheckoutStepProps) => {
  const breakdown = getCampaignCostBreakdown({
    videosPerDay: campaignType === "image" ? 0 : videosPerDay,
    imagesPerDay: campaignType === "video" ? 0 : imagesPerDay,
    videoQuality,
    imageQuality,
    campaignDays,
  });

  const hasEnoughCredits = currentBalance >= breakdown.totalCost;
  const creditsNeeded = breakdown.totalCost - currentBalance;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Campaign Cost Summary</h3>
      </div>

      {/* Cost Breakdown */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        {/* Videos */}
        {(campaignType === "video" || campaignType === "mixed") && breakdown.totalVideos > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5 bg-violet-500/10">
                <Video className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{breakdown.totalVideos} videos</p>
                <p className="text-xs text-muted-foreground">
                  {videosPerDay}/day × {campaignDays} days • {QUALITY_TIERS[videoQuality].name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold">{breakdown.videoCost}</span>
            </div>
          </div>
        )}

        {/* Images */}
        {(campaignType === "image" || campaignType === "mixed") && breakdown.totalImages > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5 bg-cyan-500/10">
                <ImageIcon className="h-4 w-4 text-cyan-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{breakdown.totalImages} images</p>
                <p className="text-xs text-muted-foreground">
                  {imagesPerDay}/day × {campaignDays} days • {QUALITY_TIERS[imageQuality].name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold">{breakdown.imageCost}</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="font-semibold">Total Cost</span>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-bold text-xl">{breakdown.totalCost}</span>
            <span className="text-sm text-muted-foreground">credits</span>
          </div>
        </div>
      </div>

      {/* Balance Status */}
      <div className={cn(
        "rounded-xl p-4 flex items-center justify-between",
        hasEnoughCredits 
          ? "bg-green-500/10 border border-green-500/30" 
          : "bg-amber-500/10 border border-amber-500/30"
      )}>
        <div className="flex items-center gap-3">
          {hasEnoughCredits ? (
            <div className="rounded-full p-2 bg-green-500/20">
              <Check className="h-5 w-5 text-green-600" />
            </div>
          ) : (
            <div className="rounded-full p-2 bg-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
          )}
          <div>
            <p className="font-medium">
              {hasEnoughCredits ? "Ready to launch!" : "Insufficient credits"}
            </p>
            <p className="text-sm text-muted-foreground">
              Your balance: <span className="font-semibold">{currentBalance}</span> credits
              {!hasEnoughCredits && (
                <span className="text-amber-600 ml-1">
                  (need +{creditsNeeded} more)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {hasEnoughCredits ? (
        <Button
          onClick={onProceed}
          disabled={isSubmitting}
          className="w-full gradient-primary text-lg py-6"
          size="lg"
        >
          <Coins className="h-5 w-5 mr-2" />
          Launch Campaign ({breakdown.totalCost} credits)
        </Button>
      ) : (
        <Button
          onClick={onBuyCredits}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg py-6"
          size="lg"
        >
          <Coins className="h-5 w-5 mr-2" />
          Buy Credits to Continue
        </Button>
      )}

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        Credits will be deducted as content is generated during the campaign
      </p>
    </motion.div>
  );
};

export default CampaignCheckoutStep;
