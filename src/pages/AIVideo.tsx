import { AIVideoGenerator } from "@/components/AIVideoGenerator";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useCredits } from "@/hooks/useCredits";
import { useState } from "react";

const AIVideo = () => {
  const [showPaywall, setShowPaywall] = useState(false);
  const { isSubscribed } = useSubscription();
  const { balance } = useCredits();

  const handleBeforeGenerate = (): boolean => {
    // Check subscription first, then credits
    if (!isSubscribed) {
      setShowPaywall(true);
      return false;
    }
    // Credits are checked in the generator component
    return true;
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">AI Video</h1>
          <p className="text-muted-foreground">
            Generate videos with multiple AI models
          </p>
        </div>

        <AIVideoGenerator onBeforeGenerate={handleBeforeGenerate} />
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="video"
        requiredPlan="starter"
      />
    </>
  );
};

export default AIVideo;
