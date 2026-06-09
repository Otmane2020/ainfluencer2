import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
}

export const TrialEndedModal = ({ open }: Props) => {
  const { redirectToCheckout } = useSubscription();
  const navigate = useNavigate();

  const handleUpgrade = async (planId: string) => {
    const res = await redirectToCheckout(planId);
    if (!res.success) {
      navigate("/choose-plan");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-2">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center font-display text-2xl">
            Your free month has ended
          </DialogTitle>
          <DialogDescription className="text-center">
            Loved your 30 days of unlimited AI generation? Upgrade now to keep creating without interruption.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {[
            "Unlimited AI image & video generation",
            "Auto-post to all your social channels",
            "Priority generation queue",
            "Cancel anytime",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <Button onClick={() => handleUpgrade("pro")} className="gradient-primary w-full" size="lg">
            <Zap className="mr-2 h-4 w-4" /> Upgrade to Pro
          </Button>
          <Button onClick={() => handleUpgrade("starter")} variant="outline" className="w-full">
            See all plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
