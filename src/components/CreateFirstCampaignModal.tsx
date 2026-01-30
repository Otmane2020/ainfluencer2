import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Rocket, Calendar, Sparkles, ArrowRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CreateFirstCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export const CreateFirstCampaignModal = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}: CreateFirstCampaignModalProps) => {
  const navigate = useNavigate();

  const handleCreateCampaign = () => {
    onClose();
    navigate(`/campaigns?project=${projectId}`);
  };

  const handleSkip = () => {
    onClose();
    navigate(`/projects/${projectId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 pb-12">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center"
          >
            <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
              <Rocket className="h-10 w-10 text-white" />
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-6 -mt-6 relative">
          <div className="bg-card rounded-xl border shadow-lg p-6 space-y-4">
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="text-xl font-bold">
                Project Created! 🎉
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{projectName}</span> is ready. 
                Create your first campaign to start generating content automatically.
              </p>
            </DialogHeader>

            {/* Benefits */}
            <div className="space-y-3 py-2">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Automated Scheduling</p>
                  <p className="text-xs text-muted-foreground">
                    Set it and forget it - content published on autopilot
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">AI-Powered Content</p>
                  <p className="text-xs text-muted-foreground">
                    Videos and images generated from your brand context
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={handleCreateCampaign}
                className="w-full gap-2"
                size="lg"
              >
                Create First Campaign
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="w-full text-muted-foreground"
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
