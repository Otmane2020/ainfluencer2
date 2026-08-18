import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { LogOut, Sparkles } from "lucide-react";
import { PricingPacks } from "@/components/PricingPacks";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";

const ChoosePlanPage = () => {
  const navigate = useNavigate();
  const { isSubscribed, isLoading } = useSubscription();
  const { user, signOut, isLoading: isAuthLoading } = useAuth();
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setForceShow(true), 5000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isLoading && isSubscribed) navigate("/dashboard", { replace: true });
  }, [isLoading, isSubscribed, navigate]);

  useEffect(() => {
    if (!isAuthLoading && !user) navigate("/auth", { replace: true });
  }, [user, isAuthLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!forceShow && (isAuthLoading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse overflow-hidden rounded-xl">
            <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your plans…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Choose Your Plan – ClipMotion"
        description="Choose monthly ClipMotion generation credits for product visuals, motion clips and AI voiceovers."
        canonical="/choose-plan"
      />
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-display text-xl font-bold text-gradient">ClipMotion</span>
              <p className="text-[11px] text-muted-foreground">Product Motion Studio</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-6xl space-y-9"
          >
            <div className="mx-auto max-w-2xl space-y-3 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" /> Start creating
              </div>
              <h1 className="font-display text-4xl font-bold md:text-5xl">Choose your monthly creative volume</h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Every plan includes credits for product motion, product visuals and Deepgram Aura-2 voiceovers. The exact credit cost is shown before every generation.
              </p>
            </div>

            <PricingPacks showFlashSale={false} />
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default ChoosePlanPage;
