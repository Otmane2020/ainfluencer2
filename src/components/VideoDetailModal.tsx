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
  Pause
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// TikTok icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

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
  onDelete,
}: VideoDetailModalProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [socialCaption, setSocialCaption] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate caption with AI
  const handleGenerateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const contextText = prompt 
        ? `AI-generated video based on: ${prompt}`
        : "AI-generated video content";

      const response = await supabase.functions.invoke("suggest-content", {
        body: {
          contentType: "social_post",
          projectName: title || "AI Video",
          projectDescription: contextText,
        },
      });

      console.log("Generate caption response:", response);

      if (response.data?.suggestion?.content) {
        const content = response.data.suggestion.content;
        const hashtags = response.data.suggestion.hashtags || [];
        const hashtagString = hashtags.length > 0 
          ? "\n\n" + hashtags.map((h: string) => `#${h.replace(/^#/, '')}`).join(" ")
          : "";
        setSocialCaption(`✨ AI Generated Post\n\n${content}${hashtagString}`);
        toast({ title: "Caption generated!" });
      } else {
        // Fallback
        const shortPrompt = prompt && prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
        setSocialCaption(prompt 
          ? `✨ AI Generated Post\n\n${shortPrompt}\n\n#AI #AIVideo #CreativeContent`
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

    setIsPublishing(true);
    try {
      // Use native Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: title || "AI Generated Video",
          text: socialCaption || "Check out this AI-generated video!",
          url: videoUrl,
        });
        toast({ title: "Shared successfully!" });
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(videoUrl);
        toast({ 
          title: "Link copied!", 
          description: "Share API not supported - link copied to clipboard" 
        });
      }
    } catch (error: any) {
      // User cancelled share or error
      if (error.name !== "AbortError") {
        console.error("Share error:", error);
        toast({ title: "Share failed", variant: "destructive" });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const platforms = [
    { id: "instagram", label: "Instagram", icon: Instagram, color: "from-[#833AB4] via-[#E1306C] to-[#F77737]" },
    { id: "facebook", label: "Facebook", icon: Facebook, color: "from-[#1877F2] to-[#0D65D9]" },
    { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "from-[#0A66C2] to-[#004182]" },
    { id: "tiktok", label: "TikTok", icon: TikTokIcon, color: "from-black to-black" },
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
                  {platforms.map((platform) => {
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

            {/* Details Panel */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border">
              <Tabs defaultValue="details" className="h-full">
                <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-border bg-transparent h-10">
                  <TabsTrigger value="details" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="share" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    Share
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="p-4 space-y-4 mt-0">
                  {/* Prompt */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">PROMPT</h4>
                    <p className="text-sm leading-relaxed bg-muted/50 rounded-lg p-3 max-h-40 overflow-auto">
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
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={handleDownload}>
                      <Download className="h-4 w-4" />
                      Download MP4
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={handleCopyLink}>
                      {copiedState ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedState ? "Copied!" : "Copy Link"}
                    </Button>
                    {videoUrl && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        onClick={() => window.open(videoUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in New Tab
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="share" className="p-4 space-y-4 mt-0">
                  {/* Platform Selection */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">PLATFORMS</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {platforms.map((platform) => {
                        const Icon = platform.icon;
                        const isSelected = selectedPlatforms.includes(platform.id);
                        return (
                          <button
                            key={platform.id}
                            onClick={() => togglePlatform(platform.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/10" 
                                : "border-border hover:border-muted-foreground"
                            }`}
                          >
                            <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-xs font-medium">{platform.label}</span>
                            {isSelected && <Check className="h-3 w-3 text-primary ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Caption */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-muted-foreground">CAPTION</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 gap-1 text-primary hover:text-primary/80"
                        onClick={handleGenerateCaption}
                        disabled={isGeneratingCaption}
                      >
                        {isGeneratingCaption ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Generate
                      </Button>
                    </div>
                    <Textarea
                      value={socialCaption}
                      onChange={(e) => setSocialCaption(e.target.value)}
                      placeholder="Write a caption..."
                      className="min-h-[100px] text-sm resize-none"
                    />
                  </div>

                  {/* Publish Button */}
                  <Button 
                    className="w-full gap-2" 
                    onClick={handlePublishNow}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    Share
                  </Button>

                  {/* Quick Share */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Or share directly:</p>
                    <div className="flex gap-2">
                      {platforms.map((platform) => {
                        const Icon = platform.icon;
                        return (
                          <Button
                            key={platform.id}
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleShareToSocial(platform.id)}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
