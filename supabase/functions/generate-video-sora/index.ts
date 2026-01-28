import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// MODEL CONFIGURATION - Quality-based routing to CometAPI
// ============================================================

interface ModelConfig {
  apiModel: string;
  durations: number[];
  maxSize: { portrait: string; landscape: string };
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // ============================================================
  // QUALITY LEVELS (Primary - used by frontend)
  // ============================================================
  
  // Smart Video - Kling Standard (fast, affordable) - 9.90€
  "smart-video": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  
  // High Video - Veo 3.1 / Sora 2 - 12.90€
  "high-video": {
    apiModel: "veo-2",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  
  // Cinema Video - Sora 2 Pro / Veo Pro - 19.90€
  "cinema-video": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },

  // ============================================================
  // INTERNAL MODEL IDs (Secondary - mapped from quality levels)
  // ============================================================
  
  // Kling variants
  "kling-std": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "kling-v2-master": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  
  // Veo variants
  "veo-3.1": {
    apiModel: "veo-2",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-fast": {
    apiModel: "veo-2",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-pro": {
    apiModel: "veo-2",
    durations: [10, 20, 30],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-3.1-pro": {
    apiModel: "veo-2",
    durations: [10, 20, 30],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  
  // Sora variants
  "sora-2": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "sora-2-pro": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  
  // MiniMax (legacy)
  "minimax-hailuo": {
    apiModel: "minimax-video-01",
    durations: [4, 6],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
};

// Default fallback
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  apiModel: "kling-video",
  durations: [5, 10],
  maxSize: { portrait: "720x1280", landscape: "1280x720" },
};

// Legacy quality sizes (fallback)
const QUALITY_SIZES: Record<string, { portrait: string; landscape: string }> = {
  "720p": { portrait: "720x1280", landscape: "1280x720" },
  "1080p": { portrait: "720x1280", landscape: "1280x720" },
  "4k": { portrait: "720x1280", landscape: "1280x720" },
};

interface VideoRequest {
  prompt: string;
  avatarUrl?: string;
  duration?: number;
  size?: string;
  quality?: "720p" | "1080p" | "4k";
  orientation?: "portrait" | "landscape";
  format?: "reel" | "landscape" | "story";
  startingFrameUrl?: string;
  model?: string; // Quality ID (e.g., "smart-video") or internal model ID
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    if (!COMETAPI_API_KEY) {
      throw new Error("COMETAPI_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    if (action === "create") {
      const { 
        prompt, 
        avatarUrl, 
        duration: requestedDuration = 5, 
        size: legacySize,
        quality = "1080p",
        orientation: requestedOrientation = "portrait",
        format,
        startingFrameUrl,
        model: requestedModel = "smart-video", // Default to Smart Video
      }: VideoRequest = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Determine orientation from format
      let orientation = requestedOrientation;
      if (format) {
        orientation = format === "landscape" ? "landscape" : "portrait";
      }

      // Get model configuration (fallback to Smart Video if unknown)
      const modelConfig = MODEL_CONFIGS[requestedModel] || DEFAULT_MODEL_CONFIG;
      const apiModel = modelConfig.apiModel;

      // Validate duration for this model
      const validDurations = modelConfig.durations;
      const duration = validDurations.includes(requestedDuration) 
        ? requestedDuration 
        : validDurations.reduce((prev, curr) => 
            Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev
          );

      // Determine size
      const size = legacySize || modelConfig.maxSize[orientation];

      // Build enhanced prompt
      let fullPrompt = prompt;
      if (avatarUrl) {
        fullPrompt = `Cinematic ultra-realistic promotional video: ${prompt}. Style: professional, high quality, cinematic lighting, vibrant colors.`;
      }
      
      // Add quality instructions
      if (quality === "4k") {
        fullPrompt = `${fullPrompt} Ultra high resolution 4K, maximum detail, professional cinema grade quality.`;
      } else if (quality === "1080p") {
        fullPrompt = `${fullPrompt} Full HD 1080p, sharp details, professional quality.`;
      }

      console.log("=== Video Generation Request ===");
      console.log("Quality Level:", requestedModel);
      console.log("API Model:", apiModel);
      console.log("Resolution:", size);
      console.log("Duration:", duration, "s (requested:", requestedDuration, "s)");
      if (startingFrameUrl) {
        console.log("Starting frame URL provided for video continuation");
      }

      // Create FormData for CometAPI
      const formData = new FormData();
      formData.append("prompt", fullPrompt);
      formData.append("model", apiModel);
      formData.append("seconds", duration.toString());
      formData.append("size", size);

      if (startingFrameUrl) {
        formData.append("image_url", startingFrameUrl);
        console.log("Added starting frame for image-to-video");
      }

      const response = await fetch("https://api.cometapi.com/v1/videos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("CometAPI error:", errorText);
        throw new Error(`CometAPI error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Video task created:", result.id, "| API Model:", apiModel, "| Duration:", duration, "s");

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.id,
          status: result.status,
          progress: result.progress || 0,
          model: apiModel,
          requestedModel,
          qualityLevel: requestedModel,
          size,
          duration,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } else if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      console.log("Checking status for task:", taskId);

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Status check error:", errorText);
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Full API response:", JSON.stringify(result));

      // Handle nested data structure
      const videoData = result.data || result;
      const innerData = videoData.data || {};

      // Normalize status
      const rawStatus = videoData.status || innerData.status || videoData.state || "in_progress";
      const taskStatus = rawStatus.toLowerCase();

      // Parse progress
      const rawProgress = innerData.progress || videoData.progress || videoData.percent || 0;
      const taskProgress = typeof rawProgress === "string" 
        ? parseInt(rawProgress.replace('%', '')) 
        : rawProgress;

      // Extract timestamps
      const submitTime = videoData.submit_time || innerData.submit_time;
      const finishTime = videoData.finish_time || innerData.finish_time;

      // Extract video URL (CometAPI quirk: sometimes in fail_reason)
      let videoUrl = undefined;
      if (taskStatus === "success" || taskStatus === "succeeded" || taskStatus === "completed" || taskStatus === "done") {
        if (videoData.fail_reason && videoData.fail_reason.startsWith("http")) {
          videoUrl = videoData.fail_reason;
        } else {
          videoUrl = innerData.output_video || videoData.output_video || 
                     videoData.video_url || innerData.url || videoData.url;
        }
      }

      const model = innerData.model || videoData.model || "smart-video";
      const seconds = innerData.seconds || videoData.seconds || 5;

      console.log("Parsed - Status:", taskStatus, "Progress:", taskProgress, "VideoUrl:", videoUrl);

      // Map status
      let mappedStatus: "queued" | "in_progress" | "completed" | "failed" = "in_progress";
      if (taskStatus === "queued" || taskStatus === "pending" || taskStatus === "waiting") {
        mappedStatus = "queued";
      } else if (taskStatus === "completed" || taskStatus === "succeeded" || taskStatus === "success" || taskStatus === "done") {
        mappedStatus = "completed";
      } else if (taskStatus === "failed" || taskStatus === "error") {
        mappedStatus = "failed";
      }

      return new Response(
        JSON.stringify({
          id: taskId,
          status: mappedStatus,
          progress: typeof taskProgress === "number" ? taskProgress : parseInt(taskProgress) || 0,
          videoUrl,
          submitTime,
          finishTime,
          model,
          seconds,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } else if (action === "download") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId is required for download");
      }

      console.log("Downloading video for task:", taskId);

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download error:", errorText);
        throw new Error(`Download failed: ${response.status}`);
      }

      const videoBlob = await response.blob();
      
      return new Response(videoBlob, {
        headers: {
          ...corsHeaders,
          "Content-Type": "video/mp4",
        },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
