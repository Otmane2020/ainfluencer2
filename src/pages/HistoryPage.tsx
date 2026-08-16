import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Video, Image, Loader2, LayoutGrid } from "lucide-react";
import { MasonryGrid } from "@/components/history/MasonryGrid";
import { MediaItem } from "@/components/history/MediaCard";
import { ImageDetailModal } from "@/components/history/ImageDetailModal";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { useStoredVideos } from "@/hooks/useStoredVideos";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";
import { useVideoThumbnail } from "@/hooks/useVideoThumbnail";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

interface Campaign {
  id: string;
  name: string;
  project_id: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Common state
  const [projects, setProjects] = useState<Project[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  
  // Media state
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
  
  // Modal state
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  
  const { fetchStoredVideos, isLoading: isLoadingVideos } = useStoredVideos();
  const { tasks, getPendingTasks, updateTask } = useGenerationTasks();
  const { generateThumbnail } = useVideoThumbnail();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const processedVideosRef = useRef<Set<string>>(new Set());
  const activeTasks = getPendingTasks();

  // Sync tab with URL
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Fetch projects and campaigns
  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchCampaigns();
      loadAllMedia();
    }
  }, [user]);

  // Reset campaign when project changes
  useEffect(() => {
    setSelectedCampaign("all");
  }, [selectedProject]);

  // Poll for video tasks
  useEffect(() => {
    if (activeTasks.length === 0) return;

    const pollInterval = setInterval(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return;

      for (const task of activeTasks) {
        try {
          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-sora?action=status&taskId=${task.taskId}`,
            {
              method: "GET",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (statusResponse.ok) {
            const status = await statusResponse.json();
            updateTask(task.taskId, {
              status: status.status,
              progress: status.progress || 0,
              finishTime: status.finishTime,
              videoUrl: status.videoUrl,
            });

            if (status.status === "completed") {
              loadAllMedia();
              toast({
                title: "Video ready!",
                description: "Your video has been generated",
              });
            }
          }
        } catch (error) {
          console.error("Status check error:", error);
        }
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [activeTasks, updateTask, toast]);

  // Auto-generate thumbnails for videos
  useEffect(() => {
    const processVideos = async () => {
      const videos = allMedia.filter(m => m.type === "video");
      for (const video of videos) {
        if (
          processedVideosRef.current.has(video.id) ||
          video.thumbnailUrl ||
          !video.url ||
          generatingThumbnails.has(video.id)
        ) {
          continue;
        }
        
        if (!video.url.includes("supabase.co")) {
          processedVideosRef.current.add(video.id);
          continue;
        }
        
        processedVideosRef.current.add(video.id);
        setGeneratingThumbnails((prev) => new Set(prev).add(video.id));
        
        try {
          const result = await generateThumbnail(video.url);
          if (result) {
            setAllMedia(prev => prev.map(m => 
              m.id === video.id ? { ...m, thumbnailUrl: result.thumbnailUrl } : m
            ));
          }
        } finally {
          setGeneratingThumbnails((prev) => {
            const updated = new Set(prev);
            updated.delete(video.id);
            return updated;
          });
        }
      }
    };
    
    processVideos();
  }, [allMedia.length, generateThumbnail, generatingThumbnails]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .eq("user_id", user.id)
      .order("name");
    if (data) setProjects(data);
  };

  const fetchCampaigns = async () => {
    if (!user) return;
    let query = supabase
      .from("campaigns")
      .select("id, name, project_id")
      .eq("user_id", user.id)
      .order("name");
    
    if (selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }
    
    const { data } = await query;
    if (data) setCampaigns(data);
  };

  const CACHE_KEY = `history_media_${user?.id}`;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const loadAllMedia = async (forceRefresh = false) => {
    if (!user) return;

    // Check cache first
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            const restored = data.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) }));
            setAllMedia(restored);
            return;
          }
        }
      } catch {}
    }

    setIsLoading(true);
    
    try {
      const media: MediaItem[] = [];
      
      // Fetch videos
      const storedVideos = await fetchStoredVideos();
      for (const video of storedVideos) {
        media.push({
          id: video.id,
          type: "video",
          title: video.title,
          url: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
          createdAt: video.createdAt,
          status: video.status,
          duration: video.duration,
          script: video.script,
          campaignName: undefined,
          aspectRatio: "vertical",
          model: video.voice && video.voice !== "Unknown" ? video.voice : undefined,
          provider: (video as any).provider || undefined,
        });
      }
      
      // Fetch image generations from DB (for model info and prompt)
      const { data: imageGenerations } = await supabase
        .from("generations")
        .select("id, media_url, model, created_at, prompt, project_id, campaign_id, thumbnail_url")
        .eq("type", "image")
        .eq("user_id", user.id)
        .in("status", ["completed", "ready"])
        .order("created_at", { ascending: false })
        .limit(200);

      // Build model and prompt lookups by media_url
      const modelByUrl = new Map<string, string>();
      const promptByUrl = new Map<string, string>();
      if (imageGenerations) {
        for (const gen of imageGenerations) {
          if (gen.media_url) {
            if (gen.model) modelByUrl.set(gen.media_url, gen.model);
            if (gen.prompt) promptByUrl.set(gen.media_url, gen.prompt);
          }
        }
      }

      // Fetch images from scheduled_posts
      const { data: scheduledPosts } = await supabase
        .from("scheduled_posts")
        .select(`
          id, content_type, status, media_url, platforms, created_at, ai_prompt,
          project_id, campaign_id,
          projects!scheduled_posts_project_id_fkey(name),
          campaigns!scheduled_posts_campaign_id_fkey(name)
        `)
        .eq("content_type", "image")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (scheduledPosts) {
        for (const post of scheduledPosts) {
          if (!post.media_url) continue;
          
          media.push({
            id: post.id,
            type: "image",
            title: `Image ${new Date(post.created_at).toLocaleDateString()}`,
            url: post.media_url,
            createdAt: new Date(post.created_at),
            status: post.status || "draft",
            projectId: post.project_id,
            projectName: (post.projects as any)?.name,
            campaignId: post.campaign_id || undefined,
            campaignName: (post.campaigns as any)?.name,
            // Use the real image generation prompt (from generations table), not the social post caption
            script: promptByUrl.get(post.media_url) || post.ai_prompt || undefined,
            aspectRatio: "square",
            model: modelByUrl.get(post.media_url) || undefined,
          });
        }
      }

      // Also add standalone image generations not in scheduled_posts
      if (imageGenerations) {
        const existingUrls = new Set(media.map(m => m.url));
        for (const gen of imageGenerations) {
          if (!gen.media_url || existingUrls.has(gen.media_url)) continue;
          media.push({
            id: gen.id,
            type: "image",
            title: `Image ${new Date(gen.created_at).toLocaleDateString()}`,
            url: gen.media_url,
            thumbnailUrl: gen.thumbnail_url || undefined,
            createdAt: new Date(gen.created_at),
            status: "generated",
            projectId: gen.project_id || undefined,
            campaignId: gen.campaign_id || undefined,
            script: gen.prompt || undefined,
            aspectRatio: "square",
            model: gen.model || undefined,
          });
          existingUrls.add(gen.media_url);
        }
      }

      // Fetch images from storage
      const [imagesResult, productShotsResult] = await Promise.all([
        supabase.storage.from("media").list("images", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        }),
        supabase.storage.from("media").list("product-shots", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        }),
      ]);

      if (imagesResult.data) {
        for (const file of imagesResult.data.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
          const storagePath = `images/${file.name}`;
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(storagePath);
          const existsInPosts = media.some(m => m.url === urlData.publicUrl);
          
          if (!existsInPosts) {
            media.push({
              id: file.id || `img-${file.name}`,
              type: "image",
              title: file.name,
              url: urlData.publicUrl,
              createdAt: new Date(file.created_at || Date.now()),
              status: "generated",
              storagePath,
              aspectRatio: "square",
            });
          }
        }
      }

      if (productShotsResult.data) {
        for (const file of productShotsResult.data.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
          const storagePath = `product-shots/${file.name}`;
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(storagePath);
          
          media.push({
            id: file.id || `ps-${file.name}`,
            type: "image",
            title: file.name,
            url: urlData.publicUrl,
            createdAt: new Date(file.created_at || Date.now()),
            status: "generated",
            isProductShot: true,
            storagePath,
            aspectRatio: "square",
          });
        }
      }

      // Sort by date
      media.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setAllMedia(media);

      // Save to cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: media, timestamp: Date.now() }));
      } catch {}
    } catch (error) {
      console.error("Error loading media:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    sessionStorage.removeItem(CACHE_KEY);
    await loadAllMedia(true);
    toast({
      title: "Refreshed",
      description: `Found ${allMedia.length} items`,
    });
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
      a.download = `${item.title.replace(/\s+/g, "-")}-${item.id}.${item.type === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string, type: "video" | "image") => {
    try {
      const item = allMedia.find(m => m.id === id);
      
      if (type === "video") {
        // Delete from generations table
        await supabase.from("generations").delete().eq("id", id);
        // Also delete from storage if applicable
        if (item?.url?.includes("supabase.co/storage")) {
          const urlParts = item.url.split("/media/");
          if (urlParts[1]) {
            await supabase.storage.from("media").remove([decodeURIComponent(urlParts[1])]);
          }
        }
      } else {
        // For images, check if it's from scheduled_posts or storage
        if (item?.storagePath) {
          // Delete directly from storage using the stored path
          const { error } = await supabase.storage.from("media").remove([item.storagePath]);
          if (error) {
            console.error("Storage delete error:", error);
            throw error;
          }
        } else if (item?.projectId || id.match(/^[0-9a-f-]{36}$/i)) {
          // Has a project ID or looks like a UUID - it's from scheduled_posts
          await supabase.from("scheduled_posts").delete().eq("id", id);
        }
      }
      
      setAllMedia(prev => prev.filter(m => m.id !== id));
      setSelectedVideo(null);
      setSelectedImage(null);
      toast({ title: "Deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleItemClick = (item: MediaItem) => {
    if (item.type === "video") {
      setSelectedVideo(item);
    } else {
      setSelectedImage(item);
    }
  };

  // Filters
  const filteredCampaigns = selectedProject === "all" 
    ? campaigns 
    : campaigns.filter(c => c.project_id === selectedProject);

  const filteredMedia = allMedia.filter(item => {
    // Tab filter
    if (activeTab === "videos" && item.type !== "video") return false;
    if (activeTab === "images" && item.type !== "image") return false;
    
    // Project/campaign filter would need to be enhanced with campaign data on videos
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">History</h1>
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
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.theme_color }}
                    />
                    <span className="truncate max-w-[80px]">{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All Campaigns</SelectItem>
              {filteredCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <span className="truncate max-w-[100px]">{campaign.name}</span>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Video className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-2">
            <Image className="h-4 w-4" />
            Images
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">
              {filteredMedia.length} item{filteredMedia.length !== 1 ? "s" : ""}
            </span>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <MasonryGrid
              items={filteredMedia}
              generatingTasks={activeTasks.map(task => ({
                id: task.id,
                taskId: task.taskId,
                status: task.status,
                progress: task.progress,
                model: task.model,
                duration: task.duration,
                script: task.script,
              }))}
              onItemClick={handleItemClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              downloadingId={downloadingId}
              generatingThumbnails={generatingThumbnails}
            />
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">
              {filteredMedia.length} video{filteredMedia.length !== 1 ? "s" : ""}
            </span>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No videos yet</p>
              <Button size="sm" onClick={() => navigate("/videos")}>
                Create Video
              </Button>
            </div>
          ) : (
            <MasonryGrid
              items={filteredMedia}
              generatingTasks={activeTasks.map(task => ({
                id: task.id,
                taskId: task.taskId,
                status: task.status,
                progress: task.progress,
                model: task.model,
                duration: task.duration,
                script: task.script,
              }))}
              onItemClick={handleItemClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              downloadingId={downloadingId}
              generatingThumbnails={generatingThumbnails}
            />
          )}
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">
              {filteredMedia.length} image{filteredMedia.length !== 1 ? "s" : ""}
            </span>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Image className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No images found</p>
              <Button size="sm" onClick={() => navigate("/images")}>
                Create Image
              </Button>
            </div>
          ) : (
            <MasonryGrid
              items={filteredMedia}
              onItemClick={handleItemClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              downloadingId={downloadingId}
              generatingThumbnails={generatingThumbnails}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Video Detail Modal */}
      <VideoDetailModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.url}
        thumbnailUrl={selectedVideo?.thumbnailUrl}
        title={selectedVideo?.title || ""}
        prompt={selectedVideo?.script}
        duration={selectedVideo?.duration}
        createdAt={selectedVideo?.createdAt}
        model={selectedVideo?.model}
        provider={selectedVideo?.provider}
        projectId={selectedVideo?.projectId}
        onDelete={() => {
          if (selectedVideo) {
            handleDelete(selectedVideo.id, "video");
          }
        }}
      />

      {/* Image Detail Modal */}
      <ImageDetailModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url}
        title={selectedImage?.title}
        prompt={selectedImage?.script}
        createdAt={selectedImage?.createdAt}
        projectId={selectedImage?.projectId}
        projectName={selectedImage?.projectName}
        campaignId={selectedImage?.campaignId}
        campaignName={selectedImage?.campaignName}
        isProductShot={selectedImage?.isProductShot}
        model={selectedImage?.model}
        provider={selectedImage?.provider}
        onDelete={() => {
          if (selectedImage) {
            handleDelete(selectedImage.id, "image");
          }
        }}
      />
    </div>
  );
};

export default HistoryPage;
