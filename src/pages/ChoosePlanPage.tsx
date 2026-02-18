import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, LogOut } from "lucide-react";
import { PricingPacks } from "@/components/PricingPacks";
import { CreditPacks } from "@/components/CreditPacks";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";

const ChoosePlanPage = () => {
  const navigate = useNavigate();
  const { isSubscribed, isLoading, checkSubscription } = useSubscription();
  const { user, signOut } = useAuth();

  // If already subscribed, go to dashboard
  useEffect(() => {
    if (!isLoading && isSubscribed) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isSubscribed, navigate]);

  // Poll subscription status every 5s (in case user completed checkout in another tab)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      checkSubscription();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // If not logged in, redirect to auth
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading || !user) return null;

  return (
    <>
      <SEOHead
        title="Choose Your Plan – ClipMotion"
        description="Select a subscription plan to unlock AI-powered content creation for your social media."
        canonical="/choose-plan"
      />
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
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

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl space-y-8"
          >
            {/* Hero */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Welcome to ClipMotion
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-bold">
                Choose Your Plan
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Pick a subscription to unlock AI Studio, campaigns, and automated posting.
                Then fuel your creations with credit packs.
              </p>
            </div>

            {/* Plans */}
            <PricingPacks showFlashSale={true} />

            {/* Credit Packs Section */}
            <div className="pt-8 border-t border-border">
              <CreditPacks />
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default ChoosePlanPage;
