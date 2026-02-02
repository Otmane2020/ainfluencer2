import { Video, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoMode } from "@/lib/clipMotionConfig";

interface VideoModeSelectorProps {
  mode: VideoMode;
  onModeChange: (mode: VideoMode) => void;
  className?: string;
  showMotion?: boolean;
}

export const VideoModeSelector = ({
  mode,
  onModeChange,
  className,
  showMotion = true,
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
      {showMotion && (
        <button
          type="button"
          onClick={() => onModeChange("motion")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
            mode === "motion"
              ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4" />
          <span>Motion</span>
        </button>
      )}
    </div>
  );
};

export default VideoModeSelector;
