import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Image, Download, Trash2, ExternalLink, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StoredImage {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
  size: number;
  folder: "images" | "product-shots";
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
      // Fetch from both images and product-shots folders in parallel
      const [imagesResult, productShotsResult] = await Promise.all([
        supabase.storage.from("media").list("images", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        }),
        supabase.storage.from("media").list("product-shots", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        }),
      ]);

      const allImages: StoredImage[] = [];

      // Process regular images
      if (imagesResult.data && imagesResult.data.length > 0) {
        const regularImages = imagesResult.data
          .filter((file) => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
          .map((file) => {
            const { data: urlData } = supabase.storage
              .from("media")
              .getPublicUrl(`images/${file.name}`);

            return {
              id: file.id || `img-${file.name}`,
              name: file.name,
              url: urlData.publicUrl,
              createdAt: new Date(file.created_at || Date.now()),
              size: file.metadata?.size || 0,
              folder: "images" as const,
            };
          });
        allImages.push(...regularImages);
      }

      // Process product shots
      if (productShotsResult.data && productShotsResult.data.length > 0) {
        const productShots = productShotsResult.data
          .filter((file) => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
          .map((file) => {
            const { data: urlData } = supabase.storage
              .from("media")
              .getPublicUrl(`product-shots/${file.name}`);

            return {
              id: file.id || `ps-${file.name}`,
              name: file.name,
              url: urlData.publicUrl,
              createdAt: new Date(file.created_at || Date.now()),
              size: file.metadata?.size || 0,
              folder: "product-shots" as const,
            };
          });
        allImages.push(...productShots);
      }

      // Sort all images by creation date
      allImages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setImages(allImages);
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
      const filePath = `${image.folder}/${image.name}`;
      const { error } = await supabase.storage
        .from("media")
        .remove([filePath]);

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
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Images</h1>
        <Button variant="ghost" size="icon" onClick={fetchImages} disabled={isLoading} className="h-9 w-9">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Image className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-card"
            >
              <img
                src={image.url}
                alt={image.name}
                className="h-full w-full object-cover"
              />
              
              {/* Product Shot Badge */}
              {image.folder === "product-shots" && (
                <Badge variant="secondary" className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 gap-1">
                  <Camera className="h-3 w-3" />
                  Shot
                </Badge>
              )}
              
              {/* Overlay - visible on touch/hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(image)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(image.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(image)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageHistoryPage;
