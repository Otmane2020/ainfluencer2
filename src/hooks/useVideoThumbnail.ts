import { useState, useCallback } from "react";

interface ThumbnailResult {
  thumbnailUrl: string;
  duration: number;
}

export const useVideoThumbnail = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateThumbnail = useCallback(
    async (videoUrl: string): Promise<ThumbnailResult | null> => {
      // Skip thumbnail generation for external URLs (CORS issues)
      // CometAPI videos are hosted externally and will fail CORS
      if (!videoUrl.includes("supabase.co")) {
        console.log("Skipping thumbnail for external URL:", videoUrl.substring(0, 50));
        return null;
      }

      setIsGenerating(true);

      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.preload = "metadata";

        const cleanup = () => {
          video.remove();
          setIsGenerating(false);
        };

        video.onloadedmetadata = () => {
          video.currentTime = 0.5;
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
              cleanup();
              resolve({
                thumbnailUrl,
                duration: Math.round(video.duration),
              });
            } else {
              cleanup();
              resolve(null);
            }
          } catch (error) {
            console.error("Canvas error:", error);
            cleanup();
            resolve(null);
          }
        };

        video.onerror = () => {
          console.log("Video load failed, likely CORS issue for:", videoUrl.substring(0, 50));
          cleanup();
          resolve(null);
        };

        video.src = videoUrl;
        video.load();

        // Timeout after 10 seconds
        setTimeout(() => {
          if (isGenerating) {
            cleanup();
            resolve(null);
          }
        }, 10000);
      });
    },
    []
  );

  return { generateThumbnail, isGenerating };
};