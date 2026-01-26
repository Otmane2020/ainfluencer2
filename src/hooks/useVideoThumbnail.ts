import { useState, useCallback } from "react";

export interface ThumbnailResult {
  thumbnailUrl: string;
  width: number;
  height: number;
}

export const useVideoThumbnail = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateThumbnail = useCallback(
    async (videoUrl: string, timeInSeconds = 0.5): Promise<ThumbnailResult | null> => {
      setIsGenerating(true);

      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(timeInSeconds, video.duration);
        };

        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setIsGenerating(false);
            resolve(null);
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

          setIsGenerating(false);
          resolve({
            thumbnailUrl,
            width: canvas.width,
            height: canvas.height,
          });

          // Cleanup
          video.src = "";
          video.load();
        };

        video.onerror = () => {
          console.error("Failed to load video for thumbnail generation");
          setIsGenerating(false);
          resolve(null);
        };

        video.src = videoUrl;
      });
    },
    []
  );

  return { generateThumbnail, isGenerating };
};
