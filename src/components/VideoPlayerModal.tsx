import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Volume2, VolumeX } from "lucide-react";
import { useState, useRef } from "react";
import { ShareButton } from "@/components/ShareButton";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
}

export const VideoPlayerModal = ({
  isOpen,
  onClose,
  videoUrl,
  thumbnailUrl,
  title,
  description,
}: VideoPlayerModalProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Video player */}
          <div className="aspect-video w-full bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                poster={thumbnailUrl}
                controls
                autoPlay
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                Vidéo non disponible
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="flex items-center justify-between bg-background/95 px-4 py-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium text-foreground">{title}</h3>
              {description && (
                <p className="truncate text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <ShareButton
                videoUrl={videoUrl}
                thumbnailUrl={thumbnailUrl}
                title={title}
                description={description}
              />
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                disabled={!videoUrl}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
