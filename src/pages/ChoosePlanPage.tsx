import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, LogOut } from "lucide-react";
import { PricingPacks } from "@/components/PricingPacks";
import { SocialProofToast } from "@/components/nudges/SocialProofToast";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";

const ChoosePlanPage = () => {
  const navigate = useNavigate();
  const { isSubscribed, isLoading, checkSubscription } = useSubscription();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && isSubscribed) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isSubscribed, navigate]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      checkSubscription();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading || !user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl overflow-hidden animate-pulse">
          <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your plan…</p>
      </div>
    </div>
  );

  return (
    <>
      <SEOHead
        title="Choose Your Plan – ClipMotion"
        description="Select a subscription plan to unlock AI-powered content creation for your social media."
        canonical="/choose-plan"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">ClipMotion</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Welcome to ClipMotion
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-bold">
                Choose Your Plan
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Each plan includes credits for AI generation. 1 credit = $0.65 · 1 image = 1 credit · 1 video = 4 credits.
              </p>
            </div>

            <PricingPacks showFlashSale={true} />
          </motion.div>
        </main>

        {/* Social proof toast notifications */}
        <SocialProofToast initialDelay={4000} interval={12000} />
      </div>
    </>
  );
};

export default ChoosePlanPage;
