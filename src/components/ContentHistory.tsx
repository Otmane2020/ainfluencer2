import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Filter, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, isThisWeek, isThisMonth, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
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
  error_message?: string | null;
}

interface ContentHistoryProps {
  projectId?: string;
  campaignId?: string;
  onShare?: (item: ContentItem) => void;
  onPreview?: (item: ContentItem) => void;
  limit?: number;
}

type TimeRange = "day" | "week" | "month" | "all";

interface GroupedItems {
  label: string;
  items: ContentItem[];
}

export const ContentHistory = ({ projectId, campaignId, onShare, onPreview, limit }: ContentHistoryProps) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "video" | "image" | "text">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "scheduled" | "published" | "failed">("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const { toast } = useToast();

  // Track if we have generating items for polling
  const [hasGenerating, setHasGenerating] = useState(false);

  // Fetch on filter/project changes
  useEffect(() => {
    fetchHistory();
  }, [projectId, campaignId, filter, statusFilter, timeRange]);

  // Separate polling effect - only runs when there are generating items
  useEffect(() => {
    if (!hasGenerating) {
      console.log("[ContentHistory] No generating items, polling stopped");
      return;
    }
    
    console.log("[ContentHistory] Generating items detected, starting polling");
    const interval = setInterval(() => {
      fetchHistory();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [hasGenerating]);

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: GroupedItems[] = [];
    const dateMap = new Map<string, ContentItem[]>();

    items.forEach(item => {
      const date = startOfDay(new Date(item.created_at));
      const dateKey = date.toISOString();
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(item);
    });

    // Sort by date descending
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    sortedDates.forEach(dateKey => {
      const date = new Date(dateKey);
      let label: string;

      if (isToday(date)) {
        label = "Today";
      } else if (isYesterday(date)) {
        label = "Yesterday";
      } else if (isThisWeek(date)) {
        label = format(date, "EEEE"); // Day name
      } else if (isThisMonth(date)) {
        label = format(date, "MMMM d");
      } else {
        label = format(date, "MMMM d, yyyy");
      }

      groups.push({
        label,
        items: dateMap.get(dateKey)!
      });
    });

    return groups;
  }, [items]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("scheduled_posts")
        .select("id, content_type, text_content, media_url, thumbnail_url, ai_prompt, status, created_at, platforms, campaign_id, error_message, campaigns(name)")
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

      // Apply time range filter
      if (timeRange !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case "day":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte("created_at", startDate.toISOString());
      }

      if (limit) {
        query = query.limit(limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        campaign: item.campaigns ? { name: item.campaigns.name } : null,
      }));
      setItems(mappedData as ContentItem[]);
      
      // Check if any items are still generating
      const generating = mappedData.some((item: any) => {
        const isGenerating = (item.content_type === "image" || item.content_type === "video") 
          && item.ai_prompt 
          && !item.media_url 
          && item.status === "draft";
        
        // Also check if item is not stale (less than 5 minutes old)
        if (isGenerating) {
          const createdAt = new Date(item.created_at).getTime();
          const elapsed = Date.now() - createdAt;
          return elapsed < 300000; // 5 minutes
        }
        return false;
      });
      
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
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { 
          prompt: item.ai_prompt,
          productId: "ai-image-standard",
          format: "reel"
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const { error: updateError } = await supabase
          .from("scheduled_posts")
          .update({ 
            media_url: data.imageUrl,
            status: "scheduled",
            error_message: null
          })
          .eq("id", item.id);

        if (updateError) throw updateError;

        toast({ title: "Success!", description: "Image generated successfully" });
        fetchHistory();
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
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.access_token) {
        const { error } = await supabase.functions.invoke("delete-post", {
          body: { postId: deleteItem.id },
        });
        if (error) throw error;
      } else {
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

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("scheduled_posts")
        .delete()
        .in("id", Array.from(selectedItems));

      if (error) throw error;

      setItems((prev) => prev.filter((i) => !selectedItems.has(i.id)));
      setSelectedItems(new Set());
      setShowBulkDelete(false);
      toast({
        title: "Deleted",
        description: `${selectedItems.size} item(s) removed`,
      });
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Unable to delete content",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
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
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                <History className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Content History</h3>
                <p className="text-sm text-muted-foreground">{items.length} item(s)</p>
              </div>
            </div>

            {/* Bulk actions */}
            {selectedItems.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDelete(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedItems.size})
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[120px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[130px]">
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

            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="ml-auto"
              >
                {selectedItems.size === items.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </div>

        {/* Content List grouped by day */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No content yet</p>
            <p className="text-sm text-muted-foreground">Generate content to see your history</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedItems.map((group) => (
              <div key={group.label}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-card py-2">
                  {group.label}
                </h4>
                <div className="space-y-3">
                  <AnimatePresence>
                    {group.items.map((item, index) => (
                      <div key={item.id} className="flex gap-2 items-start">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          className="mt-4 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <ContentHistoryItem
                            item={item}
                            index={index}
                            copiedId={copiedId}
                            onCopy={handleCopy}
                            onPreview={(item) => onPreview?.(item)}
                            onShare={(item) => onShare?.(item)}
                            onDelete={setDeleteItem}
                            onRegenerate={handleRegenerate}
                          />
                        </div>
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.size} Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.size} selected item(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
