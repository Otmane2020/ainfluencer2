import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Image, Download, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StoredImage {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
  size: number;
}

const ImageHistoryPage = () => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const { data: files, error } = await supabase.storage
        .from("media")
        .list("images", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      if (files && files.length > 0) {
        const imageList: StoredImage[] = files
          .filter((file) => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
          .map((file) => {
            const { data: urlData } = supabase.storage
              .from("media")
              .getPublicUrl(`images/${file.name}`);

            return {
              id: file.id || file.name,
              name: file.name,
              url: urlData.publicUrl,
              createdAt: new Date(file.created_at || Date.now()),
              size: file.metadata?.size || 0,
            };
          });

        setImages(imageList);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (image: StoredImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: image.name,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download image",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (image: StoredImage) => {
    try {
      const { error } = await supabase.storage
        .from("media")
        .remove([`images/${image.name}`]);

      if (error) throw error;

      setImages((prev) => prev.filter((i) => i.id !== image.id));
      toast({
        title: "Image deleted",
        description: "Image has been removed",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Unable to delete image",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "Unknown";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Image History</h1>
          <p className="text-muted-foreground">
            All your generated images in one place
          </p>
        </div>
        <Button variant="outline" onClick={fetchImages} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Refresh"
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : images.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No images yet</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Generated images will appear here. Start creating content to see your image history.
          </p>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-card"
            >
              <img
                src={image.url}
                alt={image.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs truncate mb-2">
                    {image.name}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => handleDownload(image)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      onClick={() => window.open(image.url, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8"
                      onClick={() => handleDelete(image)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ImageHistoryPage;
