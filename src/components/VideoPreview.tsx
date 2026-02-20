import { motion } from "framer-motion";
import { Play, Pause, Download, Merge, Trash2, GripVertical, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

interface VideoSegment {
  id: string;
  script: string;
  duration: number;
  status: "pending" | "generating" | "ready" | "error";
  videoUrl?: string;
  audioUrl?: string;
}

interface VideoPreviewProps {
  segments: VideoSegment[];
  avatarUrl?: string;
  onMerge: () => void;
  onDeleteSegment: (id: string) => void;
  isGenerating?: boolean;
  progress?: number;
}

export const VideoPreview = ({ segments, avatarUrl, onMerge, onDeleteSegment, isGenerating = false, progress = 0 }: VideoPreviewProps) => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const readySegments = segments.filter((s) => s.status === "ready");
  const totalDuration = readySegments.reduce((acc, s) => acc + s.duration, 0);

  const togglePlay = (segmentId: string) => {
    if (playingId === segmentId) {
      setPlayingId(null);
    } else {
      setPlayingId(segmentId);
    }
  };

  // Show generating placeholder
  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-6 shadow-card"
      >
        <h3 className="font-display text-lg font-semibold mb-4">Video Preview</h3>
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted overflow-hidden">
          {/* Animated shimmer placeholder */}
          <div className="relative w-full aspect-[9/16] max-h-[360px] flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-muted to-muted/60">
            {/* Pulsing video icon */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15"
            >
              <Video className="h-8 w-8 text-primary" />
            </motion.div>
            <div className="text-center px-6">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">Rendering video…</p>
              </div>
              {progress > 0 && (
                <p className="text-xs text-muted-foreground mb-3">{progress}% complete</p>
              )}
            </div>
            {/* Shimmer bars */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="h-2 rounded-full bg-muted-foreground/20 w-3/4 mx-auto"
              />
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.3 }}
                className="h-2 rounded-full bg-muted-foreground/20 w-1/2 mx-auto"
              />
            </div>
          </div>
          {/* Progress bar */}
          {progress > 0 && (
            <div className="w-full px-4 py-3 bg-card border-t border-border">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (readySegments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-6 shadow-card"
      >
        <h3 className="font-display text-lg font-semibold mb-4">Video Preview</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No video generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a video to preview it here
          </p>
        </div>
      </motion.div>
    );
  }

  const activeVideoUrl = readySegments[0]?.videoUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-6 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Video Preview</h3>
          <p className="text-sm text-muted-foreground">
            {readySegments.length} segment(s) • {totalDuration}s total
          </p>
        </div>
        {readySegments.length > 1 && (
          <Button variant="gradient" size="sm" onClick={onMerge}>
            <Merge className="mr-1 h-4 w-4" />
            Merge
          </Button>
        )}
      </div>

      {/* Main Preview */}
      <div className="mb-4 overflow-hidden rounded-xl bg-muted">
        {activeVideoUrl ? (
          <video
            key={activeVideoUrl}
            src={activeVideoUrl}
            controls
            playsInline
            className="w-full max-h-[400px] object-contain bg-black"
          />
        ) : avatarUrl ? (
          <div className="relative aspect-[9/16] max-h-[400px]">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="line-clamp-3 text-sm text-primary-foreground">
                {readySegments[0]?.script || "Video preview..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex aspect-[9/16] max-h-[300px] items-center justify-center">
            <p className="text-muted-foreground text-sm">No video to preview</p>
          </div>
        )}
      </div>

      {/* Segment List */}
      <div className="space-y-2">
        {readySegments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="cursor-grab text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            
            <button
              onClick={() => togglePlay(segment.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              {playingId === segment.id ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{segment.script}</p>
              <p className="text-xs text-muted-foreground">{segment.duration}s</p>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {segment.videoUrl ? (
                <a href={segment.videoUrl} download>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDeleteSegment(segment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>
            {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="flex h-full">
            {readySegments.map((segment, index) => (
              <div
                key={segment.id}
                className="h-full gradient-primary"
                style={{
                  width: `${(segment.duration / totalDuration) * 100}%`,
                  opacity: 0.6 + (index % 2) * 0.4,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
