import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles, Zap, Video, Image as ImageIcon, Layers, FolderKanban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { PRICING_PLANS, PLAN_QUALITY_ACCESS } from "@/lib/commercialProducts";

export type FeatureType = "video" | "clipmotion" | "campaigns" | "images" | "projects";

interface PaywallGuardProps {
  feature: FeatureType;
  children: ReactNode;
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

export const PaywallGuard = ({ feature, children, requiredPlan }: PaywallGuardProps) => {
  const { subscription, isLoading, startCheckout, currentPlan } = useSubscription();
  const { credits, isLoading: creditsLoading } = useCredits();

  const config = FEATURE_CONFIG[feature];
  const effectiveRequiredPlan = requiredPlan || config.requiredPlan;

  const freeCredits = credits?.balance ?? 0;

  // Determine if user has access
  const hasAccess = (): boolean => {
    // Free users keep access while they still have welcome credits left
    if (!subscription.isSubscribed) {
      return freeCredits > 0;
    }
    
    // Check plan hierarchy
    const planHierarchy = ["starter", "pro", "business"];
    const userPlanIndex = planHierarchy.indexOf(subscription.planId);
    const requiredPlanIndex = planHierarchy.indexOf(effectiveRequiredPlan);
    
    // User's plan must be >= required plan
    return userPlanIndex >= requiredPlanIndex;
  };

  if (isLoading || creditsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (hasAccess()) {
    return <>{children}</>;
  }

  return <PaywallUpgrade feature={feature} requiredPlan={effectiveRequiredPlan} />;
};

interface PaywallUpgradeProps {
  feature: FeatureType;
  requiredPlan: "starter" | "pro" | "business";
}

export const PaywallUpgrade = ({ feature, requiredPlan }: PaywallUpgradeProps) => {
  const { startCheckout, subscription, isLoading } = useSubscription();
  const config = FEATURE_CONFIG[feature];
  const Icon = config.icon;
  
  const targetPlan = PRICING_PLANS.find(p => p.id === requiredPlan);
  const planAccess = PLAN_QUALITY_ACCESS[requiredPlan];
  
  const handleUpgrade = async () => {
    await startCheckout("subscription", { planId: requiredPlan });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[400px] p-4"
    >
      <Card className="max-w-lg w-full border-primary/20 bg-gradient-to-b from-card to-muted/30">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="border-primary/30 text-primary">
                {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} Plan Required
              </Badge>
            </div>
            <h2 className="text-2xl font-bold">{config.title}</h2>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          
          {/* Plan benefits */}
          {targetPlan && (
            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{targetPlan.name}</span>
                <span className="text-xl font-bold text-primary">
                  {targetPlan.price}€<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </span>
              </div>
              <ul className="space-y-2 text-sm">
                {targetPlan.features.slice(0, 4).map((feat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* CTA */}
          <div className="space-y-3">
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
              Upgrade to {targetPlan?.name || requiredPlan}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Cancel anytime. Secure payment via Stripe.
            </p>
          </div>
          
          {/* Current plan indicator */}
          {subscription.planId && (
            <p className="text-xs text-muted-foreground border-t border-border pt-4">
              Current plan: <span className="font-medium">{subscription.planId === "starter" && !subscription.isSubscribed ? "None" : subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1)}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PaywallGuard;
