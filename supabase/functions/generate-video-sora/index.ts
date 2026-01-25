import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoRequest {
  prompt: string;
  avatarUrl?: string;
  duration?: number; // 4, 8, or 12 seconds
  size?: string; // "720x1280" (portrait) or "1280x720" (landscape)
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
      const { prompt, avatarUrl, duration = 4, size = "720x1280" }: VideoRequest = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Build the video prompt with avatar context if provided
      let fullPrompt = prompt;
      if (avatarUrl) {
        fullPrompt = `Vidéo publicitaire cinématographique ultra réaliste: ${prompt}. Style: professionnel, haute qualité, éclairage cinématographique, couleurs vibrantes.`;
      }

      console.log("Creating video with prompt:", fullPrompt.substring(0, 100) + "...");
      console.log("Duration:", duration, "Size:", size);

      // Create FormData for the request
      const formData = new FormData();
      formData.append("prompt", fullPrompt);
      formData.append("model", "sora-2");
      formData.append("seconds", duration.toString());
      formData.append("size", size);

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
      console.log("Video task created:", result.id);

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.id,
          status: result.status,
          progress: result.progress || 0,
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
      console.log("Task status:", result.status, "Progress:", result.progress);

      const statusResponse: VideoStatusResponse = {
        id: result.id,
        status: result.status,
        progress: result.progress || 0,
      };

      if (result.status === "completed" && result.output_video) {
        statusResponse.videoUrl = result.output_video;
      }

      if (result.error) {
        statusResponse.error = result.error;
      }

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
