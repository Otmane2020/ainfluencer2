import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Trash2,
  X,
  Share2,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Film,
  Loader2,
  Image as ImageIcon,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FaFacebook, FaLinkedin, FaInstagram, FaTiktok } from "react-icons/fa";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { openPopupOrRedirect } from "@/lib/openPopupOrRedirect";

interface ProjectContext {
  name: string;
  description?: string;
  detected_language?: string;
  ai_context_summary?: string;
  scraped_markdown?: string;
}

interface ImageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
  prompt?: string;
  createdAt?: Date;
  projectId?: string;
  projectName?: string;
  campaignId?: string;
  campaignName?: string;
  isProductShot?: boolean;
  model?: string;
  onDelete?: () => void;
}

// Expandable prompt component with See more/Reduce toggle
const ExpandablePrompt = ({ prompt }: { prompt: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 150;
  const shouldTruncate = prompt.length > MAX_LENGTH;
  
  const displayText = shouldTruncate && !isExpanded 
    ? prompt.slice(0, MAX_LENGTH) + "..." 
    : prompt;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Prompt</h4>
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className={isExpanded ? "" : "line-clamp-3"}>
          {displayText}
        </p>
        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-xs text-primary hover:text-primary/80"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Reduce
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                See more
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export const ImageDetailModal = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  prompt,
  createdAt,
  projectId,
  projectName,
  campaignId,
  campaignName,
  isProductShot,
  model,
  onDelete,
}: ImageDetailModalProps) => {
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isPublishingImage, setIsPublishingImage] = useState(false);
  const [isPublishingReel, setIsPublishingReel] = useState(false);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const { toast } = useToast();

  // Fetch project context when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectContext();
    }
  }, [isOpen, projectId]);

  const fetchProjectContext = async () => {
    if (!projectId) return;
    try {
      const { data } = await supabase
        .from("projects")
        .select("name, description, detected_language, ai_context_summary, scraped_markdown")
        .eq("id", projectId)
        .single();
      if (data) {
        setProjectContext(data);
      }
    } catch (error) {
      console.error("Error fetching project context:", error);
    }
  };

  // Generate caption from prompt with AI - uses full project context
  const handleGenerateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      // Build rich context from project data
      const name = projectContext?.name || projectName || "AI Creation";
      const language = projectContext?.detected_language || "en";
      
      // Use ai_context_summary or scraped_markdown for better context
      let description = "";
      if (prompt) {
        description += `Image generated with prompt: ${prompt}. `;
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
          projectDescription: description || "AI-generated creative content",
          detectedLanguage: language, // Match edge function parameter name
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
        setCaption(`${content}${hashtagString}`);
        toast({ title: "Caption generated!" });
      } else {
        // Fallback to local generation
        const shortPrompt = prompt && prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
        setCaption(prompt 
          ? `✨ ${name}\n\n${shortPrompt}\n\n#AI #AIGenerated #CreativeContent`
          : `✨ Created with AI\n\n#AI #AIGenerated #CreativeContent`);
        toast({ title: "Caption generated (local)" });
      }
    } catch (error) {
      console.error("Error generating caption:", error);
      const shortPrompt = prompt && prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
      setCaption(prompt
        ? `✨ AI Generated Post\n\n${shortPrompt}\n\n#AI #AIGenerated #CreativeContent`
        : `✨ Created with AI\n\n#AI #AIGenerated #CreativeContent`);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Direct API publish as Image
  const handlePublishAsImage = async () => {
    if (!imageUrl) {
      toast({ title: "No image to publish", variant: "destructive" });
      return;
    }

    setIsPublishingImage(true);
    toast({ 
      title: "Publishing...", 
      description: "Posting image to Facebook & Instagram" 
    });

    try {
      const response = await supabase.functions.invoke("publish-image", {
        body: {
          imageUrl,
          caption: caption || "",
          platforms: ["facebook", "instagram"],
          publishType: "image",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({ 
          title: "Published!", 
          description: "Image posted to Facebook & Instagram" 
        });
      } else if (response.data?.partial) {
        const failed = response.data.results?.filter((r: any) => !r.success) || [];
        toast({ 
          title: "Partially published", 
          description: `Failed on: ${failed.map((r: any) => r.platform).join(", ")}`,
          variant: "destructive"
        });
      } else {
        const errorMsg = response.data?.results?.[0]?.error || response.data?.error || "Publishing failed";
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error publishing image:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to publish",
        variant: "destructive" 
      });
    } finally {
      setIsPublishingImage(false);
    }
  };

  // Direct API publish as Reel
  const handlePublishAsReel = async () => {
    if (!imageUrl) {
      toast({ title: "No image to publish", variant: "destructive" });
      return;
    }

    setIsPublishingReel(true);
    toast({ 
      title: "Publishing as Reel...", 
      description: "Posting to Facebook & Instagram" 
    });

    try {
      const response = await supabase.functions.invoke("publish-image", {
        body: {
          imageUrl,
          caption: caption || "",
          platforms: ["facebook", "instagram"],
          publishType: "reel",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({ 
          title: "Published!", 
          description: "Reel posted to Facebook & Instagram" 
        });
      } else if (response.data?.partial) {
        const failed = response.data.results?.filter((r: any) => !r.success) || [];
        toast({ 
          title: "Partially published", 
          description: `Failed on: ${failed.map((r: any) => r.platform).join(", ")}`,
          variant: "destructive"
        });
      } else {
        const errorMsg = response.data?.results?.[0]?.error || response.data?.error || "Publishing failed";
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error publishing reel:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to publish",
        variant: "destructive" 
      });
    } finally {
      setIsPublishingReel(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Caption copied" });
  };

  const handleShareToSocial = (platform: string) => {
    const shareUrl = encodeURIComponent(imageUrl || "");
    const shareText = encodeURIComponent(caption);

    let url = "";
    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`;
        break;
      case "linkedin":
        // LinkedIn often blocks direct image URLs.
        // Open composer and guide the user with copy + download.
        url = `https://www.linkedin.com/feed/?shareActive=true`;
        break;
      case "instagram":
      case "tiktok":
        url = platform === "instagram" ? "https://www.instagram.com/" : "https://www.tiktok.com/";
        break;
    }

    if (url) {
      // Manual share workflow
      if (imageUrl) {
        void navigator.clipboard.writeText(caption ? `${caption}\n\n${imageUrl}` : imageUrl);
      } else {
        void navigator.clipboard.writeText(caption);
      }
      void handleDownload();
      openPopupOrRedirect(url, "width=900,height=700");
      toast({
        title: "Share",
        description: "Caption + link copied. Download starts so you can upload in the platform.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl w-full p-0 gap-0 bg-card border-border max-h-[85vh] md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close button - always visible */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-50 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Scrollable container for entire content */}
        <div className="flex-1 overflow-y-auto">
          {/* Mobile-first: Stack vertically, side-by-side on desktop */}
          <div className="flex flex-col md:flex-row md:h-full">
            {/* Image Preview - Compact on mobile, larger on desktop */}
            <div className="w-full md:flex-1 bg-black flex items-center justify-center min-h-[200px] md:min-h-[400px] max-h-[40vh] md:max-h-none relative shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-contain max-h-[40vh] md:max-h-[80vh]"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2 py-8">
                  <ImageIcon className="h-12 w-12 opacity-50" />
                  <span className="text-sm">No image available</span>
                </div>
              )}
            </div>

            {/* Details Panel - Full width on mobile, sidebar on desktop */}
            <div className="w-full md:w-80 md:border-l border-border flex flex-col shrink-0">
              {/* Header with date and action buttons */}
              <div className="p-3 md:p-4 border-b border-border space-y-3">
                {/* Date and badges */}
                <div className="flex items-center justify-between">
                  {createdAt && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span>{format(createdAt, "PPP", { locale: enUS })}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {isProductShot && (
                    <Badge variant="secondary" className="text-xs">Product Shot</Badge>
                  )}
                  {projectName && (
                    <Badge variant="outline" className="text-xs truncate max-w-[140px]">{projectName}</Badge>
                  )}
                  {campaignName && (
                    <Badge variant="outline" className="text-xs truncate max-w-[140px]">{campaignName}</Badge>
                  )}
                </div>

                {/* Model used */}
                {model && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{model}</span>
                  </div>
                )}

                {/* Action buttons bar */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 h-9 text-sm" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  {imageUrl && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => openPopupOrRedirect(imageUrl)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="destructive" size="icon" className="h-9 w-9" onClick={onDelete}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Scrollable content section */}
              <div className="p-3 md:p-4 space-y-4 md:overflow-y-auto md:max-h-[calc(90vh-220px)]">
                {/* Prompt with expand/collapse */}
                {prompt && (
                  <ExpandablePrompt prompt={prompt} />
                )}

                {/* Caption editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">Caption</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 gap-1 text-primary hover:text-primary/80 text-xs"
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
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleCopyCaption}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="min-h-[70px] md:min-h-[80px] resize-none text-sm"
                  />
                </div>

                {/* Direct API Publish buttons */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Publish directly
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="default"
                      className="gap-2 h-10 w-full"
                      onClick={handlePublishAsImage}
                      disabled={isPublishingImage || !imageUrl}
                    >
                      {isPublishingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      Post as Image
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Posts to Facebook & Instagram feeds
                  </p>
                  <p className="text-xs text-muted-foreground/70 text-center italic">
                    💡 For Reels with music, create a Campaign with ClipMotion enabled
                  </p>
                </div>

                {/* Share buttons */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share to
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 h-9"
                      onClick={() => handleShareToSocial("facebook")}
                    >
                      <FaFacebook className="h-4 w-4 text-primary" />
                      Facebook
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-9"
                      onClick={() => handleShareToSocial("linkedin")}
                    >
                      <FaLinkedin className="h-4 w-4 text-primary" />
                      LinkedIn
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-9"
                      onClick={() => handleShareToSocial("instagram")}
                    >
                      <FaInstagram className="h-4 w-4 text-accent-foreground" />
                      Instagram
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-9"
                      onClick={() => handleShareToSocial("tiktok")}
                    >
                      <FaTiktok className="h-4 w-4 text-foreground" />
                      TikTok
                    </Button>
                  </div>
                </div>

                {/* Bottom spacer for mobile scroll */}
                <div className="h-4 md:hidden" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
