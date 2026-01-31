import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Sparkles, Loader2, X, ExternalLink, Clock, CheckCircle2, Play, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
interface GeneratingTask {
  id: string;
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  model: string;
  duration: number;
  videoUrl?: string;
  submitTime?: number;
}
interface GenerationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: GeneratingTask[];
  productName: string;
}

// Messages that cycle during generation
const encouragingMessages = [{
  text: "Creating your viral video...",
  emoji: "✨"
}, {
  text: "AI is working its magic...",
  emoji: "🎬"
}, {
  text: "Rendering stunning visuals...",
  emoji: "🚀"
}, {
  text: "Almost there, stay tuned...",
  emoji: "🎥"
}, {
  text: "Your content is being crafted...",
  emoji: "💫"
}, {
  text: "Bringing your vision to life...",
  emoji: "🌟"
}];

// Format elapsed time as mm:ss
const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
export const GenerationProgressModal = ({
  isOpen,
  onClose,
  tasks,
  productName
}: GenerationProgressModalProps) => {
  const navigate = useNavigate();
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "failed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const failedTasks = tasks.filter(t => t.status === "failed");

  // Get real progress from tasks
  const realProgress = tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length) : 0;

  // Track elapsed time
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      startTimeRef.current = Date.now();
      return;
    }
    const allDone = activeTasks.length === 0 && tasks.length > 0;
    if (allDone) return;

    // Update elapsed time every second
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, activeTasks.length, tasks.length]);

  // Simulated progress - REDUCED update frequency to avoid performance issues
  useEffect(() => {
    if (!isOpen) {
      setSimulatedProgress(0);
      return;
    }
    const allDone = activeTasks.length === 0 && tasks.length > 0;
    if (allDone) {
      setSimulatedProgress(100);
      return;
    }

    // Update every 2 seconds instead of 500ms to reduce renders
    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        if (realProgress > prev) {
          return Math.min(prev + 3, realProgress);
        }

        // Slow advancement based on elapsed time
        const elapsed = elapsedSeconds;

        // Progress curve: fast start, slow finish
        let increment = 0.8;
        if (prev < 30) {
          increment = 1.5;
        } else if (prev < 60) {
          increment = 1.0;
        } else if (prev < 80) {
          increment = 0.5;
        } else {
          increment = 0.2;
        }

        // Cap at 95% until real completion
        const maxSimulated = Math.min(95, realProgress + 20);
        return Math.min(prev + increment, maxSimulated);
      });
    }, 2000); // 2 seconds instead of 500ms

    return () => clearInterval(interval);
  }, [isOpen, activeTasks.length, tasks.length, realProgress, elapsedSeconds]);

  // Cycle through encouraging messages
  useEffect(() => {
    if (!isOpen || activeTasks.length === 0) return;
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % encouragingMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, activeTasks.length]);

  // Show video preview when completed
  useEffect(() => {
    const allDone = activeTasks.length === 0 && tasks.length > 0 && completedTasks.length > 0;
    if (allDone && completedTasks.some(t => t.videoUrl)) {
      setTimeout(() => setShowVideoPreview(true), 500);
    } else {
      setShowVideoPreview(false);
    }
  }, [activeTasks.length, tasks.length, completedTasks]);
  const getMessage = () => {
    if (completedTasks.length === tasks.length && tasks.length > 0) {
      return {
        text: "All videos generated!",
        emoji: "🎉"
      };
    }
    if (failedTasks.length > 0 && activeTasks.length === 0) {
      return {
        text: `${failedTasks.length} error(s) occurred`,
        emoji: "⚠️"
      };
    }
    return encouragingMessages[messageIndex];
  };
  const handleGoToHistory = () => {
    onClose();
    navigate("/history/videos");
  };
  const allDone = activeTasks.length === 0 && tasks.length > 0;
  const displayProgress = Math.round(simulatedProgress);

  // Get first completed video URL for preview
  const previewVideoUrl = completedTasks.find(t => t.videoUrl)?.videoUrl;
  return <Dialog open={isOpen} onOpenChange={onClose}>
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
          {/* Video Preview (shown when complete) */}
          <AnimatePresence>
            {showVideoPreview && previewVideoUrl && <motion.div initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} exit={{
            opacity: 0,
            scale: 0.9
          }} className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} src={previewVideoUrl} className="w-full h-full object-contain" controls autoPlay muted loop playsInline />
                <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </div>
              </motion.div>}
          </AnimatePresence>

          {/* Animated visual (hidden when video preview is shown) */}
          {!showVideoPreview && <div className="relative flex justify-center">
              <motion.div animate={allDone ? {} : {
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }} transition={{
            duration: 2,
            repeat: allDone ? 0 : Infinity,
            ease: "easeInOut"
          }} className="relative">
                <div className="h-24 w-24 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                  {allDone ? <Sparkles className="h-12 w-12 text-primary-foreground" /> : <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />}
                </div>
                
                {/* Floating particles */}
                {!allDone && <>
                    <motion.div animate={{
                y: [-20, -40, -20],
                opacity: [0, 1, 0]
              }} transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0
              }} className="absolute -top-2 left-2 h-2 w-2 rounded-full bg-primary" />
                    <motion.div animate={{
                y: [-20, -50, -20],
                opacity: [0, 1, 0]
              }} transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: 0.5
              }} className="absolute -top-2 right-4 h-3 w-3 rounded-full bg-secondary" />
                    <motion.div animate={{
                y: [-20, -35, -20],
                opacity: [0, 1, 0]
              }} transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: 1
              }} className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-accent" />
                  </>}
              </motion.div>
            </div>}

          {/* Message with animation */}
          <AnimatePresence mode="wait">
            <motion.p key={messageIndex} initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} transition={{
            duration: 0.3
          }} className="text-center text-muted-foreground text-lg">
              {getMessage().text} {getMessage().emoji}
            </motion.p>
          </AnimatePresence>

          {/* Time info - elapsed + estimated */}
          {!allDone && <div className="flex items-center justify-center gap-4 text-sm">
              {/* Elapsed time */}
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Timer className="h-4 w-4 text-primary" />
                <span>{formatElapsedTime(elapsedSeconds)}</span>
              </div>
              
              <span className="text-muted-foreground">•</span>
              
              {/* Estimated time */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>~2–4 min</span>
              </div>
            </div>}

          {/* Overall progress with smooth animation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall progress</span>
              
            </div>
            <div className="relative">
              <Progress value={displayProgress} className="h-3" />
              {/* Animated shimmer effect on progress bar */}
              {!allDone && displayProgress < 100 && <motion.div className="absolute inset-0 h-3 overflow-hidden rounded-full pointer-events-none" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }}>
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{
                x: ["-100%", "200%"]
              }} transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
              }} style={{
                width: "50%"
              }} />
                </motion.div>}
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {tasks.map((task, index) => <motion.div key={task.id} initial={{
            opacity: 0,
            x: -10
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: index * 0.1
          }} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="shrink-0">
                  {task.status === "completed" ? <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div> : task.status === "failed" ? <div className="h-6 w-6 rounded-full bg-destructive/20 flex items-center justify-center">
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </div> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Segment {index + 1} • {task.duration}s
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.status === "completed" ? "Ready to view" : task.status === "failed" ? "Error occurred" : task.status === "queued" ? "Waiting in queue..." : "Generating..."}
                  </p>
                </div>
                {task.status === "completed" && task.videoUrl && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(task.videoUrl, "_blank")}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>}
              </motion.div>)}
          </div>

          {/* Info message */}
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-sm text-primary">
              {allDone ? "🎉 Your video is ready! Check the preview above or view in history." : "💡 You can close this and continue working. Your videos will appear in History when ready!"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {allDone ? "Close" : "Continue Working"}
            </Button>
            <Button variant="gradient" className="flex-1 gap-2" onClick={handleGoToHistory}>
              <ExternalLink className="h-4 w-4" />
              View History
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};