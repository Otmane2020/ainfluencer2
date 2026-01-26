import { motion, AnimatePresence } from "framer-motion";
import { Video, Sparkles, Loader2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface GeneratingTask {
  id: string;
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  model: string;
  duration: number;
}

interface GenerationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: GeneratingTask[];
  productName: string;
}

const encouragingMessages = [
  "Creating your viral video... ✨",
  "AI magic in progress... 🎬",
  "Making something amazing... 🚀",
  "Almost there, stay tuned... 🎥",
  "Your content is being crafted... 💫",
];

export const GenerationProgressModal = ({
  isOpen,
  onClose,
  tasks,
  productName,
}: GenerationProgressModalProps) => {
  const navigate = useNavigate();
  
  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "failed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const failedTasks = tasks.filter(t => t.status === "failed");
  
  const overallProgress = tasks.length > 0
    ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length)
    : 0;

  const getMessage = () => {
    if (completedTasks.length === tasks.length && tasks.length > 0) {
      return "All videos generated! 🎉";
    }
    if (failedTasks.length > 0) {
      return `${failedTasks.length} error(s) occurred`;
    }
    return encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
  };

  const handleGoToHistory = () => {
    onClose();
    navigate("/history/videos");
  };

  const allDone = activeTasks.length === 0 && tasks.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Video className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display">
              {allDone ? "Generation Complete!" : `Creating ${productName}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Animated visual */}
          <div className="relative flex justify-center">
            <motion.div
              animate={allDone ? {} : { 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: allDone ? 0 : Infinity,
                ease: "easeInOut"
              }}
              className="relative"
            >
              <div className="h-24 w-24 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                {allDone ? (
                  <Sparkles className="h-12 w-12 text-primary-foreground" />
                ) : (
                  <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
                )}
              </div>
              
              {/* Floating particles */}
              {!allDone && (
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

          {/* Message */}
          <p className="text-center text-muted-foreground">
            {getMessage()}
          </p>

          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall progress</span>
              <span className="font-medium text-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {/* Task list */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
              >
                <div className="shrink-0">
                  {task.status === "completed" ? (
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  ) : task.status === "failed" ? (
                    <div className="h-6 w-6 rounded-full bg-destructive/20 flex items-center justify-center">
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </div>
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Segment {index + 1} • {task.duration}s
                  </p>
                <p className="text-xs text-muted-foreground">
                    {task.status === "completed" ? "Ready" : 
                     task.status === "failed" ? "Error" :
                     task.status === "queued" ? `In queue... ${task.progress}%` : 
                     `Generating... ${task.progress}%`}
                  </p>
                </div>
                <div className="text-sm font-medium text-primary">
                  {task.progress}%
                </div>
              </motion.div>
            ))}
          </div>

          {/* Info message */}
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-sm text-primary">
              💡 You can close this and continue working. Your videos will appear in the history when ready!
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Continue Working
            </Button>
            <Button
              variant="gradient"
              className="flex-1 gap-2"
              onClick={handleGoToHistory}
            >
              <ExternalLink className="h-4 w-4" />
              View History
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
