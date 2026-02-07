import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const KIE_API_BASE = "https://api.kie.ai/api";

type ImageModel = 
  | "recraft-remove-bg"
  | "recraft-upscale"
  | "qwen-zimage"
  | "flux-2-flex"
  | "flux-2-pro"
  | "flux-kontext"
  | "grok-imagine"
  | "ideogram-v3-remix"
  | "ideogram-v3-edit"
  | "ideogram-v3-reframe";

interface CreateRequest {
  model: ImageModel;
  prompt?: string;
  imageUrl?: string;
  aspectRatio?: string;
  quality?: "turbo" | "balanced" | "quality";
  resolution?: "1k" | "2k";
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

// Model to endpoint mapping
const MODEL_ENDPOINTS: Record<ImageModel, string> = {
  "recraft-remove-bg": "/v1/recraft/remove-background",
  "recraft-upscale": "/v1/recraft/crisp-upscale",
  "qwen-zimage": "/v1/qwen/z-image",
  "flux-2-flex": "/v1/flux/2-flex",
  "flux-2-pro": "/v1/flux/2-pro",
  "flux-kontext": "/v1/flux/kontext",
  "grok-imagine": "/v1/grok/imagine",
  "ideogram-v3-remix": "/v1/ideogram/v3-remix",
  "ideogram-v3-edit": "/v1/ideogram/v3-edit",
  "ideogram-v3-reframe": "/v1/ideogram/v3-reframe",
};

async function createImageTask(
  model: ImageModel,
  params: CreateRequest
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const endpoint = MODEL_ENDPOINTS[model];
  if (!endpoint) {
    return { success: false, error: `Unknown model: ${model}` };
  }

  // Build request payload based on model
  let payload: Record<string, unknown> = {};

  switch (model) {
    case "recraft-remove-bg":
    case "recraft-upscale":
      if (!params.imageUrl) {
        return { success: false, error: "imageUrl is required for Recraft" };
      }
      payload = { image_url: params.imageUrl };
      break;

    case "qwen-zimage":
    case "grok-imagine":
      if (!params.prompt) {
        return { success: false, error: "prompt is required" };
      }
      payload = { 
        prompt: params.prompt,
        ...(params.imageUrl && { image_url: params.imageUrl }),
      };
      break;

    case "flux-2-flex":
    case "flux-2-pro":
      payload = {
        prompt: params.prompt || "",
        ...(params.imageUrl && { image_url: params.imageUrl }),
        resolution: params.resolution || "1k",
        aspect_ratio: params.aspectRatio || "1:1",
      };
      break;

    case "flux-kontext":
      payload = {
        prompt: params.prompt || "",
        ...(params.imageUrl && { image_url: params.imageUrl }),
        mode: params.quality === "quality" ? "max" : "pro",
      };
      break;

    case "ideogram-v3-remix":
    case "ideogram-v3-edit":
    case "ideogram-v3-reframe":
      if (!params.imageUrl) {
        return { success: false, error: "imageUrl is required for Ideogram" };
      }
      payload = {
        image_url: params.imageUrl,
        prompt: params.prompt || "",
        rendering_mode: params.quality?.toUpperCase() || "BALANCED",
      };
      break;

    default:
      return { success: false, error: `Unsupported model: ${model}` };
  }

  console.log(`[KIE-Image] Creating task: ${model}`, endpoint);

  try {
    const response = await fetch(`${KIE_API_BASE}${endpoint}`, {
      method: "POST",
      headers: getKieHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE-Image] Error ${response.status}:`, errorText.slice(0, 300));
      
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

    console.log(`[KIE-Image] Task created: ${taskId}`);
    return { success: true, taskId };
  } catch (error) {
    console.error("[KIE-Image] Exception:", error);
    return { success: false, error: String(error) };
  }
}

async function checkTaskStatus(taskId: string): Promise<{
  success: boolean;
  status?: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  imageUrls?: string[];
  error?: string;
}> {
  try {
    console.log(`[KIE-Image] Checking status: ${taskId}`);
    
    const response = await fetch(`${KIE_API_BASE}/v1/task/${taskId}`, {
      method: "GET",
      headers: getKieHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE-Image] Status check failed:`, errorText.slice(0, 300));
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
    const imageUrl = result?.url || result?.image_url;
    const imageUrls = result?.urls || result?.image_urls;

    return {
      success: true,
      status,
      imageUrl,
      imageUrls,
      error: data.error || data.data?.error,
    };
  } catch (error) {
    console.error("[KIE-Image] Status check exception:", error);
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

      const result = await createImageTask(body.model, body);
      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KIE-Image] Server error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
