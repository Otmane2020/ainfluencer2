import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Image, Download, Trash2, ExternalLink, Loader2, Camera, Filter, Check, X, Instagram, Facebook, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

interface Project {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  project_id: string;
}

const ImageHistoryPage = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<ImagePost[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchCampaigns();
      fetchImages();
    }
  }, [user]);

  // Reset campaign filter when project changes
  useEffect(() => {
    setSelectedCampaign("all");
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");
    if (data) setProjects(data);
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, project_id")
      .order("name");
    if (data) setCampaigns(data);
  };

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const allImages: ImagePost[] = [];

      // 1. Fetch image posts from scheduled_posts
      const { data: scheduledPosts } = await supabase
        .from("scheduled_posts")
        .select(`
          id, content_type, status, media_url, platforms, created_at,
          project_id, campaign_id,
          projects!scheduled_posts_project_id_fkey(name),
          campaigns!scheduled_posts_campaign_id_fkey(name)
        `)
        .eq("content_type", "image")
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

      // 2. Fetch from storage (product shots and standalone images)
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

      // Process regular images from storage (if not already in scheduled_posts)
      // Note: Storage images are "generated" not "published" - they haven't been posted to social media
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
              status: "generated", // Not published to social media
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

      // Process product shots
      if (productShotsResult.data) {
        for (const file of productShotsResult.data.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(`product-shots/${file.name}`);
          
          allImages.push({
            id: file.id || `ps-${file.name}`,
            name: file.name,
            url: urlData.publicUrl,
            createdAt: new Date(file.created_at || Date.now()),
            status: "generated", // Not published to social media
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

      // Process product shots
      if (productShotsResult.data) {
        for (const file of productShotsResult.data.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(`product-shots/${file.name}`);
          
          allImages.push({
            id: file.id || `ps-${file.name}`,
            name: file.name,
            url: urlData.publicUrl,
            createdAt: new Date(file.created_at || Date.now()),
            status: "published",
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

      // Sort all by creation date
      allImages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setImages(allImages);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered campaigns based on selected project
  const filteredCampaigns = selectedProject === "all" 
    ? campaigns 
    : campaigns.filter(c => c.project_id === selectedProject);

  // Apply filters
  const filteredImages = images.filter(image => {
    if (selectedProject !== "all" && image.projectId !== selectedProject) return false;
    if (selectedCampaign !== "all" && image.campaignId !== selectedCampaign) return false;
    if (selectedStatus !== "all" && image.status !== selectedStatus) return false;
    if (selectedPlatform !== "all" && !image.platforms.includes(selectedPlatform)) return false;
    return true;
  });

  const handleDownload = async (image: ImagePost) => {
    if (!image.url) {
      toast({ title: "No image available", description: "Image not yet generated", variant: "destructive" });
      return;
    }
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
      toast({ title: "Download started", description: image.name });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleDelete = async (image: ImagePost) => {
    try {
      if (image.source === "scheduled_post") {
        const { error } = await supabase.from("scheduled_posts").delete().eq("id", image.id);
        if (error) throw error;
      } else {
        const folder = image.isProductShot ? "product-shots" : "images";
        const { error } = await supabase.storage.from("media").remove([`${folder}/${image.name}`]);
        if (error) throw error;
      }
      setImages(prev => prev.filter(i => i.id !== image.id));
      toast({ title: "Image deleted" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

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
        <h1 className="font-display text-xl font-bold">Images</h1>
        <Button variant="ghost" size="icon" onClick={fetchImages} disabled={isLoading} className="h-9 w-9">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name.slice(0, 30)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {filteredCampaigns.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name.slice(0, 25)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-xs text-muted-foreground">
        {filteredImages.length} image{filteredImages.length !== 1 ? "s" : ""} found
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Image className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No images found</p>
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
              
              {/* Labels */}
              <div className="absolute top-1 left-1 flex flex-wrap gap-1 max-w-[90%]">
                {image.isProductShot && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
                    <Camera className="h-3 w-3" />Shot
                  </Badge>
                )}
                {getStatusBadge(image.status)}
              </div>

              {/* Platform icons */}
              {image.platforms.length > 0 && (
                <div className="absolute top-1 right-1 flex gap-0.5">
                  {image.platforms.map(p => (
                    <div key={p} className="bg-black/60 rounded p-0.5 text-white">
                      {getPlatformIcon(p)}
                    </div>
                  ))}
                </div>
              )}

              {/* Project/Campaign label */}
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
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => handleDownload(image)} disabled={!image.url}>
                  <Download className="h-4 w-4" />
                </Button>
                {image.url && (
                  <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => window.open(image.url!, "_blank")}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(image)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageHistoryPage;
