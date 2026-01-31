import { motion } from "framer-motion";
import { Video, Image, FileText, Trash2, Share2, Copy, Check, Eye, Calendar, Loader2, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface ContentItem {
  id: string;
  content_type: "video" | "image" | "text";
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  ai_prompt: string | null;
  status: string;
  created_at: string;
  published_at?: string | null;
  platforms: string[] | null;
  campaign_id: string | null;
  campaign?: { name: string } | null;
  error_message?: string | null;
  external_post_id?: string | null;
}

interface ContentHistoryItemProps {
  item: ContentItem;
  index: number;
  copiedId: string | null;
  onCopy: (item: ContentItem) => void;
  onPreview: (item: ContentItem) => void;
  onShare: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
  onRegenerate?: (item: ContentItem) => void;
}

export const ContentHistoryItem = ({
  item,
  index,
  copiedId,
  onCopy,
  onPreview,
  onShare,
  onDelete,
  onRegenerate,
}: ContentHistoryItemProps) => {
  const getContentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", variant: "secondary" },
      scheduled: { label: "Scheduled", variant: "default" },
      published: { label: "Published", variant: "outline" },
      failed: { label: "Failed", variant: "destructive" },
      generating: { label: "Generating...", variant: "default" },
    };
    
    const cfg = config[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  // Check if this item is still being generated (has prompt but no media)
  const isGenerating = (item.content_type === "image" || item.content_type === "video") 
    && item.ai_prompt 
    && !item.media_url 
    && item.status === "draft";

  // Check elapsed time for stale detection
  const createdAt = new Date(item.created_at).getTime();
  const now = Date.now();
  const elapsed = now - createdAt;
  const isStale = elapsed > 300000; // 5 minutes = stale/failed

  // Simulate progress based on creation time (for visual feedback)
  const getEstimatedProgress = () => {
    const estimatedTime = item.content_type === "video" ? 120000 : 30000; // 2min for video, 30s for image
    return Math.min(95, Math.round((elapsed / estimatedTime) * 100));
  };

  const handleRetry = () => {
    if (onRegenerate) {
      onRegenerate(item);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: 0.05 * index }}
      className="group rounded-xl border border-border p-3 md:p-4 transition-all hover:border-primary/30 hover:bg-muted/30"
    >
      <div className="flex gap-3">
        {/* Thumbnail / Generation Preview */}
        <div 
          className="h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer relative"
          onClick={() => !isGenerating && !isStale && onPreview?.(item)}
        >
          {isGenerating && !isStale ? (
            // Show generating state with animated gradient
            <div className="relative h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20">
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              <div className="relative flex flex-col items-center gap-1">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-[10px] font-medium text-primary-foreground">{getEstimatedProgress()}%</span>
              </div>
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/10 to-transparent animate-shimmer" />
            </div>
          ) : isGenerating && isStale ? (
            // Show failed/stale state
            <div className="relative h-full w-full flex items-center justify-center bg-destructive/20">
              <div className="absolute inset-0 bg-gradient-to-t from-destructive/40 to-transparent" />
              <div className="relative flex flex-col items-center gap-1">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-[10px] font-medium text-destructive">Failed</span>
              </div>
            </div>
          ) : item.media_url || item.thumbnail_url ? (
            item.content_type === "video" ? (
              <div className="relative h-full w-full">
                <img
                  src={item.thumbnail_url || item.media_url || ""}
                  alt="Thumbnail"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
                  <Video className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            ) : (
              <img
                src={item.media_url || item.thumbnail_url || ""}
                alt="Content"
                className="h-full w-full object-cover"
              />
            )
          ) : (
            // Placeholder for text-only content
            <div className="h-full w-full flex items-center justify-center bg-muted">
              {getContentIcon(item.content_type)}
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getContentIcon(item.content_type)}
                <span className="capitalize">{item.content_type}</span>
              </div>
              {isGenerating && isStale ? (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              ) : isGenerating ? (
                <Badge variant="default" className="animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </Badge>
              ) : (
                getStatusBadge(item.status || "draft")
              )}
              {item.campaign && (
                <Badge variant="outline" className="text-xs">
                  📢 {item.campaign.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {item.status === "published" && item.published_at ? (
                <>
                  <span className="hidden sm:inline">
                    Published {format(new Date(item.published_at), "MMM d 'at' HH:mm")}
                  </span>
                  <span className="sm:hidden">
                    {format(new Date(item.published_at), "MM/dd HH:mm")}
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {format(new Date(item.created_at), "MMM d, yyyy 'at' HH:mm")}
                  </span>
                  <span className="sm:hidden">
                    {format(new Date(item.created_at), "MM/dd HH:mm")}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Progress bar for generating items (not stale) */}
          {isGenerating && !isStale && (
            <div className="mt-2">
              <Progress value={getEstimatedProgress()} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                AI is {item.content_type === "video" ? "creating your video" : "generating your image"}...
              </p>
            </div>
          )}

          {/* Retry button for stale/failed items */}
          {(isGenerating && isStale) || item.status === "failed" ? (
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="h-7 text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry Generation
                </Button>
                <span className="text-xs text-muted-foreground">
                  {isGenerating && isStale ? "Generation timed out" : "Failed"}
                </span>
              </div>
              {item.error_message && (
                <p className="text-xs text-destructive/80 line-clamp-2">
                  {item.error_message}
                </p>
              )}
            </div>
          ) : null}

        {!isGenerating && item.text_content && (
          <div className="mt-2">
            {item.ai_prompt && (
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/80 mb-1">
                <span>✨</span> Generated by AI
              </span>
            )}
            <p className="text-sm line-clamp-2">{item.text_content}</p>
          </div>
        )}
        
        {!isGenerating && item.ai_prompt && !item.text_content && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-primary/80 mb-1">
              <span>✨</span> Generated by AI
            </span>
            <p className="text-sm text-muted-foreground line-clamp-2 italic">
              "{item.ai_prompt}"
            </p>
          </div>
        )}

          {/* Platforms */}
          {item.platforms && item.platforms.length > 0 && (
            <div className="mt-2 flex gap-1">
              {item.platforms.map((platform) => (
                <span
                  key={platform}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize"
                >
                  {platform}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions - Always visible on mobile, hover on desktop */}
      {!isGenerating && (
        <div className="mt-3 flex flex-wrap items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {item.text_content && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(item)}
              className="h-8 text-xs"
            >
              {copiedId === item.id ? (
                <Check className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              Copy
            </Button>
          )}
          {item.media_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview?.(item)}
              className="h-8 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          )}
          {item.status === "published" && item.platforms?.includes("facebook") && item.external_post_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://www.facebook.com/${item.external_post_id}`, "_blank")}
              className="h-8 text-xs text-primary hover:text-primary/80"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View on Facebook
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare?.(item)}
            className="h-8 text-xs"
          >
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            className="h-8 text-xs text-destructive hover:text-destructive"
            title={item.status === "published" && item.external_post_id 
              ? "Delete from database and social platforms" 
              : "Delete from database"}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {item.status === "published" && item.external_post_id ? "Delete All" : "Delete"}
          </Button>
        </div>
      )}
    </motion.div>
  );
};
