import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useVideoComposer, ComposerStatus } from "@/hooks/useVideoComposer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  audioUrl: string;
  duration: number;
}

const statusLabels: Record<ComposerStatus, string> = {
  idle: "Ready",
  "loading-ffmpeg": "Loading video engine...",
  downloading: "Downloading assets...",
  rendering: "Creating your video...",
  done: "Video ready!",
  error: "Something went wrong",
};

const statusIcons: Record<ComposerStatus, React.ReactNode> = {
  idle: null,
  "loading-ffmpeg": <Loader2 className="h-5 w-5 animate-spin" />,
  downloading: <Loader2 className="h-5 w-5 animate-spin" />,
  rendering: <Loader2 className="h-5 w-5 animate-spin" />,
  done: <CheckCircle className="h-5 w-5 text-primary" />,
  error: <AlertCircle className="h-5 w-5 text-destructive" />,
};

export function VideoComposerModal({
  open,
  onOpenChange,
  imageUrl,
  audioUrl,
  duration,
}: VideoComposerModalProps) {
  const { status, progress, error, videoBlob, compose, reset } = useVideoComposer();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Start composition when modal opens
  useEffect(() => {
    if (open && status === "idle" && imageUrl && audioUrl) {
      compose(imageUrl, audioUrl, duration);
    }
  }, [open, status, imageUrl, audioUrl, duration, compose]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setUploadedUrl(null);
    }
  }, [open, reset]);

  const handleDownload = () => {
    if (!videoBlob) return;
    
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reel-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Your video is being downloaded",
    });
  };

  const handleUpload = async () => {
    if (!videoBlob) return;
    
    setIsUploading(true);
    try {
      const fileName = `reels/${Date.now()}-reel.mp4`;
      
      const { data, error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, videoBlob, {
          contentType: "video/mp4",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(data.path);

      setUploadedUrl(urlData.publicUrl);
      
      toast({
        title: "Uploaded!",
        description: "Your video is now in the cloud",
      });
    } catch (err) {
      console.error("Upload failed:", err);
      toast({
        title: "Upload failed",
        description: "Could not upload video to cloud",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isProcessing = ["loading-ffmpeg", "downloading", "rendering"].includes(status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create MP4 Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            {statusIcons[status]}
            <span className="text-sm font-medium">{statusLabels[status]}</span>
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </p>
            </motion.div>
          )}

          {/* Error message */}
          {status === "error" && error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          {/* Success state */}
          <AnimatePresence>
            {status === "done" && videoBlob && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Video preview */}
                <div className="aspect-[9/16] max-h-[300px] mx-auto rounded-lg overflow-hidden bg-black">
                  <video
                    src={URL.createObjectURL(videoBlob)}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleDownload}
                    className="flex-1"
                    variant="default"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button
                    onClick={handleUpload}
                    className="flex-1"
                    variant="outline"
                    disabled={isUploading || !!uploadedUrl}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : uploadedUrl ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-primary" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploadedUrl ? "Uploaded" : "Save to Cloud"}
                  </Button>
                </div>

                {/* Uploaded URL */}
                {uploadedUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-lg bg-muted p-3"
                  >
                    <p className="text-xs text-muted-foreground mb-1">Cloud URL:</p>
                    <p className="text-xs font-mono break-all">{uploadedUrl}</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing info */}
          {isProcessing && (
            <p className="text-xs text-muted-foreground text-center">
              This may take 10-30 seconds depending on your device
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
