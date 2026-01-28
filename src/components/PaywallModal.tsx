import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Lock, Sparkles, Video, Image as ImageIcon, Layers, FolderKanban, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { PRICING_PLANS, PLAN_QUALITY_ACCESS } from "@/lib/commercialProducts";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export type FeatureType = "video" | "clipmotion" | "campaigns" | "images" | "projects";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: FeatureType;
  requiredPlan?: "starter" | "pro" | "business";
}

const FEATURE_CONFIG: Record<FeatureType, {
  icon: typeof Lock;
  title: string;
  description: string;
  requiredPlan: "starter" | "pro" | "business";
}> = {
  video: {
    icon: Video,
    title: "Video Generation",
    description: "Create stunning AI videos for your social media",
    requiredPlan: "pro",
  },
  clipmotion: {
    icon: Zap,
    title: "ClipMotion",
    description: "Create viral social videos optimized for TikTok, Reels & Shorts",
    requiredPlan: "pro",
  },
  campaigns: {
    icon: Layers,
    title: "Campaigns",
    description: "Automated content generation campaigns",
    requiredPlan: "starter",
  },
  images: {
    icon: ImageIcon,
    title: "Image Generation",
    description: "Create AI-powered images for your content",
    requiredPlan: "starter",
  },
  projects: {
    icon: FolderKanban,
    title: "Projects",
    description: "Manage your content projects",
    requiredPlan: "starter",
  },
};

export const PaywallModal = ({ open, onOpenChange, feature, requiredPlan }: PaywallModalProps) => {
  const { startCheckout, subscription, isLoading } = useSubscription();
  
  const config = FEATURE_CONFIG[feature];
  const effectiveRequiredPlan = requiredPlan || config.requiredPlan;
  const Icon = config.icon;
  
  const targetPlan = PRICING_PLANS.find(p => p.id === effectiveRequiredPlan);
  
  const handleUpgrade = async () => {
    await startCheckout("subscription", { planId: effectiveRequiredPlan });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-primary/20">
        <VisuallyHidden>
          <DialogTitle>Subscription Required</DialogTitle>
          <DialogDescription>Upgrade your plan to access this feature</DialogDescription>
        </VisuallyHidden>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 text-center space-y-5"
        >
          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="border-primary/30 text-primary">
                {effectiveRequiredPlan.charAt(0).toUpperCase() + effectiveRequiredPlan.slice(1)} Plan Required
              </Badge>
            </div>
            <h2 className="text-xl font-bold">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          
          {/* Plan benefits */}
          {targetPlan && (
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{targetPlan.name}</span>
                <span className="text-lg font-bold text-primary">
                  {targetPlan.price}€<span className="text-xs font-normal text-muted-foreground">/mo</span>
                </span>
              </div>
              <ul className="space-y-1.5 text-sm">
                {targetPlan.features.slice(0, 4).map((feat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* CTA */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleUpgrade} 
              size="lg" 
              className="w-full gradient-primary gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Subscribe to {targetPlan?.name || effectiveRequiredPlan}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="w-full text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
          
          {/* Current plan indicator */}
          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Secure payment via Stripe. Cancel anytime.
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
