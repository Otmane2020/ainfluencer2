import { motion } from "framer-motion";
import { Video, Play, Pause, Download, Trash2, Clock, Calendar, Loader2, Maximize2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { ShareButton } from "@/components/ShareButton";
import { useVideoThumbnail } from "@/hooks/useVideoThumbnail";
import { useToast } from "@/hooks/use-toast";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoHistoryItem {
  id: string;
  title: string;
  script: string;
  duration: number;
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  voice: string;
  status: "ready" | "processing" | "error";
}

interface GeneratingTask {
  id: string;
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  model: string;
  duration: number;
  script?: string;
}

interface VideoHistoryProps {
  videos: VideoHistoryItem[];
  generatingTasks?: GeneratingTask[];
  onDelete: (id: string) => void;
  onPlay: (video: VideoHistoryItem) => void;
  onThumbnailGenerated?: (id: string, thumbnailUrl: string) => void;
  onContinueVideo?: (videoUrl: string) => void;
}

export const VideoHistory = ({ videos, generatingTasks = [], onDelete, onPlay, onThumbnailGenerated, onContinueVideo }: VideoHistoryProps) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<VideoHistoryItem | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { generateThumbnail } = useVideoThumbnail();
  const { toast } = useToast();

  // Auto-generate thumbnails for videos without one
  useEffect(() => {
    videos.forEach(async (video) => {
      if (video.videoUrl && !video.thumbnailUrl && !generatingThumbnails.has(video.id)) {
        setGeneratingThumbnails((prev) => new Set(prev).add(video.id));
        
        const result = await generateThumbnail(video.videoUrl);
        
        if (result) {
          onThumbnailGenerated?.(video.id, result.thumbnailUrl);
        }
        
        setGeneratingThumbnails((prev) => {
          const updated = new Set(prev);
          updated.delete(video.id);
          return updated;
        });
      }
    });
  }, [videos, generateThumbnail, generatingThumbnails, onThumbnailGenerated]);

  const togglePlay = (video: VideoHistoryItem) => {
    if (playingId === video.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (video.audioUrl) {
        audioRef.current = new Audio(video.audioUrl);
        audioRef.current.play();
        audioRef.current.onended = () => setPlayingId(null);
      }
      setPlayingId(video.id);
      onPlay(video);
    }
  };

  const handleDownload = async (video: VideoHistoryItem) => {
    const url = video.videoUrl || video.audioUrl;
    if (!url) return;

    setDownloadingId(video.id);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${video.title.replace(/\s+/g, "-")}-${video.id}.${video.videoUrl ? "mp4" : "mp3"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Download complete",
        description: `${video.title} has been downloaded`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download error",
        description: "Unable to download the file",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (videos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-6 shadow-card"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Clock className="h-5 w-5 text-secondary-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold">Video History</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No videos in history</p>
          <p className="text-sm text-muted-foreground">
            Generated videos will appear here
          </p>
        </div>
      </motion.div>
    );
  }

  const activeGenerations = generatingTasks.filter(t => t.status === "queued" || t.status === "in_progress");

  return (
    <div className="space-y-3">
      {/* In-progress generations */}
      {activeGenerations.map((task, index) => (
        <motion.div
          key={task.taskId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="group relative rounded-xl bg-card border border-primary/30 p-3 overflow-hidden"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-10">
            <motion.div
              className="absolute inset-0 gradient-primary"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>
          
          <div className="relative flex gap-3">
            {/* Generating indicator */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center"
              >
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </motion.div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium gradient-primary bg-clip-text text-transparent">Made with AI</span>
                <span className="text-xs text-muted-foreground">• {task.model}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {task.script || `Generating ${task.duration}s video...`}
              </p>
              
              {/* Progress bar */}
              <div className="flex items-center gap-2 mt-2">
                <Progress value={task.progress} className="h-1.5 flex-1" />
                <span className="text-xs font-medium text-primary">{task.progress}%</span>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {task.status === "queued" ? "In queue..." : "Generating..."}
              </p>
            </div>

            {/* Status indicator */}
            <div className="flex items-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </div>
        </motion.div>
      ))}
      {videos.map((video, index) => (
        <motion.div
          key={video.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="group relative rounded-xl bg-card border border-border p-3 active:bg-muted/50"
        >
          <div className="flex gap-3">
            {/* Thumbnail */}
            <button
              onClick={() => setSelectedVideo(video)}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              {generatingThumbnails.has(video.id) ? (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Video className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-6 w-6 text-white" />
              </div>
            </button>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium truncate">{video.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {video.script}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span>{format(video.createdAt, "MMM d", { locale: enUS })}</span>
                <span>•</span>
                <span>{video.duration}s</span>
              </div>
            </div>

            {/* Actions - Always visible on mobile */}
            <div className="flex items-center gap-1">
              {onContinueVideo && video.videoUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary"
                  onClick={() => onContinueVideo(video.videoUrl!)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <ShareButton
                videoUrl={video.videoUrl}
                thumbnailUrl={video.thumbnailUrl}
                title={video.title}
                description={video.script.substring(0, 100)}
              />
            </div>
          </div>
        </motion.div>
      ))}
      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.videoUrl}
        thumbnailUrl={selectedVideo?.thumbnailUrl}
        title={selectedVideo?.title || ""}
        description={selectedVideo?.script}
      />
    </div>
  );
};

export type { VideoHistoryItem, GeneratingTask };
