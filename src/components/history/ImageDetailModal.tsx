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
  Music,
} from "lucide-react";
import { FaFacebook, FaLinkedin, FaInstagram, FaTiktok } from "react-icons/fa";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  onDelete?: () => void;
}

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
  onDelete,
}: ImageDetailModalProps) => {
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isCreatingReel, setIsCreatingReel] = useState(false);
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

  // Post as Reel - converts image to video with music
  const handlePostAsReel = async () => {
    if (!imageUrl) {
      toast({ title: "No image to convert", variant: "destructive" });
      return;
    }

    setIsCreatingReel(true);
    toast({ 
      title: "Creating Reel...", 
      description: "Converting image to video with music" 
    });

    try {
      // Open Facebook Reels creator with the image
      // Facebook allows posting images as Reels through their Creator Studio
      const reelUrl = `https://business.facebook.com/creatorstudio/home`;
      
      // Download the image first for the user
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reel-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Copy caption to clipboard
      if (caption) {
        await navigator.clipboard.writeText(caption);
      }

      toast({ 
        title: "Image downloaded!", 
        description: "Caption copied. Opening Facebook Creator Studio to create your Reel with music.",
      });

      // Open Creator Studio
      window.open(reelUrl, "_blank");
    } catch (error) {
      console.error("Error creating reel:", error);
      toast({ 
        title: "Error", 
        description: "Failed to prepare reel. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsCreatingReel(false);
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
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;
        break;
      case "instagram":
      case "tiktok":
        handleDownload();
        toast({
          title: `Share to ${platform === "instagram" ? "Instagram" : "TikTok"}`,
          description: "Image downloaded. Open the app to share.",
        });
        return;
    }

    if (url) {
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 bg-card border-border overflow-hidden max-h-[90vh]">
        <div className="flex flex-col md:flex-row h-full">
          {/* Image Preview */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px] relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="max-h-[80vh] max-w-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground">No image available</div>
            )}
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Details Panel */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border flex flex-col">
            {/* Header with date and action buttons */}
            <div className="p-4 border-b border-border space-y-3">
              {/* Date and badges */}
              <div className="flex items-center justify-between">
                {createdAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(createdAt, "PPP", { locale: enUS })}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {isProductShot && (
                  <Badge variant="secondary">Product Shot</Badge>
                )}
                {projectName && (
                  <Badge variant="outline">{projectName}</Badge>
                )}
                {campaignName && (
                  <Badge variant="outline">{campaignName}</Badge>
                )}
              </div>

              {/* Action buttons bar */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {imageUrl && (
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open(imageUrl, "_blank")}>
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

            {/* Scrollable content */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Prompt */}
              {prompt && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Prompt</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {prompt}
                  </p>
                </div>
              )}

              {/* Caption editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">Caption</h4>
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
                  <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={handleCopyCaption}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Post as Reel */}
              <div className="space-y-2">
                <Button
                  variant="default"
                  className="w-full gap-2 h-11 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
                  onClick={handlePostAsReel}
                  disabled={isCreatingReel || !imageUrl}
                >
                  {isCreatingReel ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Film className="h-5 w-5" />
                      <Music className="h-4 w-4" />
                    </>
                  )}
                  Post as Reel with Music
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Opens Facebook Creator Studio to add music
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
                    className="gap-2 h-10"
                    onClick={() => handleShareToSocial("facebook")}
                  >
                    <FaFacebook className="h-4 w-4 text-primary" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-10"
                    onClick={() => handleShareToSocial("linkedin")}
                  >
                    <FaLinkedin className="h-4 w-4 text-primary" />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-10"
                    onClick={() => handleShareToSocial("instagram")}
                  >
                    <FaInstagram className="h-4 w-4 text-accent-foreground" />
                    Instagram
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-10"
                    onClick={() => handleShareToSocial("tiktok")}
                  >
                    <FaTiktok className="h-4 w-4 text-foreground" />
                    TikTok
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
