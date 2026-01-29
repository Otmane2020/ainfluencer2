import { motion, AnimatePresence } from "framer-motion";
import { 
  Video, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Clock,
  Sparkles,
  Mic,
  Film,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type Generation, STEP_WEIGHTS } from "@/hooks/useGenerations";
import { formatDistanceToNow } from "date-fns";

// ============================================================
// GENERATION PROGRESS COMPONENT
// Shows real-time progress with step-by-step updates
// ============================================================

interface GenerationProgressProps {
  generations: Generation[];
  onRetry?: (generationId: string) => void;
  onViewResult?: (generation: Generation) => void;
  showCompleted?: boolean;
  maxItems?: number;
  className?: string;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  initializing: <Loader2 className="h-4 w-4 animate-spin" />,
  script: <FileText className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  video: <Film className="h-4 w-4" />,
  voiceover: <Mic className="h-4 w-4" />,
  finalizing: <Sparkles className="h-4 w-4" />,
};

const STEP_LABELS: Record<string, string> = {
  initializing: "Initializing",
  script: "Generating script",
  image: "Creating image",
  video: "Rendering video",
  voiceover: "Adding voiceover",
  finalizing: "Finalizing",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  generating: "bg-primary/10 text-primary border-primary/20",
  processing: "bg-accent/10 text-accent-foreground border-accent/20",
  completed: "bg-secondary/10 text-secondary-foreground border-secondary/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="h-5 w-5" />,
  reel: <Video className="h-5 w-5" />,
  clipmotion: <Film className="h-5 w-5" />,
  image: <ImageIcon className="h-5 w-5" />,
  avatar: <Sparkles className="h-5 w-5" />,
};

function GenerationItem({ 
  generation, 
  onRetry, 
  onViewResult 
}: { 
  generation: Generation; 
  onRetry?: (id: string) => void;
  onViewResult?: (gen: Generation) => void;
}) {
  const isActive = generation.status === "pending" || generation.status === "generating" || generation.status === "processing";
  const isCompleted = generation.status === "completed";
  const isFailed = generation.status === "failed";

  // Calculate step progress with smooth interpolation
  const stepWeight = STEP_WEIGHTS[generation.step] || { min: 0, max: 100 };
  const stepProgress = Math.min(
    100,
    Math.max(
      stepWeight.min,
      generation.progress
    )
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group"
    >
      <Card className={cn(
        "border transition-all duration-200",
        isActive && "border-primary/40 shadow-lg shadow-primary/5",
        isCompleted && "border-secondary/30",
        isFailed && "border-destructive/30"
      )}>
        <CardContent className="p-4">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isActive ? "bg-primary/10 text-primary" : 
                isCompleted ? "bg-secondary/10 text-secondary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {TYPE_ICONS[generation.type] || <Video className="h-5 w-5" />}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">
                    {generation.video_mode === "clipmotion" ? "ClipMotion" : generation.type}
                  </span>
                  <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[generation.status])}>
                    {generation.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(generation.created_at), { addSuffix: true })}
                  {generation.duration && (
                    <span className="opacity-60">• {generation.duration}s</span>
                  )}
                  {generation.model && (
                    <span className="opacity-60">• {generation.model}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isFailed && onRetry && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onRetry(generation.id)}
                  className="gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
              {isCompleted && generation.media_url && onViewResult && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => onViewResult(generation)}
                >
                  View Result
                </Button>
              )}
            </div>
          </div>

          {/* Progress Section */}
          {isActive && (
            <div className="space-y-2">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm">
                <span className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                  "bg-primary/10 text-primary"
                )}>
                  {STEP_ICONS[generation.step]}
                  {STEP_LABELS[generation.step] || generation.step}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {stepProgress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative">
                <Progress value={stepProgress} className="h-2" />
                {/* Animated glow on progress */}
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                  style={{ width: `${stepProgress}%` }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>

              {/* Step timeline */}
              <div className="flex justify-between mt-3">
                {Object.entries(STEP_WEIGHTS).map(([step, weights], index) => {
                  const isCurrentStep = step === generation.step;
                  const isPastStep = generation.progress >= weights.max;
                  const isFutureStep = generation.progress < weights.min;
                  
                  return (
                    <div 
                      key={step}
                      className={cn(
                        "flex flex-col items-center gap-1 text-xs",
                        isCurrentStep && "text-primary font-medium",
                        isPastStep && "text-secondary-foreground",
                        isFutureStep && "text-muted-foreground/50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all",
                        isCurrentStep && "border-primary bg-primary/10",
                        isPastStep && "border-secondary bg-secondary text-secondary-foreground",
                        isFutureStep && "border-muted-foreground/30 bg-background"
                      )}>
                        {isPastStep ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : isCurrentStep ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <span className="text-[10px]">{index + 1}</span>
                        )}
                      </div>
                      <span className="hidden sm:block">{STEP_LABELS[step]?.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error message */}
          {isFailed && generation.error_message && (
            <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-destructive/5 text-destructive text-sm">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{generation.error_message}</span>
            </div>
          )}

          {/* Completed preview */}
          {isCompleted && generation.media_url && (
            <div className="mt-3 rounded-lg overflow-hidden bg-muted/50 aspect-video relative">
              {generation.type === "image" || generation.thumbnail_url ? (
                <img 
                  src={generation.thumbnail_url || generation.media_url} 
                  alt="Generated content"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video 
                  src={generation.media_url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Prompt preview */}
          {generation.prompt && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
              "{generation.prompt.slice(0, 100)}{generation.prompt.length > 100 ? "..." : ""}"
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function GenerationProgress({
  generations,
  onRetry,
  onViewResult,
  showCompleted = true,
  maxItems = 10,
  className,
}: GenerationProgressProps) {
  const filteredGenerations = showCompleted 
    ? generations.slice(0, maxItems)
    : generations.filter(g => g.status !== "completed" && g.status !== "failed").slice(0, maxItems);

  if (filteredGenerations.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No active generations</p>
        <p className="text-xs mt-1">Your generation history will appear here</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("max-h-[500px]", className)}>
      <div className="space-y-3 pr-4">
        <AnimatePresence mode="popLayout">
          {filteredGenerations.map((generation) => (
            <GenerationItem
              key={generation.id}
              generation={generation}
              onRetry={onRetry}
              onViewResult={onViewResult}
            />
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}

// Compact version for sidebar/header
export function GenerationProgressCompact({ 
  activeCount, 
  latestProgress,
  latestStep,
  onClick 
}: { 
  activeCount: number;
  latestProgress: number;
  latestStep: string;
  onClick?: () => void;
}) {
  if (activeCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <Button
        variant="default"
        size="lg"
        onClick={onClick}
        className="gap-2 shadow-lg"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{activeCount} generating</span>
        <Badge variant="secondary" className="ml-1">
          {latestProgress}%
        </Badge>
      </Button>
    </motion.div>
  );
}
