import { Play, Download, Share2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { ShareButton } from "@/components/ShareButton";

interface VideoCardProps {
  id: string;
  prompt: string;
  thumbnailUrl: string;
  videoUrl?: string;
  status: "generating" | "completed" | "failed";
  createdAt: Date;
  onDelete?: (id: string) => void;
}

const VideoCard = ({ id, prompt, thumbnailUrl, videoUrl, status, createdAt, onDelete }: VideoCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `video-${id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-card border border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail / Preview */}
      <div className="aspect-video relative overflow-hidden">
        {status === "generating" ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-primary/30 rounded-full animate-spin" style={{ animationDuration: "3s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
            </div>
          </div>
        ) : status === "failed" ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Generation failed</p>
            </div>
          </div>
        ) : isPlaying && videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            className="w-full h-full object-cover"
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <>
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={prompt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Play overlay */}
            <div
              className={`absolute inset-0 bg-background/60 flex items-center justify-center transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                onClick={() => setIsPlaying(true)}
                className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform transition-transform duration-200 hover:scale-110 shadow-lg shadow-primary/30"
              >
                <Play className="w-7 h-7 text-primary-foreground ml-1" />
              </button>
            </div>
          </>
        )}

        {/* Status badge */}
        {status === "generating" && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-medium animate-pulse">
            Generating...
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm text-foreground line-clamp-2 mb-3">{prompt}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
          {status === "completed" && (
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <div onClick={(e) => e.stopPropagation()}>
                <ShareButton
                  videoUrl={videoUrl}
                  thumbnailUrl={thumbnailUrl}
                  title={prompt}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
