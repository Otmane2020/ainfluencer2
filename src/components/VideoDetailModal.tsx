import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  X, 
  Download, 
  Volume2, 
  VolumeX, 
  Share2, 
  Copy, 
  Check,
  Clock,
  Calendar,
  Sparkles,
  Instagram,
  Facebook,
  Linkedin,
  Send,
  ExternalLink,
  Loader2,
  Play,
  Pause,
  ChevronDown
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// TikTok icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// YouTube icon
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface Project {
  id: string;
  name: string;
  theme_color: string | null;
}

interface ProjectContext {
  name: string;
  description?: string;
  detected_language?: string;
  ai_context_summary?: string;
  scraped_markdown?: string;
}

interface VideoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  thumbnailUrl?: string;
  title: string;
  prompt?: string;
  duration?: number;
  createdAt?: Date;
  model?: string;
  projectId?: string;
  onDelete?: () => void;
}

export const VideoDetailModal = ({
  isOpen,
  onClose,
  videoUrl,
  thumbnailUrl,
  title,
  prompt,
  duration,
  createdAt,
  model,
  projectId,
  onDelete,
}: VideoDetailModalProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [socialCaption, setSocialCaption] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch projects list when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      if (projectId) {
        setSelectedProjectId(projectId);
        fetchProjectContext(projectId);
      }
    }
  }, [isOpen, projectId]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from("projects")
        .select("id, name, theme_color")
        .order("name");
      if (data) setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchProjectContext = async (id: string) => {
    if (!id) return;
    try {
      const { data } = await supabase
        .from("projects")
        .select("name, description, detected_language, ai_context_summary, scraped_markdown")
        .eq("id", id)
        .single();
      if (data) {
        setProjectContext(data);
      }
    } catch (error) {
      console.error("Error fetching project context:", error);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setProjectSelectorOpen(false);
    fetchProjectContext(project.id);
    toast({ title: `Selected: ${project.name}` });
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Generate caption with AI - uses project language
  const handleGenerateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      // Build rich context from project data
      const name = projectContext?.name || title || "AI Video";
      const language = projectContext?.detected_language || "en";
      
      // Use ai_context_summary or description for better context
      let description = "";
      if (prompt) {
        description += `AI-generated video based on: ${prompt}. `;
      }
      if (projectContext?.ai_context_summary) {
        description += projectContext.ai_context_summary;
      } else if (projectContext?.description) {
        description += projectContext.description;
      }
      // Add scraped content for richer context
      const scrapedContent = projectContext?.scraped_markdown?.substring(0, 800) || "";

      console.log("Generating caption with context:", { name, language, description: description.substring(0, 200) });

      const response = await supabase.functions.invoke("suggest-content", {
        body: {
          contentType: "social_post",
          projectName: name,
          projectDescription: description || "AI-generated video content",
          detectedLanguage: language, // Pass project language
          scrapedContent, // Include scraped content for brand context
        },
      });

      console.log("Generate caption response:", response);

      if (response.data?.suggestion?.content) {
        const content = response.data.suggestion.content;
        const hashtags = response.data.suggestion.hashtags || [];
        const hashtagString = hashtags.length > 0 
          ? "\n\n" + hashtags.map((h: string) => `#${h.replace(/^#/, '')}`).join(" ")
          : "";
        setSocialCaption(`${content}${hashtagString}`);
        toast({ title: "Caption generated!" });
      } else {
        // Fallback
        const shortPrompt = prompt && prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
        setSocialCaption(prompt 
          ? `✨ ${name}\n\n${shortPrompt}\n\n#AI #AIVideo #CreativeContent`
          : `✨ Created with AI\n\n#AI #AIVideo #CreativeContent`);
        toast({ title: "Caption generated (local)" });
      }
    } catch (error) {
      console.error("Error generating caption:", error);
      const shortPrompt = prompt && prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
      setSocialCaption(prompt 
        ? `✨ AI Generated Post\n\n${shortPrompt}\n\n#AI #AIVideo #CreativeContent`
        : `✨ Created with AI\n\n#AI #AIVideo #CreativeContent`);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Auto-play when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isOpen]);

  // Generate caption from prompt
  useEffect(() => {
    if (isOpen && !socialCaption) {
      if (prompt) {
        // Create engaging caption from the AI prompt
        const shortPrompt = prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
        setSocialCaption(`✨ AI Generated Post\n\n${shortPrompt}\n\n#AI #AIVideo #CreativeContent #Generated`);
      } else {
        setSocialCaption(`✨ Created with AI\n\n#AI #AIVideo #CreativeContent`);
      }
    }
  }, [isOpen, prompt]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${title.replace(/\s+/g, "-")}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Download started" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleCopyLink = async () => {
    if (videoUrl) {
      await navigator.clipboard.writeText(videoUrl);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
      toast({ title: "Link copied!" });
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleShareToSocial = async (platform: string) => {
    if (!videoUrl) return;

    const shareText = encodeURIComponent(socialCaption || title);
    const shareUrl = encodeURIComponent(videoUrl);

    switch (platform) {
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`,
          "_blank",
          "width=600,height=400"
        );
        break;
      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
          "_blank",
          "width=600,height=400"
        );
        break;
      case "youtube":
        // YouTube Studio for uploading
        window.open(
          "https://studio.youtube.com/channel/UC/videos/upload",
          "_blank",
          "width=800,height=600"
        );
        toast({
          title: "YouTube Studio",
          description: "Download the video and upload it manually",
        });
        handleDownload();
        break;
      case "instagram":
      case "tiktok":
        toast({
          title: `Share on ${platform === "instagram" ? "Instagram" : "TikTok"}`,
          description: "Download the video then share from the app",
        });
        handleDownload();
        break;
    }
  };

  const handlePublishNow = async () => {
    if (!videoUrl) {
      toast({ title: "No video to share", variant: "destructive" });
      return;
    }

    // Filter to only supported platforms
    const supportedPlatforms = selectedPlatforms.filter(p => 
      ["instagram", "facebook", "youtube", "tiktok"].includes(p)
    );
    
    if (supportedPlatforms.length === 0) {
      toast({ title: "Select at least one platform", variant: "destructive" });
      return;
    }

    if (!selectedProjectId) {
      toast({ title: "Please select a project first", variant: "destructive" });
      setProjectSelectorOpen(true);
      return;
    }

    setIsPublishing(true);
    try {
      // Call the publish-clipmotion edge function (same as cron)
      const { data, error } = await supabase.functions.invoke("publish-clipmotion", {
        body: {
          videoUrl,
          caption: socialCaption || title || "AI Generated Video",
          platforms: supportedPlatforms,
          thumbnailUrl: thumbnailUrl || undefined,
          projectId: selectedProjectId,
        },
      });

      if (error) {
        console.error("Publish error:", error);
        toast({ 
          title: "Publication failed", 
          description: error.message || "Unable to publish to platforms",
          variant: "destructive" 
        });
        return;
      }

      // Check results
      const results = data?.results as Array<{ platform: string; success: boolean; error?: string }> || [];
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        toast({
          title: `Published to ${successful.length} platform(s)!`,
          description: successful.map(r => r.platform).join(", "),
        });
      }

      if (failed.length > 0) {
        console.warn("Some platforms failed:", failed);
        toast({
          title: `${failed.length} platform(s) failed`,
          description: failed.map(r => `${r.platform}: ${r.error}`).join("; "),
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error("Publish error:", error);
      toast({ 
        title: "Publication failed", 
        description: error.message || "Unable to publish",
        variant: "destructive" 
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Platforms that support direct API publishing
  const directPublishPlatforms = [
    { id: "instagram", label: "Instagram", icon: Instagram, color: "from-[#833AB4] via-[#E1306C] to-[#F77737]" },
    { id: "facebook", label: "Facebook", icon: Facebook, color: "from-[#1877F2] to-[#0D65D9]" },
    { id: "youtube", label: "YouTube", icon: YouTubeIcon, color: "from-[#FF0000] to-[#CC0000]" },
    { id: "tiktok", label: "TikTok", icon: TikTokIcon, color: "from-black to-black" },
  ];

  // Platforms for web sharing only (no direct API)
  const webSharePlatforms = [
    { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "from-[#0A66C2] to-[#004182]" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden bg-background border-border rounded-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold truncate max-w-[200px] md:max-w-none">{title}</h2>
            {model && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {model}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {createdAt && (
              <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(createdAt, "MMM d, yyyy", { locale: enUS })}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col md:flex-row">
            {/* Video Section */}
            <div className="flex-1 bg-black relative">
              <div className="aspect-[9/16] md:aspect-video max-h-[60vh] md:max-h-[70vh] mx-auto">
                {videoUrl ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    poster={thumbnailUrl}
                    loop
                    playsInline
                    muted={isMuted}
                    className="h-full w-full object-contain"
                    onClick={handlePlayPause}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    Video not available
                  </div>
                )}
              </div>

              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full bg-white/20 text-white hover:bg-white/30"
                      onClick={handlePlayPause}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/30"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    {duration && (
                      <span className="text-xs text-white/80 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {duration}s
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/30"
                      onClick={handleCopyLink}
                    >
                      {copiedState ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/30"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Social Share Icons Row */}
                <div className="flex items-center justify-center gap-3 pt-3 border-t border-white/20">
                  <span className="text-xs text-white/60">Share:</span>
                  {[...directPublishPlatforms, ...webSharePlatforms].map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <button
                        key={platform.id}
                        onClick={() => handleShareToSocial(platform.id)}
                        className={`h-8 w-8 rounded-full bg-gradient-to-br ${platform.color} flex items-center justify-center hover:scale-110 transition-transform`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Details & Share Panel */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border">
              <ScrollArea className="h-full max-h-[70vh] md:max-h-none">
                <div className="p-4 space-y-4">
                  {/* Prompt */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">PROMPT</h4>
                    <p className="text-sm leading-relaxed bg-muted/50 rounded-lg p-3 max-h-32 overflow-auto">
                      {prompt || "No prompt available"}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium">{duration || 0}s</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="text-sm font-medium">{model || "Sora-2"}</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleDownload}>
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopyLink}>
                      {copiedState ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedState ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  <div className="border-t border-border pt-4">
                    {/* Platform Selection */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">PUBLISH TO</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {directPublishPlatforms.map((platform) => {
                          const Icon = platform.icon;
                          const isSelected = selectedPlatforms.includes(platform.id);
                          return (
                            <button
                              key={platform.id}
                              onClick={() => togglePlatform(platform.id)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                isSelected 
                                  ? "border-primary bg-primary/10" 
                                  : "border-border hover:border-muted-foreground"
                              }`}
                            >
                              <div className={`h-7 w-7 rounded-md bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                                <Icon className="h-3.5 w-3.5 text-white" />
                              </div>
                              <span className="text-[10px] font-medium">{platform.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Caption */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-muted-foreground">CAPTION</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 gap-1 text-primary hover:text-primary/80 text-xs"
                          onClick={handleGenerateCaption}
                          disabled={isGeneratingCaption}
                        >
                          {isGeneratingCaption ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Generate
                        </Button>
                      </div>
                      <Textarea
                        value={socialCaption}
                        onChange={(e) => setSocialCaption(e.target.value)}
                        placeholder="Write a caption..."
                        className="min-h-[80px] text-sm resize-none"
                      />
                    </div>

                    {/* Project Selector */}
                    <div className="mt-4 space-y-2">
                      <label className="text-xs text-muted-foreground">Project:</label>
                      <Popover open={projectSelectorOpen} onOpenChange={setProjectSelectorOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-between"
                          >
                            {selectedProject ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: selectedProject.theme_color || "#8B5CF6" }}
                                />
                                <span className="truncate text-xs">{selectedProject.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Select project...</span>
                            )}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-0" align="start">
                          <ScrollArea className="h-[180px]">
                            <div className="p-2 space-y-1">
                              {projects.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  No projects found
                                </p>
                              ) : (
                                projects.map((project) => (
                                  <Button
                                    key={project.id}
                                    variant={selectedProjectId === project.id ? "secondary" : "ghost"}
                                    size="sm"
                                    className="w-full justify-start gap-2"
                                    onClick={() => handleSelectProject(project)}
                                  >
                                    <div
                                      className="h-3 w-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: project.theme_color || "#8B5CF6" }}
                                    />
                                    <span className="truncate text-xs">{project.name}</span>
                                  </Button>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Publish Button */}
                    <Button 
                      className="w-full gap-2 mt-4" 
                      onClick={handlePublishNow}
                      disabled={isPublishing || selectedPlatforms.length === 0 || !selectedProjectId}
                    >
                      {isPublishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isPublishing 
                        ? "Publishing..." 
                        : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`
                      }
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
