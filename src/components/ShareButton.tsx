import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Facebook, Instagram, Copy, Download, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  onShare?: (platform: "facebook" | "instagram" | "copy" | "download") => void;
}

export const ShareButton = ({
  videoUrl,
  thumbnailUrl,
  title = "Ma vidéo AI",
  description = "Créée avec AI Influencer",
  onShare,
}: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    if (videoUrl) {
      await navigator.clipboard.writeText(videoUrl);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
      toast({
        title: "Lien copié !",
        description: "Le lien de la vidéo a été copié dans le presse-papiers",
      });
      onShare?.("copy");
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.replace(/\s+/g, "-")}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement lancé",
        description: "La vidéo est en cours de téléchargement",
      });
      onShare?.("download");
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la vidéo",
        variant: "destructive",
      });
    }
  };

  const handleFacebookShare = () => {
    // Open Facebook sharing - requires app approval for direct API posting
    const shareUrl = encodeURIComponent(videoUrl || window.location.href);
    const shareText = encodeURIComponent(`${title} - ${description}`);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`,
      "_blank",
      "width=600,height=400"
    );
    toast({
      title: "Partage Facebook",
      description: "La fenêtre de partage Facebook s'est ouverte",
    });
    onShare?.("facebook");
    setIsOpen(false);
  };

  const handleInstagramShare = () => {
    // Instagram doesn't have a web share API - guide user to download
    toast({
      title: "Partager sur Instagram",
      description: "Téléchargez la vidéo puis partagez-la depuis l'app Instagram",
    });
    handleDownload();
    onShare?.("instagram");
    setIsOpen(false);
  };

  const shareOptions = [
    {
      id: "facebook",
      label: "Facebook",
      icon: Facebook,
      gradient: "from-[#1877F2] to-[#0D65D9]",
      onClick: handleFacebookShare,
    },
    {
      id: "instagram",
      label: "Instagram",
      icon: Instagram,
      gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
      onClick: handleInstagramShare,
    },
    {
      id: "copy",
      label: copiedState ? "Copié !" : "Copier le lien",
      icon: copiedState ? Check : Copy,
      gradient: "from-muted to-muted",
      onClick: handleCopyLink,
    },
    {
      id: "download",
      label: "Télécharger",
      icon: Download,
      gradient: "from-primary to-primary",
      onClick: handleDownload,
    },
  ];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 rounded-full"
        disabled={!videoUrl}
      >
        <Share2 className="h-4 w-4" />
        Partager
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Share menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg"
            >
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-sm font-medium">Partager</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1">
                {shareOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={option.onClick}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${option.gradient}`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {thumbnailUrl && (
                <div className="mt-2 border-t border-border pt-2">
                  <img
                    src={thumbnailUrl}
                    alt="Aperçu"
                    className="h-20 w-full rounded-lg object-cover"
                  />
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
