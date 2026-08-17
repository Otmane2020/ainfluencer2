import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoHistoryItem } from "@/components/VideoHistory";
import { useAuth } from "@/hooks/useAuth";

export const useStoredVideos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchStoredVideos = useCallback(async (): Promise<VideoHistoryItem[]> => {
    setIsLoading(true);

    try {
      // Fetch from both sources in parallel
      const [storageResult, generationsResult] = await Promise.all([
        // Storage bucket videos
        supabase.storage
          .from("media")
          .list("videos", {
            sortBy: { column: "created_at", order: "desc" },
          }),
        // Database generations table - filter by user_id for security
        user ? supabase
          .from("generations")
          .select("id, type, status, media_url, script, duration, model, provider, prompt, created_at, thumbnail_url, campaign_id")
          .eq("type", "video")
          .eq("user_id", user.id)
          .in("status", ["completed", "ready"])
          .order("created_at", { ascending: false })
          .limit(50) : Promise.resolve({ data: [], error: null }),
      ]);

      const allVideos: VideoHistoryItem[] = [];

      // Process storage videos
      if (!storageResult.error && storageResult.data) {
        const storageVideos = storageResult.data
          .filter((file) => file.name.endsWith(".mp4"))
          .map((file, index) => {
            const { data: urlData } = supabase.storage
              .from("media")
              .getPublicUrl(`videos/${file.name}`);

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
        allVideos.push(...storageVideos);
      }

      // Process generations from database
      if (!generationsResult.error && generationsResult.data) {
        const dbVideos = (generationsResult.data as Record<string, never>[])
          .filter((gen) => gen.media_url) // Only include videos with media_url
          .map((gen) => ({
            id: gen.id,
            title: `AI Video - ${gen.model || "Unknown"}`,
            script: gen.script || gen.prompt || "AI generated video",
            duration: gen.duration || 0,
            videoUrl: gen.media_url!,
            thumbnailUrl: gen.thumbnail_url || undefined,
            createdAt: new Date(gen.created_at),
            voice: gen.model || "Unknown",
            provider: (gen as any).provider || undefined,
            status: "ready" as const,
            campaignId: gen.campaign_id || undefined,
          }));
        
        // Merge, avoiding duplicates by videoUrl
        const existingUrls = new Set(allVideos.map(v => v.videoUrl));
        for (const video of dbVideos) {
          if (!existingUrls.has(video.videoUrl)) {
            allVideos.push(video);
            existingUrls.add(video.videoUrl);
          }
        }
      }

      // Sort by date descending
      allVideos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return allVideos;
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
  }, [toast, user]);

  return { fetchStoredVideos, isLoading };
};
