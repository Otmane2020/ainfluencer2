import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, Trash2, ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SocialShareModal } from "@/components/SocialShareModal";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
  model?: string;
  provider?: string;
}

interface ImagePreviewProps {
  latestImage: GeneratedImage | null;
  recentImages: GeneratedImage[];
  onDelete: (id: string) => void;
}

export const ImagePreview = ({
  latestImage,
  recentImages,
  onDelete,
}: ImagePreviewProps) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const { toast } = useToast();

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-image-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Image saved to your device",
      });
    } catch (error) {
      toast({
        title: "Download error",
        description: "Unable to download image",
        variant: "destructive",
      });
    }
  };

  const handleShare = (image: GeneratedImage) => {
    setSelectedImage(image);
    setShareModalOpen(true);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    toast({
      title: "Deleted",
      description: "Image removed from history",
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-secondary/10 p-2">
            <ImageIcon className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-semibold">Preview</h3>
            <p className="text-xs text-muted-foreground">
              Your generated images
            </p>
          </div>
        </div>

        {/* Latest Image Preview */}
        <AnimatePresence mode="wait">
          {latestImage ? (
            <motion.div
              key={latestImage.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative overflow-hidden rounded-lg border border-border"
            >
              <img
                src={latestImage.url}
                alt={latestImage.prompt}
                className="w-full aspect-square object-cover"
              />
              
              {/* Model badge */}
              {latestImage.model && (
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-white text-[10px] font-medium backdrop-blur-sm ${
                  latestImage.provider === "flux" 
                    ? "bg-purple-600/80" 
                    : latestImage.provider === "openai" 
                      ? "bg-emerald-600/80" 
                      : "bg-amber-600/80"
                }`}>
                  {latestImage.provider === "flux" 
                    ? "⚡" 
                    : latestImage.provider === "openai" 
                      ? "🤖" 
                      : "🍌"} {latestImage.model.replace("flux-", "").replace("nano-banana", "Gemini").replace("-", " ").toUpperCase()}
                </div>
              )}
              
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs line-clamp-2 mb-2">
                    {latestImage.prompt}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleDownload(latestImage)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleShare(latestImage)}
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-muted/30"
            >
              <div className="text-center p-4">
                <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Your generated images will appear here
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Images Gallery */}
        {recentImages.length > 1 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Recent</h4>
            <div className="grid grid-cols-3 gap-2">
              {recentImages.slice(1, 7).map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-white hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image);
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-white hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {recentImages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{recentImages.length} images generated</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                <a href="/history/images">
                  View all <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Share Modal */}
      {selectedImage && (
        <SocialShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          content={{
            mediaUrl: selectedImage.url,
            type: "image",
            text: selectedImage.prompt,
          }}
        />
      )}
    </>
  );
};

export default ImagePreview;
