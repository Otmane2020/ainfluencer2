import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { ContentHistoryItem } from "./ContentHistoryItem";

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
  campaign_id: string | null;
  campaign?: { name: string } | null;
}

interface ContentHistoryProps {
  projectId?: string;
  campaignId?: string;
  onShare?: (item: ContentItem) => void;
  onPreview?: (item: ContentItem) => void;
  limit?: number;
}

export const ContentHistory = ({ projectId, campaignId, onShare, onPreview, limit }: ContentHistoryProps) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "video" | "image" | "text">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
    
    // Set up polling for items that are generating
    const interval = setInterval(() => {
      const hasGenerating = items.some(item => 
        (item.content_type === "image" || item.content_type === "video") 
        && item.ai_prompt 
        && !item.media_url 
        && item.status === "draft"
      );
      if (hasGenerating) {
        fetchHistory();
      }
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [projectId, campaignId, filter, items]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("scheduled_posts")
        .select("id, content_type, text_content, media_url, thumbnail_url, ai_prompt, status, created_at, platforms, campaign_id, campaigns(name)")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      if (filter !== "all") {
        query = query.eq("content_type", filter);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        campaign: item.campaigns ? { name: item.campaigns.name } : null,
      }));
      setItems(mappedData as ContentItem[]);
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
                <ContentHistoryItem
                  key={item.id}
                  item={item}
                  index={index}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onPreview={(item) => onPreview?.(item)}
                  onShare={(item) => onShare?.(item)}
                  onDelete={setDeleteItem}
                />
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
