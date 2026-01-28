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
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "scheduled" | "published">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Track if we have generating items for polling
  const [hasGenerating, setHasGenerating] = useState(false);

  // Fetch on filter/project changes
  useEffect(() => {
    fetchHistory();
  }, [projectId, campaignId, filter, statusFilter]);

  // Separate polling effect that doesn't depend on items
  useEffect(() => {
    if (!hasGenerating) return;
    
    const interval = setInterval(() => {
      fetchHistory();
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [hasGenerating, projectId, campaignId, filter, statusFilter]);

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

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (limit) {
        query = query.limit(limit);
      } else {
        query = query.limit(100); // Default limit to show more posts
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log("[ContentHistory] Fetched posts:", data?.length || 0);
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        campaign: item.campaigns ? { name: item.campaigns.name } : null,
      }));
      setItems(mappedData as ContentItem[]);
      
      // Check if any items are still generating
      const generating = mappedData.some((item: any) => 
        (item.content_type === "image" || item.content_type === "video") 
        && item.ai_prompt 
        && !item.media_url 
        && item.status === "draft"
      );
      setHasGenerating(generating);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast({
        title: "Error",
        description: "Failed to load content history",
        variant: "destructive",
      });
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

  const handleRegenerate = async (item: ContentItem) => {
    if (!item.ai_prompt) {
      toast({ title: "Error", description: "No prompt available for regeneration", variant: "destructive" });
      return;
    }

    toast({ title: "Generating...", description: "Image generation started" });

    try {
      // Call the working generate-image function directly
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { 
          prompt: item.ai_prompt,
          productId: "ai-image-standard",
          format: "reel"
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Update the post with the generated image
        const { error: updateError } = await supabase
          .from("scheduled_posts")
          .update({ 
            media_url: data.imageUrl,
            status: "scheduled"
          })
          .eq("id", item.id);

        if (updateError) throw updateError;

        toast({ title: "Success!", description: "Image generated successfully" });
        fetchHistory(); // Refresh the list
      } else {
        throw new Error("No image URL returned");
      }
    } catch (err: any) {
      console.error("Regeneration error:", err);
      toast({ 
        title: "Generation failed", 
        description: err.message || "Unable to generate image", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);

    try {
      // Use the delete-post API for better logging and consistency
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.access_token) {
        const { data, error } = await supabase.functions.invoke("delete-post", {
          body: { postId: deleteItem.id },
        });

        if (error) throw error;
        console.log("[ContentHistory] Delete API response:", data);
      } else {
        // Fallback to direct delete if no session
        const { error } = await supabase
          .from("scheduled_posts")
          .delete()
          .eq("id", deleteItem.id);

        if (error) throw error;
      }

      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
      toast({
        title: "Deleted",
        description: "Content removed successfully",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Unable to delete content",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                  onRegenerate={handleRegenerate}
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
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
