import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type ComposerStatus = 
  | "idle" 
  | "loading-ffmpeg" 
  | "downloading" 
  | "rendering" 
  | "done" 
  | "error";

interface UseVideoComposerResult {
  status: ComposerStatus;
  progress: number;
  error: string | null;
  videoBlob: Blob | null;
  compose: (imageUrl: string, audioUrl: string, duration: number) => Promise<Blob | null>;
  reset: () => void;
}

export function useVideoComposer(): UseVideoComposerResult {
  const [status, setStatus] = useState<ComposerStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);

  const loadFFmpeg = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current && loadedRef.current) {
      return ffmpegRef.current;
    }

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on("progress", ({ progress: p }) => {
      setProgress(Math.round(p * 100));
    });

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    // Load FFmpeg core from CDN
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    loadedRef.current = true;
    return ffmpeg;
  };

  const compose = useCallback(async (
    imageUrl: string, 
    audioUrl: string, 
    duration: number
  ): Promise<Blob | null> => {
    try {
      setError(null);
      setVideoBlob(null);
      setProgress(0);

      // Step 1: Load FFmpeg
      setStatus("loading-ffmpeg");
      const ffmpeg = await loadFFmpeg();

      // Step 2: Download files
      setStatus("downloading");
      setProgress(0);
      
      const imageData = await fetchFile(imageUrl);
      setProgress(50);
      
      const audioData = await fetchFile(audioUrl);
      setProgress(100);

      // Write files to FFmpeg virtual filesystem
      await ffmpeg.writeFile("image.png", imageData);
      await ffmpeg.writeFile("audio.mp3", audioData);

      // Step 3: Render video
      setStatus("rendering");
      setProgress(0);

      // Calculate zoom parameters for Ken Burns effect
      // d = duration in frames (30fps), zoom increases by 0.08 over duration
      const frames = duration * 30;
      const zoomIncrement = 0.08 / frames;

      await ffmpeg.exec([
        "-loop", "1",
        "-i", "image.png",
        "-i", "audio.mp3",
        "-c:v", "libx264",
        "-t", duration.toString(),
        "-pix_fmt", "yuv420p",
        "-vf", `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+${zoomIncrement.toFixed(6)},1.08)':d=${frames}:s=1080x1920:fps=30`,
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        "-movflags", "+faststart",
        "-preset", "ultrafast",
        "output.mp4"
      ]);

      // Read the output file
      const data = await ffmpeg.readFile("output.mp4");
      const uint8Array = new Uint8Array(data as Uint8Array);
      const blob = new Blob([uint8Array], { type: "video/mp4" });

      // Cleanup
      await ffmpeg.deleteFile("image.png");
      await ffmpeg.deleteFile("audio.mp3");
      await ffmpeg.deleteFile("output.mp4");

      setVideoBlob(blob);
      setStatus("done");
      setProgress(100);

      return blob;
    } catch (err) {
      console.error("Video composition failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create video");
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setVideoBlob(null);
  }, []);

  return {
    status,
    progress,
    error,
    videoBlob,
    compose,
    reset,
  };
}
