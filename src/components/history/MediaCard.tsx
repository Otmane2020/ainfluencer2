import { motion } from "framer-motion";
import { Video, Play, Download, Trash2, Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

export interface MediaItem {
  id: string;
  type: "video" | "image";
  title: string;
  url?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status: string;
  duration?: number;
  script?: string;
  projectName?: string;
  campaignName?: string;
  isProductShot?: boolean;
  aspectRatio?: "vertical" | "square" | "horizontal";
}

interface MediaCardProps {
  item: MediaItem;
  onDelete: (id: string) => void;
  onClick: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
  isGeneratingThumbnail?: boolean;
}

export const MediaCard = ({
  item,
  onDelete,
  onClick,
  onDownload,
  isDownloading,
  isGeneratingThumbnail,
}: MediaCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.type === "video" && videoRef.current && item.url) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (item.type === "video" && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Determine aspect ratio class based on content
  const getAspectClass = () => {
    if (item.aspectRatio === "square") return "aspect-square";
    if (item.aspectRatio === "horizontal") return "aspect-video";
    return "aspect-[9/16]";
  };

  // Get display image - prioritize thumbnailUrl for videos, url for images
  const displayImage = item.type === "video" ? item.thumbnailUrl : (item.url || item.thumbnailUrl);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`group relative ${getAspectClass()} overflow-hidden bg-muted cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Video element for hover preview */}
      {item.type === "video" && item.url && (
        <video
          ref={videoRef}
          src={item.url}
          muted
          loop
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Thumbnail/Image display */}
      <div className={`h-full w-full transition-opacity duration-300 ${
        isHovered && item.type === "video" && item.url ? "opacity-0" : "opacity-100"
      }`}>
        {isGeneratingThumbnail ? (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayImage ? (
          <img
            src={displayImage}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            {item.type === "video" ? (
              <Video className="h-8 w-8 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Play icon for videos - shows when not hovering */}
      {item.type === "video" && !isHovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-4 w-4 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Hover overlay with actions */}
      <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${
        isHovered ? "opacity-100" : "opacity-0"
      }`}>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {item.type === "video" ? <Play className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            disabled={isDownloading || !item.url}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full bg-destructive/80 backdrop-blur-sm text-destructive-foreground hover:bg-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
