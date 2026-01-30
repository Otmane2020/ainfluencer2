import { motion } from "framer-motion";
import { Video, Play, Download, Trash2, Clock, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useVideoThumbnail } from "@/hooks/useVideoThumbnail";
import { useToast } from "@/hooks/use-toast";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { Progress } from "@/components/ui/progress";

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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<VideoHistoryItem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const { generateThumbnail } = useVideoThumbnail();
  const { toast } = useToast();
  
  const processedVideosRef = useRef<Set<string>>(new Set());

  // Auto-generate thumbnails for videos without one
  useEffect(() => {
    const processVideos = async () => {
      for (const video of videos) {
        if (
          processedVideosRef.current.has(video.id) ||
          video.thumbnailUrl ||
          !video.videoUrl ||
          generatingThumbnails.has(video.id)
        ) {
          continue;
        }
        
        if (!video.videoUrl.includes("supabase.co")) {
          processedVideosRef.current.add(video.id);
          continue;
        }
        
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
  }, [videos.length]);

  // Handle hover autoplay
  const handleMouseEnter = (videoId: string) => {
    setHoveredId(videoId);
    const videoEl = videoRefs.current.get(videoId);
    if (videoEl) {
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    }
  };

  const handleMouseLeave = (videoId: string) => {
    setHoveredId(null);
    const videoEl = videoRefs.current.get(videoId);
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  };

  const handleDownload = async (video: VideoHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
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
      link.download = `${video.title.replace(/\s+/g, "-")}-${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Download complete",
        description: `${video.title} has been downloaded`,
      });
    } catch (error) {
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {activeGenerations.map((task) => (
            <motion.div
              key={task.taskId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-[9/16] rounded-xl overflow-hidden border border-primary/30 bg-card"
            >
              <div className="absolute inset-0 opacity-20">
                <motion.div
                  className="absolute inset-0 gradient-primary"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center mb-3"
                >
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </motion.div>
                <p className="text-xs text-center text-muted-foreground line-clamp-1 mb-2">{task.model}</p>
                <div className="flex items-center gap-2 w-full px-2">
                  <Progress value={task.progress} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium text-primary">{task.progress}%</span>
                </div>
              </div>

              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                  {task.status === "queued" ? "Queued" : "Generating"}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Grid - Masonry-like with 9:16 aspect ratio */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {videos.map((video) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative aspect-[9/16] rounded-xl overflow-hidden border border-border bg-card cursor-pointer"
            onMouseEnter={() => handleMouseEnter(video.id)}
            onMouseLeave={() => handleMouseLeave(video.id)}
            onClick={() => setSelectedVideo(video)}
          >
            {/* Video element for hover preview */}
            {video.videoUrl && (
              <video
                ref={(el) => {
                  if (el) videoRefs.current.set(video.id, el);
                }}
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                muted
                loop
                playsInline
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                  hoveredId === video.id ? "opacity-100" : "opacity-0"
                }`}
              />
            )}

            {/* Thumbnail or placeholder */}
            <div className={`h-full w-full transition-opacity duration-300 ${
              hoveredId === video.id && video.videoUrl ? "opacity-0" : "opacity-100"
            }`}>
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
            </div>

            {/* Play icon - shows when not hovering */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
              hoveredId === video.id ? "opacity-0" : "opacity-100"
            }`}>
              <div className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
            </div>

            {/* Top badges */}
            <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
              <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
                <Clock className="h-3 w-3 mr-0.5" />
                {video.duration}s
              </Badge>
              <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
                {format(video.createdAt, "MMM d", { locale: enUS })}
              </Badge>
            </div>

            {/* Bottom gradient with title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
              <p className="text-xs text-white/90 line-clamp-2 leading-tight">{video.script?.slice(0, 80) || video.title}</p>
            </div>

            {/* Hover overlay with actions */}
            <div className={`absolute inset-0 bg-black/40 flex items-end justify-center pb-16 transition-opacity duration-200 ${
              hoveredId === video.id ? "opacity-100" : "opacity-0"
            }`}>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
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
                  className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                  onClick={(e) => handleDownload(video, e)}
                  disabled={downloadingId === video.id || !video.videoUrl}
                >
                  {downloadingId === video.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-red-500/80 backdrop-blur-sm text-white hover:bg-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(video.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Video Detail Modal */}
      <VideoDetailModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.videoUrl}
        thumbnailUrl={selectedVideo?.thumbnailUrl}
        title={selectedVideo?.title || ""}
        prompt={selectedVideo?.script}
        duration={selectedVideo?.duration}
        createdAt={selectedVideo?.createdAt}
        model={selectedVideo?.voice}
        onDelete={() => {
          if (selectedVideo) {
            onDelete(selectedVideo.id);
            setSelectedVideo(null);
          }
        }}
      />
    </div>
  );
};

export type { VideoHistoryItem, GeneratingTask };
