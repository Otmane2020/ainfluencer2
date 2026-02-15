import { useState, useEffect } from "react";
import { RefreshCw, Loader2, LayoutGrid, Video, Image, Trash2, Eye, Pencil, X, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MasonryGrid } from "@/components/history/MasonryGrid";
import { MediaItem } from "@/components/history/MediaCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

type ContentFilter = "all" | "video" | "image";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E4405F",
  facebook: "#1877F2",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
};
const getPlatformPostUrl = (platform: string, externalPostId?: string): string | null => {
  if (!externalPostId) return null;
  const p = platform.toLowerCase();
  if (p === "facebook") return `https://www.facebook.com/photo/?fbid=${externalPostId}`;
  if (p === "instagram") return `https://www.instagram.com/p/${externalPostId}`;
  if (p === "youtube") return `https://www.youtube.com/watch?v=${externalPostId}`;
  if (p === "tiktok") return `https://www.tiktok.com/@user/video/${externalPostId}`;
  if (p === "linkedin") return `https://www.linkedin.com/feed/update/${externalPostId}`;
  return null;
};

const PostHistoryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<ContentFilter>("all");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, selectedProject]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .eq("user_id", user.id)
      .order("name");
    if (data) setProjects(data);
  };

  const fetchPosts = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from("scheduled_posts")
        .select("id, content_type, text_content, media_url, thumbnail_url, ai_prompt, status, created_at, platforms, campaign_id, project_id, external_post_id, campaigns(name), projects(name)")
        .eq("status", "published")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (selectedProject !== "all") {
        query = query.eq("project_id", selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: MediaItem[] = (data || [])
        .filter((item: any) => item.media_url)
        .map((item: any) => ({
          id: item.id,
          type: item.content_type === "video" ? "video" as const : "image" as const,
          title: (item.projects as any)?.name || "Post",
          url: item.media_url,
          thumbnailUrl: item.thumbnail_url || undefined,
          createdAt: new Date(item.created_at),
          status: item.status || "published",
          projectId: item.project_id,
          projectName: (item.projects as any)?.name,
          campaignId: item.campaign_id || undefined,
          campaignName: (item.campaigns as any)?.name,
          platforms: item.platforms || [],
          textContent: item.text_content || item.ai_prompt || "",
          script: item.ai_prompt || undefined,
          aspectRatio: item.content_type === "video" ? "vertical" as const : "square" as const,
          externalPostId: item.external_post_id || undefined,
        }));

      setItems(mapped);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFromPlatform = async (id: string) => {
    try {
      const res = await supabase.functions.invoke("delete-post", {
        body: { postId: id, deleteFromPlatforms: true, keepInDatabase: true },
      });

      if (res.error) throw res.error;

      const result = res.data?.results?.[0];
      const platformDeleted = result?.facebookDeleted || result?.instagramDeleted;
      toast({ 
        title: platformDeleted ? "Removed from platform" : "Platform deletion failed",
        description: platformDeleted ? "Post kept in history" : result?.error || "Could not remove from platform",
        variant: platformDeleted ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Platform delete failed:", error);
      toast({ title: "Platform delete failed", variant: "destructive" });
    }
  };

  const handleDeleteFromDB = async (id: string) => {
    try {
      await supabase.from("scheduled_posts").delete().eq("id", id);
      setItems(prev => prev.filter(m => m.id !== id));
      setSelectedItem(null);
      toast({ title: "Post removed from history" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    try {
      await supabase
        .from("scheduled_posts")
        .update({ text_content: editText })
        .eq("id", selectedItem.id);
      
      setItems(prev => prev.map(m => 
        m.id === selectedItem.id ? { ...m, textContent: editText } : m
      ));
      setSelectedItem(prev => prev ? { ...prev, textContent: editText } : null);
      setIsEditing(false);
      toast({ title: "Post updated" });
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleDownload = async (item: MediaItem) => {
    if (!item.url) return;
    setDownloadingId(item.id);
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `post-${item.id}.${item.type === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRefresh = async () => {
    await fetchPosts();
    toast({ title: "Refreshed", description: `Found ${items.length} posts` });
  };

  const handleItemClick = (item: MediaItem) => {
    setSelectedItem(item);
    setIsEditing(false);
    setEditText(item.textContent || "");
  };

  const filteredItems = items.filter(item => {
    if (activeTab === "video" && item.type !== "video") return false;
    if (activeTab === "image" && item.type !== "image") return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Post History</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.theme_color }}
                    />
                    <span className="truncate max-w-[80px]">{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentFilter)} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-2">
            <Image className="h-4 w-4" />
            Images
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">
              {filteredItems.length} published post{filteredItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <MasonryGrid
              items={filteredItems}
              onItemClick={handleItemClick}
              onDelete={(id) => handleDeleteFromDB(id)}
              onDownload={handleDownload}
              downloadingId={downloadingId}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
          {selectedItem && (
            <div className="flex flex-col">
              {/* Media preview */}
              <div className="relative bg-black aspect-video flex items-center justify-center">
                {selectedItem.type === "video" && selectedItem.url ? (
                  <video
                    src={selectedItem.url}
                    controls
                    autoPlay
                    className="max-h-[50vh] w-full object-contain"
                  />
                ) : selectedItem.url ? (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.title}
                    className="max-h-[50vh] w-full object-contain"
                  />
                ) : null}
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                {/* Platforms & project */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedItem.platforms?.map(platform => {
                      const postUrl = getPlatformPostUrl(platform, selectedItem.externalPostId);
                      if (postUrl) {
                        return (
                          <a
                            key={platform}
                            href={postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-white border-0 capitalize text-xs px-2.5 py-0.5 rounded-full font-semibold cursor-pointer hover:opacity-80 transition-opacity no-underline"
                            style={{ backgroundColor: PLATFORM_COLORS[platform.toLowerCase()] || "#888" }}
                          >
                            {platform}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        );
                      }
                      return (
                        <Badge
                          key={platform}
                          className="text-white border-0 capitalize text-xs"
                          style={{ backgroundColor: PLATFORM_COLORS[platform.toLowerCase()] || "#888" }}
                        >
                          {platform}
                        </Badge>
                      );
                    })}
                    {selectedItem.projectName && (
                      <Badge variant="outline" className="text-xs">{selectedItem.projectName}</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedItem.createdAt.toLocaleDateString()}
                  </span>
                </div>

                {/* Text content */}
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm max-h-40 overflow-y-auto">
                    {selectedItem.textContent || selectedItem.script || "No text content"}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setEditText(selectedItem.textContent || selectedItem.script || "");
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Text
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-orange-500 hover:text-orange-600"
                    onClick={() => handleDeleteFromPlatform(selectedItem.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove from Platform
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDeleteFromDB(selectedItem.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete from History
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostHistoryPage;
