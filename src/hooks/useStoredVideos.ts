import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoHistoryItem } from "@/components/VideoHistory";

export const useStoredVideos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchStoredVideos = useCallback(async (): Promise<VideoHistoryItem[]> => {
    setIsLoading(true);

    try {
      const { data: videoFiles, error } = await supabase.storage
        .from("media")
        .list("videos", {
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        throw error;
      }

      if (!videoFiles || videoFiles.length === 0) {
        toast({
          title: "Aucune vidéo trouvée",
          description: "Aucune vidéo n'a encore été générée",
        });
        return [];
      }

      const videos: VideoHistoryItem[] = videoFiles
        .filter((file) => file.name.endsWith(".mp4"))
        .map((file, index) => {
          const { data: urlData } = supabase.storage
            .from("media")
            .getPublicUrl(`videos/${file.name}`);

          // Extract timestamp from filename (format: timestamp-id.mp4)
          const timestampMatch = file.name.match(/^(\d+)-/);
          const createdAt = timestampMatch
            ? new Date(parseInt(timestampMatch[1]))
            : new Date(file.created_at || Date.now());

          return {
            id: file.id || `stored-${index}`,
            title: `Vidéo ${index + 1}`,
            script: "Vidéo récupérée depuis le stockage",
            duration: 0,
            videoUrl: urlData.publicUrl,
            createdAt,
            voice: "Inconnu",
            status: "ready" as const,
          };
        });

      toast({
        title: `${videos.length} vidéo(s) récupérée(s)`,
        description: "Les vidéos ont été chargées depuis le stockage",
      });

      return videos;
    } catch (error) {
      console.error("Error fetching stored videos:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les vidéos stockées",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { fetchStoredVideos, isLoading };
};
