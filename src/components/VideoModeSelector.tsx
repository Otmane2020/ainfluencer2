import { Video, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoMode } from "@/lib/clipMotionConfig";

interface VideoModeSelectorProps {
  mode: VideoMode;
  onModeChange: (mode: VideoMode) => void;
  className?: string;
}

export const VideoModeSelector = ({
  mode,
  onModeChange,
  className,
}: VideoModeSelectorProps) => {
  return (
    <div className={cn("flex rounded-lg border border-border p-1 bg-muted/30", className)}>
      <button
        type="button"
        onClick={() => onModeChange("standard")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
          mode === "standard"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Video className="h-4 w-4" />
        <span>Standard</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange("clipmotion")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
          mode === "clipmotion"
            ? "bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span>ClipMotion</span>
      </button>
    </div>
  );
};

export default VideoModeSelector;
