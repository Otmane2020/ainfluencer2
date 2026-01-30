import { motion } from "framer-motion";
import { Video, Play, Pause, Download, Trash2, Clock, Calendar, Loader2, Maximize2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  campaignId?: string;
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
  
  // Track which videos we've already tried to generate thumbnails for
  const processedVideosRef = useRef<Set<string>>(new Set());

  // Auto-generate thumbnails for videos without one (only once per video)
  useEffect(() => {
    const processVideos = async () => {
      for (const video of videos) {
        // Skip if already processed, already has thumbnail, or no video URL
        if (
          processedVideosRef.current.has(video.id) ||
          video.thumbnailUrl ||
          !video.videoUrl ||
          generatingThumbnails.has(video.id)
        ) {
          continue;
        }
        
        // Skip external URLs silently (no spam logging)
        if (!video.videoUrl.includes("supabase.co")) {
          processedVideosRef.current.add(video.id);
          continue;
        }
        
        // Mark as being processed
        processedVideosRef.current.add(video.id);
        setGeneratingThumbnails((prev) => new Set(prev).add(video.id));
        
        try {
          const result = await generateThumbnail(video.videoUrl);
          if (result) {
            onThumbnailGenerated?.(video.id, result.thumbnailUrl);
          }
        } finally {
          setGeneratingThumbnails((prev) => {
            const updated = new Set(prev);
            updated.delete(video.id);
            return updated;
          });
        }
      }
    };
    
    processVideos();
  }, [videos.length]); // Only re-run when videos array length changes

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

  const activeGenerations = generatingTasks.filter(t => t.status === "queued" || t.status === "in_progress");

  // Show generating tasks even if no completed videos
  if (videos.length === 0 && activeGenerations.length === 0) {
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

  return (
    <div className="space-y-4">
      {/* In-progress generations */}
      {activeGenerations.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {activeGenerations.map((task) => (
            <motion.div
              key={task.taskId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-video rounded-lg overflow-hidden border border-primary/30 bg-card"
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 opacity-20">
                <motion.div
                  className="absolute inset-0 gradient-primary"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center mb-2"
                >
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </motion.div>
                <p className="text-xs text-center text-muted-foreground line-clamp-1">{task.model}</p>
                <div className="flex items-center gap-2 mt-2 w-full px-2">
                  <Progress value={task.progress} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium text-primary">{task.progress}%</span>
                </div>
              </div>

              {/* Status badge */}
              <div className="absolute top-1 left-1">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                  {task.status === "queued" ? "Queued" : "Generating"}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-2">
        {videos.map((video) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-card"
          >
            {/* Thumbnail or placeholder */}
            {generatingThumbnails.has(video.id) ? (
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Play button overlay */}
            <button
              onClick={() => setSelectedVideo(video)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
            >
              <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="h-6 w-6 text-white" />
              </div>
            </button>

            {/* Duration badge */}
            <div className="absolute top-1 left-1">
              <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px]">
                <Clock className="h-3 w-3 mr-0.5" />
                {video.duration}s
              </Badge>
            </div>

            {/* Date */}
            <div className="absolute top-1 right-1">
              <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px]">
                {format(video.createdAt, "MMM d", { locale: enUS })}
              </Badge>
            </div>

            {/* Title at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
              <p className="text-[10px] text-white/90 truncate">{video.title}</p>
            </div>

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVideo(video);
                }}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(video);
                }}
                disabled={downloadingId === video.id || !video.videoUrl}
              >
                {downloadingId === video.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              {video.videoUrl && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(video.videoUrl, "_blank");
                    }}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ShareButton
                      videoUrl={video.videoUrl}
                      thumbnailUrl={video.thumbnailUrl}
                      title={video.title}
                      description={video.script}
                    />
                  </div>
                </>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(video.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

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
