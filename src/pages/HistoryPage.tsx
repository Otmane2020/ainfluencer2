import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Video, Image, Loader2, Download, Trash2, ExternalLink, Camera, Check, X, Instagram, Facebook, Linkedin, Sparkles } from "lucide-react";
import { VideoHistory, VideoHistoryItem } from "@/components/VideoHistory";
import { useStoredVideos } from "@/hooks/useStoredVideos";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";
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

interface ImagePost {
  id: string;
  name: string;
  url: string | null;
  createdAt: Date;
  status: string;
  projectId: string | null;
  projectName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  platforms: string[];
  isProductShot: boolean;
  source: "scheduled_post" | "storage";
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "videos";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Common state
  const [projects, setProjects] = useState<Project[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  
  // Video state
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const { fetchStoredVideos, isLoading: isLoadingVideos } = useStoredVideos();
  const { tasks, getPendingTasks, updateTask } = useGenerationTasks();
  
  // Image state
  const [images, setImages] = useState<ImagePost[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  const { toast } = useToast();
  const { user } = useAuth();

  const activeTasks = getPendingTasks();
  const completedTasks = tasks.filter(t => t.status === "completed" && t.videoUrl);

  // Sync tab with URL
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  // Fetch projects and campaigns
  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchCampaigns();
      loadVideos();
      fetchImages();
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
              loadVideos();
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
  }, [activeTasks, updateTask]);

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

  // Video functions
  const loadVideos = async () => {
    const storedVideos = await fetchStoredVideos();
    if (storedVideos.length > 0) {
      setVideoHistory(storedVideos);
    }
  };

  const handleRefreshVideos = async () => {
    const storedVideos = await fetchStoredVideos();
    setVideoHistory(storedVideos);
    toast({
      title: "Refreshed",
      description: `Found ${storedVideos.length} videos`,
    });
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await supabase.from("generations").delete().eq("id", id);
      
      const video = videoHistory.find(v => v.id === id);
      if (video?.videoUrl?.includes("supabase.co/storage")) {
        const urlParts = video.videoUrl.split("/media/");
        if (urlParts[1]) {
          await supabase.storage.from("media").remove([urlParts[1]]);
        }
      }

      setVideoHistory((prev) => prev.filter((v) => v.id !== id));
      toast({ title: "Video deleted" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handlePlayVideo = (video: VideoHistoryItem) => {
    console.log("Playing video:", video.id);
  };

  const handleThumbnailGenerated = (id: string, thumbnailUrl: string) => {
    setVideoHistory((prev) =>
      prev.map((v) => (v.id === id ? { ...v, thumbnailUrl } : v))
    );
  };

  const handleContinueVideo = (videoUrl: string) => {
    navigate(`/videos?continueFrom=${encodeURIComponent(videoUrl)}`);
  };

  // Image functions
  const fetchImages = async () => {
    if (!user) return;
    setIsLoadingImages(true);
    try {
      const allImages: ImagePost[] = [];

      const { data: scheduledPosts } = await supabase
        .from("scheduled_posts")
        .select(`
          id, content_type, status, media_url, platforms, created_at,
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
          allImages.push({
            id: post.id,
            name: `Image ${new Date(post.created_at).toLocaleDateString()}`,
            url: post.media_url,
            createdAt: new Date(post.created_at),
            status: post.status || "draft",
            projectId: post.project_id,
            projectName: (post.projects as any)?.name || null,
            campaignId: post.campaign_id,
            campaignName: (post.campaigns as any)?.name || null,
            platforms: post.platforms || [],
            isProductShot: false,
            source: "scheduled_post",
          });
        }
      }

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
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(`images/${file.name}`);
          const existsInPosts = allImages.some(img => img.url === urlData.publicUrl);
          
          if (!existsInPosts) {
            allImages.push({
              id: file.id || `img-${file.name}`,
              name: file.name,
              url: urlData.publicUrl,
              createdAt: new Date(file.created_at || Date.now()),
              status: "generated",
              projectId: null,
              projectName: null,
              campaignId: null,
              campaignName: null,
              platforms: [],
              isProductShot: false,
              source: "storage",
            });
          }
        }
      }

      if (productShotsResult.data) {
        for (const file of productShotsResult.data.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(`product-shots/${file.name}`);
          
          allImages.push({
            id: file.id || `ps-${file.name}`,
            name: file.name,
            url: urlData.publicUrl,
            createdAt: new Date(file.created_at || Date.now()),
            status: "generated",
            projectId: null,
            projectName: null,
            campaignId: null,
            campaignName: null,
            platforms: [],
            isProductShot: true,
            source: "storage",
          });
        }
      }

      allImages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setImages(allImages);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleDownloadImage = async (image: ImagePost) => {
    if (!image.url) return;
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleDeleteImage = async (image: ImagePost) => {
    try {
      if (image.source === "scheduled_post") {
        await supabase.from("scheduled_posts").delete().eq("id", image.id);
      } else {
        const folder = image.isProductShot ? "product-shots" : "images";
        await supabase.storage.from("media").remove([`${folder}/${image.name}`]);
      }
      setImages(prev => prev.filter(i => i.id !== image.id));
      toast({ title: "Image deleted" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // Filters
  const filteredCampaigns = selectedProject === "all" 
    ? campaigns 
    : campaigns.filter(c => c.project_id === selectedProject);

  const filteredVideos = selectedCampaign === "all" 
    ? videoHistory 
    : videoHistory.filter(v => v.campaignId === selectedCampaign);

  const filteredImages = images.filter(image => {
    if (selectedProject !== "all" && image.projectId !== selectedProject) return false;
    if (selectedCampaign !== "all" && image.campaignId !== selectedCampaign) return false;
    if (selectedStatus !== "all" && image.status !== selectedStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"><Check className="h-3 w-3 mr-0.5" />Published</Badge>;
      case "generated":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Generated</Badge>;
      case "scheduled":
        return <Badge variant="secondary" className="text-[10px]">Scheduled</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-[10px]">Draft</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-[10px]"><X className="h-3 w-3 mr-0.5" />Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram": return <Instagram className="h-3 w-3" />;
      case "facebook": return <Facebook className="h-3 w-3" />;
      case "linkedin": return <Linkedin className="h-3 w-3" />;
      default: return null;
    }
  };

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
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[300px] grid-cols-2">
          <TabsTrigger value="videos" className="gap-2">
            <Video className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-2">
            <Image className="h-4 w-4" />
            Images
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">
              {filteredVideos.length} video{filteredVideos.length !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshVideos}
              disabled={isLoadingVideos}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingVideos ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {filteredVideos.length === 0 && activeTasks.length === 0 ? (
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
            <VideoHistory
              videos={filteredVideos}
              generatingTasks={activeTasks.map(task => ({
                id: task.id,
                taskId: task.taskId,
                status: task.status,
                progress: task.progress,
                model: task.model,
                duration: task.duration,
                script: task.script,
              }))}
              onDelete={handleDeleteVideo}
              onPlay={handlePlayVideo}
              onThumbnailGenerated={handleThumbnailGenerated}
              onContinueVideo={handleContinueVideo}
            />
          )}
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {filteredImages.length} image{filteredImages.length !== 1 ? "s" : ""}
              </span>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[100px] h-7 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchImages}
              disabled={isLoadingImages}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingImages ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {isLoadingImages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredImages.length === 0 ? (
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-card"
                >
                  {image.url ? (
                    <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="absolute top-1 left-1 flex flex-wrap gap-1 max-w-[90%]">
                    {image.isProductShot && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
                        <Camera className="h-3 w-3" />Shot
                      </Badge>
                    )}
                    {getStatusBadge(image.status)}
                  </div>

                  {image.platforms.length > 0 && (
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {image.platforms.map(p => (
                        <div key={p} className="bg-black/60 rounded p-0.5 text-white">
                          {getPlatformIcon(p)}
                        </div>
                      ))}
                    </div>
                  )}

                  {(image.projectName || image.campaignName) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
                      {image.campaignName && (
                        <p className="text-[10px] text-white/90 truncate">{image.campaignName}</p>
                      )}
                      {image.projectName && (
                        <p className="text-[9px] text-white/60 truncate">{image.projectName.slice(0, 30)}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => handleDownloadImage(image)} disabled={!image.url}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {image.url && (
                      <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => window.open(image.url!, "_blank")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteImage(image)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryPage;
