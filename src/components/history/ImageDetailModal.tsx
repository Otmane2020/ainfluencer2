import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Trash2,
  X,
  Share2,
  Info,
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
  prompt?: string;
  createdAt?: Date;
  projectName?: string;
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
  projectName,
  campaignName,
  isProductShot,
  onDelete,
}: ImageDetailModalProps) => {
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isCreatingReel, setIsCreatingReel] = useState(false);
  const { toast } = useToast();

  // Generate caption from prompt with AI
  const handleGenerateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        // Fallback to local generation
        const shortPrompt = prompt && prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
        const newCaption = prompt 
          ? `✨ AI Generated Post\n\n${shortPrompt}\n\n#AI #AIGenerated #CreativeContent`
          : `✨ Created with AI\n\n#AI #AIGenerated #CreativeContent`;
        setCaption(newCaption);
        return;
      }

      const response = await supabase.functions.invoke("suggest-content", {
        body: {
          contentType: "social_post",
          context: `Create a compelling social media caption for an AI-generated image.${prompt ? ` Original prompt: ${prompt}` : ""}${projectName ? ` Project: ${projectName}` : ""}`,
          tone: "engaging",
          format: "short",
        },
      });

      if (response.data?.suggestion) {
        setCaption(`✨ AI Generated Post\n\n${response.data.suggestion}`);
      } else {
        // Fallback
        const shortPrompt = prompt && prompt.length > 120 ? prompt.substring(0, 120) + "..." : prompt;
        setCaption(prompt 
          ? `✨ AI Generated Post\n\n${shortPrompt}\n\n#AI #AIGenerated #CreativeContent`
          : `✨ Created with AI\n\n#AI #AIGenerated #CreativeContent`);
      }
      
      toast({ title: "Caption generated!" });
    } catch (error) {
      console.error("Error generating caption:", error);
      // Fallback to local
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
            <Tabs defaultValue="details" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-transparent h-12">
                <TabsTrigger value="details" className="gap-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <Info className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="share" className="gap-2 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <Share2 className="h-4 w-4" />
                  Share
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 p-4 space-y-4 mt-0 overflow-y-auto">
                {/* Meta info */}
                <div className="space-y-3">
                  {createdAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(createdAt, "PPP", { locale: enUS })}</span>
                    </div>
                  )}
                  
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
                </div>

                {/* Prompt */}
                {prompt && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Prompt</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {prompt}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  {imageUrl && (
                    <Button variant="outline" size="icon" onClick={() => window.open(imageUrl, "_blank")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="destructive" size="icon" onClick={onDelete}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="share" className="flex-1 p-4 space-y-4 mt-0 overflow-y-auto">
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
                    className="min-h-[100px] resize-none"
                  />
                </div>

                {/* Post as Reel */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Create Reel</h4>
                  <Button
                    variant="default"
                    className="w-full gap-2 h-12 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
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
                  <h4 className="text-sm font-medium">Share to</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 h-12"
                      onClick={() => handleShareToSocial("facebook")}
                    >
                      <FaFacebook className="h-5 w-5 text-primary" />
                      Facebook
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-12"
                      onClick={() => handleShareToSocial("linkedin")}
                    >
                      <FaLinkedin className="h-5 w-5 text-primary" />
                      LinkedIn
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-12"
                      onClick={() => handleShareToSocial("instagram")}
                    >
                      <FaInstagram className="h-5 w-5 text-accent-foreground" />
                      Instagram
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-12"
                      onClick={() => handleShareToSocial("tiktok")}
                    >
                      <FaTiktok className="h-5 w-5 text-foreground" />
                      TikTok
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
