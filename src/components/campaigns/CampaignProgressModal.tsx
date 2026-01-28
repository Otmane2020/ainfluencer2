import { motion } from "framer-motion";
import { Wand2, Loader2, CheckCircle, Calendar, Image as ImageIcon, Video, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface CampaignProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  status: "creating" | "scheduling" | "completed" | "error";
  progress: number;
  stats?: {
    videos: number;
    images: number;
    total: number;
  };
  errorMessage?: string;
}

const statusMessages = {
  creating: "Creating your campaign...",
  scheduling: "Scheduling your posts...",
  completed: "Campaign ready!",
  error: "Something went wrong",
};

export const CampaignProgressModal = ({
  isOpen,
  onClose,
  campaignName,
  status,
  progress,
  stats,
  errorMessage,
}: CampaignProgressModalProps) => {
  const navigate = useNavigate();
  const isComplete = status === "completed";
  const isError = status === "error";

  const handleViewCalendar = () => {
    onClose();
    navigate("/calendar");
  };

  const handleViewCampaigns = () => {
    onClose();
    navigate("/campaigns");
  };

  return (
    <Dialog open={isOpen} onOpenChange={isComplete || isError ? onClose : undefined}>
      <DialogContent className="sm:max-w-md border-border bg-card" onPointerDownOutside={(e) => !isComplete && !isError && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display truncate">
              {isComplete ? "Campaign Created!" : campaignName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Animated visual */}
          <div className="relative flex justify-center">
            <motion.div
              animate={isComplete ? {} : { 
                scale: [1, 1.05, 1],
                rotate: [0, 3, -3, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: isComplete ? 0 : Infinity,
                ease: "easeInOut"
              }}
              className="relative"
            >
              <div className={`h-24 w-24 rounded-2xl flex items-center justify-center shadow-glow ${
                isError ? "bg-destructive/20" : "gradient-primary"
              }`}>
                {isComplete ? (
                  <CheckCircle className="h-12 w-12 text-primary-foreground" />
                ) : isError ? (
                  <AlertCircle className="h-12 w-12 text-destructive" />
                ) : (
                  <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
                )}
              </div>
              
              {/* Floating particles */}
              {!isComplete && !isError && (
                <>
                  <motion.div
                    animate={{ y: [-20, -40, -20], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                    className="absolute -top-2 left-2 h-2 w-2 rounded-full bg-primary"
                  />
                  <motion.div
                    animate={{ y: [-20, -50, -20], opacity: [0, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                    className="absolute -top-2 right-4 h-3 w-3 rounded-full bg-secondary"
                  />
                  <motion.div
                    animate={{ y: [-20, -35, -20], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
                    className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-accent"
                  />
                </>
              )}
            </motion.div>
          </div>

          {/* Status message */}
          <p className="text-center text-muted-foreground">
            {isError ? errorMessage || statusMessages.error : statusMessages[status]}
          </p>

          {/* Progress bar */}
          {!isComplete && !isError && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {status === "creating" ? "Creating campaign" : "Scheduling posts"}
                </span>
                <span className="font-medium text-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {/* Stats when complete */}
          {isComplete && stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                  <Video className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold">{stats.videos}</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold">{stats.images}</p>
                <p className="text-xs text-muted-foreground">Images</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                  <Calendar className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Posts</p>
              </div>
            </div>
          )}

          {/* Info message */}
          {!isComplete && !isError && (
            <div className="rounded-lg bg-primary/10 p-3 flex items-center justify-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <p className="text-sm text-primary">We'll notify you when your campaign is ready!
              </p>
            </div>
          )}

          {/* Actions */}
          {(isComplete || isError) && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleViewCampaigns}
              >
                View Campaigns
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleViewCalendar}
              >
                View Calendar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
