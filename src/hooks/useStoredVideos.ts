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
        // Don't show toast for empty - videos might be in generation tasks
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
            title: `Video ${index + 1}`,
            script: "Video retrieved from storage",
            duration: 0,
            videoUrl: urlData.publicUrl,
            createdAt,
            voice: "Unknown",
            status: "ready" as const,
          };
        });

      return videos;
    } catch (error) {
      console.error("Error fetching stored videos:", error);
      toast({
        title: "Error",
        description: "Unable to retrieve stored videos",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { fetchStoredVideos, isLoading };
};
