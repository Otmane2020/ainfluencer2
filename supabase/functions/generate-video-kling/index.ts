import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ===================== CORS ===================== */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* ===================== CONSTANTS ===================== */
const KLING_API_BASE = "https://api.klingai.com";

/* ===================== TYPES ===================== */
interface KlingLipSyncRequest {
  imageUrl: string;
  audioUrl: string;
  duration?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  modelName?: "std" | "pro";
}

interface KlingResponse {
  code: number;
  message: string;
  request_id: string;
  data?: {
    task_id: string;
    task_status: string;
    task_result?: {
      videos?: Array<{ url: string; duration: number }>;
    };
  };
}

/* ===================== UTILS ===================== */
const base64Url = (input: Uint8Array | string): string => {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input;

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/* ===================== JWT ===================== */
async function generateKlingJWT(
  accessKeyId: string,
  accessKeySecret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: accessKeyId,
      exp: now + 1800,
      nbf: now - 5,
    }),
  );

  const data = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(accessKeySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );

  return `${data}.${base64Url(new Uint8Array(signature))}`;
}

/* ===================== SERVER ===================== */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "create";

    const KLING_API_KEY = Deno.env.get("KLING_API_KEY");
    const KLING_API_SECRET = Deno.env.get("KLING_API_SECRET");

    if (!KLING_API_KEY || !KLING_API_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "KLING API credentials missing",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const jwtToken = await generateKlingJWT(
      KLING_API_KEY,
      KLING_API_SECRET,
    );

    /* ---------- CREATE TASK ---------- */
    if (action === "create" && req.method === "POST") {
      const {
        imageUrl,
        audioUrl,
        duration = 5,
        aspectRatio = "9:16",
        modelName = "std",
      } = (await req.json()) as KlingLipSyncRequest;

      if (!imageUrl || !audioUrl) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "imageUrl and audioUrl are required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Validate duration
      const validatedDuration = Math.min(Math.max(1, duration), 30);
      
      // Validate aspect ratio
      const validAspectRatios = ["9:16", "16:9", "1:1"];
      const validatedAspectRatio = validAspectRatios.includes(aspectRatio) 
        ? aspectRatio 
        : "9:16";

      console.log("[Kling] Creating AI Avatar video...", {
        imageUrl: imageUrl.substring(0, 100) + "...",
        audioUrl: audioUrl.substring(0, 100) + "...",
        duration: validatedDuration,
        aspectRatio: validatedAspectRatio,
        modelName,
      });

      try {
        const response = await fetch(
          `${KLING_API_BASE}/v1/images/ai-avatar`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: {
                image_url: imageUrl,
                audio_url: audioUrl,
              },
              config: {
                duration: validatedDuration,
                aspect_ratio: validatedAspectRatio,
                model_name: modelName,
              },
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Kling] API Error:", response.status, errorText);
          throw new Error(`Kling API error: ${response.status} - ${errorText}`);
        }

        const result = (await response.json()) as KlingResponse;
        console.log("[Kling] Task created:", result);

        if (result.code !== 0 || !result.data?.task_id) {
          throw new Error(result.message || "Failed to create Kling task");
        }

        return new Response(
          JSON.stringify({
            success: true,
            taskId: result.data.task_id,
            status: result.data.task_status,
            requestId: result.request_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (error) {
        console.error("[Kling] Create task failed:", error);
        throw error;
      }
    }

    /* ---------- STATUS ---------- */
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "taskId is required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(`[Kling] Checking status for task: ${taskId}`);

      // Try different endpoints in order
      const endpoints = [
        `${KLING_API_BASE}/v1/images/ai-avatar/${taskId}`,
        `${KLING_API_BASE}/v1/videos/image2video/${taskId}`,
        `${KLING_API_BASE}/v1/videos/lip-sync/${taskId}`,
      ];

      let response: Response | null = null;
      let successfulEndpoint = "";
      const errorDetails: string[] = [];

      for (const endpoint of endpoints) {
        try {
          console.log(`[Kling] Trying endpoint: ${endpoint}`);
          const r = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${jwtToken}` },
          });
          
          if (r.ok) {
            response = r;
            successfulEndpoint = endpoint;
            console.log(`[Kling] Found task at: ${endpoint}`);
            break;
          } else {
            const errorText = await r.text();
            errorDetails.push(`${endpoint}: ${r.status} - ${errorText}`);
            
            // If it's a client error (not found), continue to next endpoint
            if (r.status === 404) {
              console.log(`[Kling] Task not found at: ${endpoint}`);
              continue;
            }
            // For auth errors, break and throw
            if (r.status === 401 || r.status === 403) {
              throw new Error(`Authentication error: ${errorText}`);
            }
          }
        } catch (error) {
          errorDetails.push(`${endpoint}: ${(error as Error).message}`);
          // Continue to next endpoint
        }
      }

      if (!response) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Task ${taskId} not found on any endpoint`,
            details: errorDetails,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = (await response.json()) as KlingResponse;
      console.log(`[Kling] Status response:`, result);

      // Map Kling status to our status
      const klingStatus = result.data?.task_status ?? "unknown";
      let status: "queued" | "processing" | "completed" | "failed";
      
      switch (klingStatus.toLowerCase()) {
        case "queued":
        case "pending":
          status = "queued";
          break;
        case "processing":
        case "running":
          status = "processing";
          break;
        case "completed":
        case "succeed":
        case "success":
          status = "completed";
          break;
        case "failed":
        case "error":
          status = "failed";
          break;
        default:
          status = "queued";
      }

      const video = result.data?.task_result?.videos?.[0];

      return new Response(
        JSON.stringify({
          success: true,
          status,
          klingStatus,
          videoUrl: video?.url || null,
          duration: video?.duration || null,
          endpoint: successfulEndpoint,
          message: result.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Unknown action: ${action}. Use 'create' or 'status'`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[Server Error]:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
