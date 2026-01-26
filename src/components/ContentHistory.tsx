import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Image, Video, FileText, Trash2, Share2, Copy, Check, Eye, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContentItem {
  id: string;
  content_type: "video" | "image" | "text";
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  ai_prompt: string | null;
  status: string;
  created_at: string;
  platforms: string[] | null;
}

interface ContentHistoryProps {
  projectId?: string;
  onShare?: (item: ContentItem) => void;
  onPreview?: (item: ContentItem) => void;
  limit?: number;
}

export const ContentHistory = ({ projectId, onShare, onPreview, limit }: ContentHistoryProps) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "video" | "image" | "text">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, [projectId, filter]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("scheduled_posts")
        .select("id, content_type, text_content, media_url, thumbnail_url, ai_prompt, status, created_at, platforms")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      if (filter !== "all") {
        query = query.eq("content_type", filter);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems((data as ContentItem[]) || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (item: ContentItem) => {
    if (!item.text_content) return;
    
    try {
      await navigator.clipboard.writeText(item.text_content);
      setCopiedId(item.id);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Unable to copy content",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      const { error } = await supabase
        .from("scheduled_posts")
        .delete()
        .eq("id", deleteItem.id);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
      toast({
        title: "Deleted",
        description: "Content removed from history",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Unable to delete content",
        variant: "destructive",
      });
    } finally {
      setDeleteItem(null);
    }
  };

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
    };
    
    const cfg = config[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 md:p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-muted rounded animate-pulse mb-1" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-4 md:p-6 shadow-card"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
              <History className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Content History</h3>
              <p className="text-sm text-muted-foreground">{items.length} item(s)</p>
            </div>
          </div>

          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content List */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No content yet</p>
            <p className="text-sm text-muted-foreground">Generate content to see your history</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: 0.05 * index }}
                  className="group rounded-xl border border-border p-3 md:p-4 transition-all hover:border-primary/30 hover:bg-muted/30"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    {(item.media_url || item.thumbnail_url) && (
                      <div 
                        className="h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer"
                        onClick={() => onPreview?.(item)}
                      >
                        {item.content_type === "video" ? (
                          <div className="relative h-full w-full">
                            <img
                              src={item.thumbnail_url || item.media_url || ""}
                              alt="Thumbnail"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Video className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.media_url || item.thumbnail_url || ""}
                            alt="Content"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* Content Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getContentIcon(item.content_type)}
                            <span className="capitalize">{item.content_type}</span>
                          </div>
                          {getStatusBadge(item.status || "draft")}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {format(new Date(item.created_at), "MMM d, yyyy")}
                          </span>
                          <span className="sm:hidden">
                            {format(new Date(item.created_at), "MM/dd")}
                          </span>
                        </div>
                      </div>

                      {item.text_content && (
                        <p className="mt-2 text-sm line-clamp-2">{item.text_content}</p>
                      )}
                      
                      {item.ai_prompt && !item.text_content && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 italic">
                          "{item.ai_prompt}"
                        </p>
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
                  <div className="mt-3 flex flex-wrap items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {item.text_content && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(item)}
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
                      onClick={() => setDeleteItem(item)}
                      className="h-8 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
