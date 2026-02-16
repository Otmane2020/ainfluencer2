import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Link2,
  Share2,
  ExternalLink,
  Loader2,
  MessageCircle,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { openPopupOrRedirect } from "@/lib/openPopupOrRedirect";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// Twitter/X icon component
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface Project {
  id: string;
  name: string;
  theme_color: string | null;
}

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content?: {
    text?: string;
    mediaUrl?: string;
    type?: "video" | "image" | "text";
  };
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  shareUrl?: (text: string, url?: string) => string;
  directPost?: boolean;
}

const platforms: SocialPlatform[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
    directPost: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    gradient: "from-[#1877F2] to-[#0D65D9]",
    directPost: true,
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: TwitterIcon,
    gradient: "from-[#000000] to-[#333333]",
    shareUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    gradient: "from-[#0A66C2] to-[#004182]",
    directPost: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: TikTokIcon,
    gradient: "from-[#000000] via-[#25F4EE] to-[#FE2C55]",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: ExternalLink,
    gradient: "from-[#FF0000] to-[#CC0000]",
    shareUrl: () => `https://studio.youtube.com/channel/UC/videos/upload`,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    gradient: "from-[#25D366] to-[#128C7E]",
    shareUrl: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
];

export const SocialShareModal = ({ isOpen, onClose, content }: SocialShareModalProps) => {
  const [shareText, setShareText] = useState(content?.text || "");
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setShareText(content?.text || "");
    }
  }, [isOpen, content?.text]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .order("name");
    if (data && data.length > 0) {
      setProjects(data);
      if (!selectedProject) {
        setSelectedProject(data[0]);
      }
    }
  };

  // Reset text when content changes - using useEffect for proper behavior

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Unable to copy text",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    if (!content?.mediaUrl) return;
    
    try {
      await navigator.clipboard.writeText(content.mediaUrl);
      toast({
        title: "Copied!",
        description: "Media link copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Unable to copy link",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!content?.mediaUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch(content.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clipmotion-${content.type || "content"}-${Date.now()}.${content.type === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded!",
        description: "File saved to your device",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Unable to download file",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDirectPost = async (platformIds: string[]) => {
    if (!content?.mediaUrl) {
      toast({
        title: "No media to post",
        description: "Please add an image or video to post",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject) {
      toast({
        title: "Please select a project",
        description: "Select a project before posting",
        variant: "destructive",
      });
      setProjectSelectorOpen(true);
      return;
    }

    setIsPublishing(true);
    try {
      const isVideo = content.type === "video";
      
      if (isVideo) {
        // Use publish-clipmotion for videos
        const { data, error } = await supabase.functions.invoke("publish-clipmotion", {
          body: {
            videoUrl: content.mediaUrl,
            caption: shareText,
            platforms: platformIds,
            projectId: selectedProject.id,
          },
        });

        if (error) throw error;

        const successPlatforms = data?.results?.filter((r: any) => r.success).map((r: any) => r.platform) || [];
        
        if (successPlatforms.length > 0) {
          toast({
            title: "Posted successfully!",
            description: `Published to ${successPlatforms.join(", ")}`,
          });
        } else {
          throw new Error(data?.results?.[0]?.error || "Failed to post");
        }
      } else {
        // Use publish-image for images
        const { data, error } = await supabase.functions.invoke("publish-image", {
          body: {
            imageUrl: content.mediaUrl,
            caption: shareText,
            platforms: platformIds,
            projectId: selectedProject.id,
          },
        });

        if (error) throw error;

        const successPlatforms = data?.results?.filter((r: any) => r.success).map((r: any) => r.platform) || [];
        
        if (successPlatforms.length > 0) {
          toast({
            title: "Posted successfully!",
            description: `Published to ${successPlatforms.join(", ")}`,
          });
        } else {
          throw new Error(data?.results?.[0]?.error || "Failed to post");
        }
      }
    } catch (error: any) {
      console.error("Post error:", error);
      toast({
        title: "Error posting",
        description: error.message || "Failed to publish. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleShare = (platform: SocialPlatform) => {
    if (platform.directPost && content?.mediaUrl) {
      // For Instagram/Facebook with media, use direct posting
      handleDirectPost([platform.id]);
    } else if (platform.shareUrl) {
      const url = platform.shareUrl(shareText, content?.mediaUrl);

      // Manual share-link workflow for platforms that don't reliably accept direct media URLs.
      // - Copy caption (+ media link)
      // - Download media (if present)
      // - Open platform composer/upload with popup fallback redirect
      const isManual = ["linkedin", "instagram", "facebook", "tiktok", "youtube"].includes(platform.id);
      if (isManual) {
        void navigator.clipboard.writeText(
          content?.mediaUrl ? `${shareText}\n\n${content.mediaUrl}` : shareText
        );
        if (content?.mediaUrl) void handleDownload();
        openPopupOrRedirect(url, "width=900,height=700");
        toast({
          title: `${platform.name} share`,
          description: content?.mediaUrl
            ? "Caption + link copied. Download starts so you can upload in the platform."
            : "Caption copied."
        });
        return;
      }

      openPopupOrRedirect(url, "width=600,height=400");
    } else {
      // For platforms without web share (TikTok without media)
      handleCopyText();
      toast({
        title: `Share on ${platform.name}`,
        description: "Content copied! Open the app and paste to share.",
      });
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyText();
      return;
    }

    try {
      await navigator.share({
        title: "ClipMotion Content",
        text: shareText,
        url: content?.mediaUrl,
      });
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== "AbortError") {
        console.error("Share error:", error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Media Preview */}
          {content?.mediaUrl && (
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
              {content.type === "video" ? (
                <video
                  src={content.mediaUrl}
                  className="w-full h-full object-contain"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={content.mediaUrl}
                  alt="Content preview"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          )}

          {/* Editable Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Caption</label>
            <Textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              placeholder="Add a caption for your post..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyText}
                className="text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Text
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Project Selector for Direct Posting */}
          {content?.mediaUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Post as project</label>
              <Popover open={projectSelectorOpen} onOpenChange={setProjectSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {selectedProject && (
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: selectedProject.theme_color || "#8B5CF6" }}
                        />
                      )}
                      <span className="truncate">
                        {selectedProject?.name || "Select project"}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                      {projects.map((project) => (
                        <Button
                          key={project.id}
                          variant={selectedProject?.id === project.id ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            setSelectedProject(project);
                            setProjectSelectorOpen(false);
                          }}
                        >
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: project.theme_color || "#8B5CF6" }}
                          />
                          <span className="truncate">{project.name}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Direct Post to Instagram/Facebook */}
          {content?.mediaUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Post directly
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleDirectPost(["instagram", "facebook"])}
                  disabled={isPublishing || !selectedProject}
                  className="bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#1877F2] text-white hover:opacity-90"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <>
                      <Instagram className="h-4 w-4 mr-1" />
                      <Facebook className="h-4 w-4 mr-2" />
                    </>
                  )}
                  Post Both
                </Button>
                <Button
                  onClick={() => handleDirectPost(["instagram"])}
                  disabled={isPublishing || !selectedProject}
                  className="bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white hover:opacity-90"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Instagram className="h-4 w-4 mr-2" />
                  )}
                  Instagram
                </Button>
              </div>
            </div>
          )}

          {/* Social Platforms Grid */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share via</label>
            <div className="grid grid-cols-3 gap-2">
              {platforms.map((platform) => (
                <motion.button
                  key={platform.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleShare(platform)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br ${platform.gradient} text-white transition-all hover:shadow-lg`}
                >
                  <platform.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{platform.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Additional Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {content?.mediaUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex-1"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-1"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download
                </Button>
              </>
            )}
          </div>

          {/* Native Share Button (Mobile) */}
          {"share" in navigator && (
            <Button
              onClick={handleNativeShare}
              className="w-full gradient-primary"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Share via Device
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
