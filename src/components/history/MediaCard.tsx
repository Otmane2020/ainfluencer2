import { motion } from "framer-motion";
import { Video, Play, Download, Trash2, Loader2, Image as ImageIcon, ExternalLink, Sparkles, Zap, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E4405F",
  facebook: "#1877F2",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
};

const PlatformDot = ({ platform }: { platform: string }) => {
  const color = PLATFORM_COLORS[platform.toLowerCase()] || "#888";
  return (
    <div
      className="h-5 w-5 rounded-full border-2 border-white/80 shadow-sm flex items-center justify-center"
      style={{ backgroundColor: color }}
      title={platform}
    >
      <span className="text-white text-[8px] font-bold uppercase">{platform[0]}</span>
    </div>
  );
};

const MODEL_CONFIG: Record<string, { label: string; icon: typeof Sparkles; color: string }> = {
  "sora": { label: "Sora", icon: Sparkles, color: "bg-purple-500/80" },
  "kling": { label: "Kling", icon: Zap, color: "bg-blue-500/80" },
  "flux": { label: "FLUX", icon: Zap, color: "bg-violet-500/80" },
  "gemini": { label: "Gemini", icon: Bot, color: "bg-amber-500/80" },
  "gpt": { label: "GPT", icon: Bot, color: "bg-emerald-500/80" },
  "comet": { label: "Comet", icon: Sparkles, color: "bg-cyan-500/80" },
  "qwen": { label: "Qwen", icon: Sparkles, color: "bg-sky-500/80" },
  "nano": { label: "NB", icon: Sparkles, color: "bg-yellow-500/80" },
  "d-id": { label: "D-ID", icon: Sparkles, color: "bg-orange-500/80" },
};

const getModelConfig = (model: string) => {
  const lower = model.toLowerCase();
  for (const [key, config] of Object.entries(MODEL_CONFIG)) {
    if (lower.includes(key)) return config;
  }
  return { label: model.split("/").pop()?.split("-")[0] || model, icon: Sparkles, color: "bg-muted/80" };
};

const ModelBadge = ({ model }: { model: string }) => {
  const config = getModelConfig(model);
  const Icon = config.icon;
  return (
    <div className={`absolute top-2 left-2 ${config.color} text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 pointer-events-none backdrop-blur-sm`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </div>
  );
};

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
  projectId?: string;
  projectName?: string;
  campaignId?: string;
  campaignName?: string;
  isProductShot?: boolean;
  storagePath?: string;
  aspectRatio?: "vertical" | "square" | "horizontal";
  platforms?: string[];
  textContent?: string;
  model?: string;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for autoplay on scroll
  useEffect(() => {
    if (item.type !== "video" || !item.url) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
          
          if (entry.isIntersecting && videoRef.current) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          } else if (!entry.isIntersecting && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: 0.5, // 50% visible triggers play
        rootMargin: "0px",
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [item.type, item.url]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Determine aspect ratio class based on content
  const getAspectClass = () => {
    if (item.aspectRatio === "square") return "aspect-square";
    if (item.aspectRatio === "horizontal") return "aspect-video";
    return "aspect-[9/16]";
  };

  // Get display image - prioritize thumbnailUrl for videos, url for images
  const displayImage = item.type === "video" ? item.thumbnailUrl : (item.url || item.thumbnailUrl);

  // Show video when playing (in view) or when there's no thumbnail
  const showVideo = item.type === "video" && item.url && (isInView || !displayImage);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`group relative ${getAspectClass()} overflow-hidden bg-muted cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Video element - always rendered for videos, visibility controlled */}
      {item.type === "video" && item.url && (
        <video
          ref={videoRef}
          src={item.url}
          muted
          loop
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            showVideo ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Thumbnail/Image display - hidden when video is playing */}
      <div className={`h-full w-full transition-opacity duration-300 ${
        showVideo ? "opacity-0" : "opacity-100"
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

      {/* Model badge */}
      {item.model && !isHovered && (
        <ModelBadge model={item.model} />
      )}

      {/* Platform icons overlay */}
      {item.platforms && item.platforms.length > 0 && !isHovered && (
        <div className="absolute bottom-2 left-2 flex gap-1 pointer-events-none">
          {item.platforms.map((platform) => (
            <PlatformDot key={platform} platform={platform} />
          ))}
        </div>
      )}

      {/* Play icon for videos - only show when not playing and not hovered */}
      {item.type === "video" && !isPlaying && !isHovered && !isInView && (
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
