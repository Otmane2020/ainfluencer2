import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const KIE_API_BASE = "https://kie.ai/api";

type VideoModel = 
  | "wan-2.6"
  | "kling-2.6";

type VideoMode = 
  | "text-to-video"
  | "image-to-video"
  | "video-to-video";

interface CreateRequest {
  model: VideoModel;
  mode: VideoMode;
  prompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  duration?: 5 | 10 | 15;
  resolution?: "720p" | "1080p";
  withAudio?: boolean;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

function getKieApiKey(): string {
  const key = Deno.env.get("KIE_API_KEY");
  if (!key) throw new Error("KIE_API_KEY is not configured");
  return key;
}

function getKieHeaders(): Record<string, string> {
  return {
    "Authorization": `Bearer ${getKieApiKey()}`,
    "Content-Type": "application/json",
  };
}

// Build endpoint based on model and mode
function getEndpoint(model: VideoModel, mode: VideoMode): string {
  const modelPath = model === "wan-2.6" ? "wan/2.6" : "kling/2.6";
  const modePath = mode.replace("to-", "2");
  return `/v1/${modelPath}/${modePath}`;
}

async function createVideoTask(params: CreateRequest): Promise<{
  success: boolean;
  taskId?: string;
  estimatedCredits?: number;
  error?: string;
}> {
  const { model, mode, prompt, imageUrl, videoUrl, duration = 5, resolution = "720p", withAudio = false, aspectRatio = "16:9" } = params;

  // Validate required inputs
  if (mode === "text-to-video" && !prompt) {
    return { success: false, error: "prompt is required for text-to-video" };
  }
  if (mode === "image-to-video" && !imageUrl) {
    return { success: false, error: "imageUrl is required for image-to-video" };
  }
  if (mode === "video-to-video" && !videoUrl) {
    return { success: false, error: "videoUrl is required for video-to-video" };
  }

  const endpoint = getEndpoint(model, mode);

  // Build payload based on model
  let payload: Record<string, unknown> = {};

  if (model === "wan-2.6") {
    payload = {
      prompt: prompt || "",
      ...(imageUrl && { image_url: imageUrl }),
      ...(videoUrl && { video_url: videoUrl }),
      duration: `${duration}s`,
      resolution,
      aspect_ratio: aspectRatio,
    };
  } else if (model === "kling-2.6") {
    payload = {
      prompt: prompt || "",
      ...(imageUrl && { image_url: imageUrl }),
      ...(videoUrl && { video_url: videoUrl }),
      duration: `${duration}s`,
      with_audio: withAudio,
      aspect_ratio: aspectRatio,
    };
  }

  // Estimate credits
  let estimatedCredits = 70; // Base for 5s 720p
  if (model === "wan-2.6") {
    if (resolution === "1080p") estimatedCredits = duration === 5 ? 105 : duration === 10 ? 210 : 315;
    else estimatedCredits = duration === 5 ? 70 : duration === 10 ? 140 : 210;
  } else if (model === "kling-2.6") {
    if (withAudio) estimatedCredits = duration === 5 ? 110 : 220;
    else estimatedCredits = duration === 5 ? 55 : 110;
  }

  console.log(`[KIE-Video] Creating task: ${model} ${mode}`, { endpoint, duration, resolution });

  try {
    const response = await fetch(`${KIE_API_BASE}${endpoint}`, {
      method: "POST",
      headers: getKieHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE-Video] Error ${response.status}:`, errorText.slice(0, 300));
      
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please try again later." };
      }
      if (response.status === 401) {
        return { success: false, error: "KIE API authentication failed." };
      }
      
      return { success: false, error: `KIE API error: ${response.status}` };
    }

    const data = await response.json();
    
    if (data.code !== 0 && data.code !== 200 && !data.task_id) {
      return { success: false, error: data.message || data.msg || "Unknown KIE error" };
    }

    const taskId = data.task_id || data.data?.task_id;
    if (!taskId) {
      return { success: false, error: "No task_id in response" };
    }

    console.log(`[KIE-Video] Task created: ${taskId} (est. ${estimatedCredits} credits)`);
    return { success: true, taskId, estimatedCredits };
  } catch (error) {
    console.error("[KIE-Video] Exception:", error);
    return { success: false, error: String(error) };
  }
}

async function checkTaskStatus(taskId: string): Promise<{
  success: boolean;
  status?: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  duration?: number;
  error?: string;
}> {
  try {
    console.log(`[KIE-Video] Checking status: ${taskId}`);
    
    const response = await fetch(`${KIE_API_BASE}/v1/task/${taskId}`, {
      method: "GET",
      headers: getKieHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE-Video] Status check failed:`, errorText.slice(0, 300));
      return { success: false, error: `Status check failed: ${response.status}` };
    }

    const data = await response.json();
    
    // Map KIE status to our status
    const kieStatus = data.status || data.data?.status || "pending";
    let status: "pending" | "processing" | "completed" | "failed";
    
    switch (kieStatus.toLowerCase()) {
      case "success":
      case "completed":
      case "succeed":
        status = "completed";
        break;
      case "failed":
      case "error":
        status = "failed";
        break;
      case "processing":
      case "running":
        status = "processing";
        break;
      default:
        status = "pending";
    }

    const result = data.result || data.data?.result || data.data;
    const videoUrl = result?.url || result?.video_url;
    const duration = result?.duration;

    return {
      success: true,
      status,
      videoUrl,
      duration,
      error: data.error || data.data?.error,
    };
  } catch (error) {
    console.error("[KIE-Video] Status check exception:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "create";

    // Status check
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        return new Response(
          JSON.stringify({ success: false, error: "taskId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await checkTaskStatus(taskId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create task
    if (action === "create" && req.method === "POST") {
      const body: CreateRequest = await req.json();

      if (!body.model) {
        return new Response(
          JSON.stringify({ success: false, error: "model is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!body.mode) {
        return new Response(
          JSON.stringify({ success: false, error: "mode is required (text-to-video, image-to-video, or video-to-video)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await createVideoTask(body);
      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // List available models
    if (action === "models") {
      return new Response(
        JSON.stringify({
          success: true,
          models: [
            {
              id: "wan-2.6",
              name: "Wan 2.6",
              modes: ["text-to-video", "image-to-video", "video-to-video"],
              durations: [5, 10, 15],
              resolutions: ["720p", "1080p"],
              priceRange: "$0.35 - $1.575",
            },
            {
              id: "kling-2.6",
              name: "Kling 2.6",
              modes: ["text-to-video", "image-to-video"],
              durations: [5, 10],
              supportsAudio: true,
              priceRange: "$0.275 - $1.10",
            },
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KIE-Video] Server error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
