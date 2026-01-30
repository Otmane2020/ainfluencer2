import { motion } from "framer-motion";
import { Video, Play, Download, Trash2, Clock, Loader2, Image as ImageIcon, Camera, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

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
    if (item.type === "video" && videoRef.current) {
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
    return "aspect-[9/16]"; // Default vertical for videos
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative ${getAspectClass()} rounded-xl overflow-hidden border border-border bg-card cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Video element for hover preview */}
      {item.type === "video" && item.url && (
        <video
          ref={videoRef}
          src={item.url}
          poster={item.thumbnailUrl}
          muted
          loop
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Thumbnail or placeholder */}
      <div className={`h-full w-full transition-opacity duration-300 ${
        isHovered && item.type === "video" && item.url ? "opacity-0" : "opacity-100"
      }`}>
        {isGeneratingThumbnail ? (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : item.thumbnailUrl || (item.type === "image" && item.url) ? (
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.title}
            className="h-full w-full object-cover"
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
      {item.type === "video" && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          isHovered ? "opacity-0" : "opacity-100"
        }`}>
          <div className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-5 w-5 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Top badges */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
        <div className="flex flex-wrap gap-1">
          {item.type === "video" && item.duration && (
            <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
              <Clock className="h-3 w-3 mr-0.5" />
              {item.duration}s
            </Badge>
          )}
          {item.isProductShot && (
            <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
              <Camera className="h-3 w-3 mr-0.5" />
              Shot
            </Badge>
          )}
          <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
            {item.type === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
          </Badge>
        </div>
        <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
          {format(item.createdAt, "MMM d", { locale: enUS })}
        </Badge>
      </div>

      {/* Bottom gradient with title/info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8 pointer-events-none">
        {item.script && (
          <p className="text-xs text-white/90 line-clamp-2 leading-tight mb-1">{item.script.slice(0, 80)}</p>
        )}
        {item.campaignName && (
          <p className="text-[10px] text-white/60 truncate">{item.campaignName}</p>
        )}
        {item.projectName && !item.campaignName && (
          <p className="text-[10px] text-white/60 truncate">{item.projectName}</p>
        )}
      </div>

      {/* Hover overlay with actions */}
      <div className={`absolute inset-0 bg-black/40 flex items-end justify-center pb-16 transition-opacity duration-200 ${
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
            className="h-9 w-9 rounded-full bg-red-500/80 backdrop-blur-sm text-white hover:bg-red-500"
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
