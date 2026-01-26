import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  MessageCircle
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
}

const platforms: SocialPlatform[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    gradient: "from-[#1877F2] to-[#0D65D9]",
    shareUrl: (text, url) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}${url ? `&u=${encodeURIComponent(url)}` : ''}`,
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
    shareUrl: (text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url || '')}&summary=${encodeURIComponent(text)}`,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: TikTokIcon,
    gradient: "from-[#000000] via-[#25F4EE] to-[#FE2C55]",
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
  const { toast } = useToast();

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

  const handleShare = (platform: SocialPlatform) => {
    if (platform.shareUrl) {
      const url = platform.shareUrl(shareText, content?.mediaUrl);
      window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
    } else {
      // For platforms without web share (Instagram, TikTok)
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

          {/* Social Platforms Grid */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share to</label>
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
