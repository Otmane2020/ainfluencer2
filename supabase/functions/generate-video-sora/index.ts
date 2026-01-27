import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model configuration for CometAPI - maps internal model IDs to API model names
interface ModelConfig {
  apiModel: string;
  durations: number[];
  maxSize: { portrait: string; landscape: string };
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
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
  "kling-v2-master": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "minimax-hailuo": {
    apiModel: "minimax-video-01",
    durations: [4, 6],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-3.1": {
    apiModel: "veo-2",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-3.1-pro": {
    apiModel: "veo-2",
    durations: [10, 20, 30],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
};

// Legacy quality sizes (fallback if model not found)
const QUALITY_SIZES: Record<string, { portrait: string; landscape: string }> = {
  "720p": { portrait: "720x1280", landscape: "1280x720" },
  "1080p": { portrait: "720x1280", landscape: "1280x720" },
  "4k": { portrait: "720x1280", landscape: "1280x720" },
};

interface VideoRequest {
  prompt: string;
  avatarUrl?: string;
  duration?: number;
  size?: string; // Legacy: "720x1280" or "1280x720"
  quality?: "720p" | "1080p" | "4k";
  orientation?: "portrait" | "landscape";
  startingFrameUrl?: string;
  model?: string; // Model ID from frontend (e.g., "kling-v2-master", "veo-3.1")
}

interface VideoStatusResponse {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
      // Create a new video generation task
      const { 
        prompt, 
        avatarUrl, 
        duration: requestedDuration = 4, 
        size: legacySize,
        quality = "1080p",
        orientation = "portrait",
        startingFrameUrl,
        model: requestedModel = "sora-2",
      }: VideoRequest = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Get model configuration (fallback to sora-2 if unknown model)
      const modelConfig = MODEL_CONFIGS[requestedModel] || MODEL_CONFIGS["sora-2"];
      const apiModel = modelConfig.apiModel;

      // Validate duration for this specific model
      const validDurations = modelConfig.durations;
      const duration = validDurations.includes(requestedDuration) 
        ? requestedDuration 
        : validDurations.reduce((prev, curr) => 
            Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev
          );

      // Determine size based on model config or legacy size
      const size = legacySize || modelConfig.maxSize[orientation];

      // Build the video prompt with avatar context if provided
      let fullPrompt = prompt;
      if (avatarUrl) {
        fullPrompt = `Cinematic ultra-realistic promotional video: ${prompt}. Style: professional, high quality, cinematic lighting, vibrant colors.`;
      }
      
      // Add quality instructions based on resolution
      if (quality === "4k") {
        fullPrompt = `${fullPrompt} Ultra high resolution 4K, maximum detail, professional cinema grade quality.`;
      } else if (quality === "1080p") {
        fullPrompt = `${fullPrompt} Full HD 1080p, sharp details, professional quality.`;
      }

      console.log("Model routing - Requested:", requestedModel, "-> API:", apiModel);
      console.log("Resolution:", size, "| Duration:", duration, "s (requested:", requestedDuration, "s)");
      if (startingFrameUrl) {
        console.log("Starting frame URL provided for video continuation");
      }

      // Create FormData for the request
      const formData = new FormData();
      formData.append("prompt", fullPrompt);
      formData.append("model", apiModel); // Use dynamic model from config
      formData.append("seconds", duration.toString());
      formData.append("size", size);

      // Add starting frame for video continuation (image-to-video)
      if (startingFrameUrl) {
        formData.append("image_url", startingFrameUrl);
        console.log("Added starting frame for video-to-video continuation");
      }

      // Call CometAPI Sora 2 endpoint
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
      console.log("Video task created:", result.id, "| Model:", apiModel, "| Duration:", duration, "s");

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.id,
          status: result.status,
          progress: result.progress || 0,
          model: apiModel,
          requestedModel,
          size,
          duration,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } else if (action === "status") {
      // Check status of a video generation task
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

      // Handle nested data structure from CometAPI
      const videoData = result.data || result;
      const innerData = videoData.data || {};

      // Normalize status to lowercase for comparison
      const rawStatus = videoData.status || innerData.status || videoData.state || "in_progress";
      const taskStatus = rawStatus.toLowerCase();

      // Parse progress (can be "10%" string or number)
      const rawProgress = innerData.progress || videoData.progress || videoData.percent || 0;
      const taskProgress = typeof rawProgress === "string" 
        ? parseInt(rawProgress.replace('%', '')) 
        : rawProgress;

      // Extract timestamps
      const submitTime = videoData.submit_time || innerData.submit_time;
      const finishTime = videoData.finish_time || innerData.finish_time;

      // IMPORTANT: CometAPI returns the video URL in fail_reason when status is SUCCESS
      let videoUrl = undefined;
      if (taskStatus === "success" || taskStatus === "succeeded" || taskStatus === "completed" || taskStatus === "done") {
        // Check fail_reason first (CometAPI quirk)
        if (videoData.fail_reason && videoData.fail_reason.startsWith("http")) {
          videoUrl = videoData.fail_reason;
        } else {
          videoUrl = innerData.output_video || videoData.output_video || 
                     videoData.video_url || innerData.url || videoData.url;
        }
      }

      // Get model and seconds from response
      const model = innerData.model || videoData.model || "sora-2";
      const seconds = innerData.seconds || videoData.seconds || 12;

      console.log("Parsed - Status:", taskStatus, "Progress:", taskProgress, "VideoUrl:", videoUrl, "SubmitTime:", submitTime, "FinishTime:", finishTime);

      // Map CometAPI status to our status
      let mappedStatus: "queued" | "in_progress" | "completed" | "failed" = "in_progress";
      if (taskStatus === "queued" || taskStatus === "pending" || taskStatus === "waiting") {
        mappedStatus = "queued";
      } else if (taskStatus === "completed" || taskStatus === "succeeded" || taskStatus === "success" || taskStatus === "done") {
        mappedStatus = "completed";
      } else if (taskStatus === "failed" || taskStatus === "error") {
        mappedStatus = "failed";
      }

      const statusResponse = {
        id: taskId,
        status: mappedStatus,
        progress: typeof taskProgress === "number" ? taskProgress : parseInt(taskProgress) || 0,
        videoUrl,
        submitTime,
        finishTime,
        model,
        seconds,
      };

      return new Response(
        JSON.stringify(statusResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (action === "download") {
      // Download the generated video content
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

      // Stream the video content back
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
