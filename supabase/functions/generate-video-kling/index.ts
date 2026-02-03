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
      throw new Error("KLING API credentials missing");
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
      } = (await req.json()) as KlingLipSyncRequest;

      if (!imageUrl || !audioUrl) {
        throw new Error("imageUrl and audioUrl are required");
      }

      console.log("[Kling] Creating lip-sync task...", {
        imageUrl: imageUrl.substring(0, 100) + "...",
        audioUrl: audioUrl.substring(0, 100) + "...",
        duration,
        aspectRatio,
      });

      // Try lip-sync endpoint first (expects video_url)
      const response = await fetch(
        `${KLING_API_BASE}/v1/videos/lip-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              video_url: imageUrl, // Kling lip-sync expects a video URL
              audio_url: audioUrl,
            },
            config: {
              duration: Math.min(Math.max(1, duration), 30),
              aspect_ratio: aspectRatio,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Kling] Lip-sync API Error:", response.status, errorText);
        
        // If lip-sync fails (likely because we're passing an image, not a video),
        // fallback to image2video endpoint
        console.log("[Kling] Trying image2video endpoint as fallback...");
        
        const image2videoResponse = await fetch(
          `${KLING_API_BASE}/v1/videos/image2video`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: {
                image_url: imageUrl,
                prompt: "A person speaking naturally with lip movements matching the audio",
              },
              config: {
                duration: Math.min(Math.max(1, duration), 10),
                aspect_ratio: aspectRatio,
                model_name: "kling-v1-5",
              },
            }),
          },
        );
        
        if (!image2videoResponse.ok) {
          const fallbackError = await image2videoResponse.text();
          console.error("[Kling] Image2video fallback failed:", fallbackError);
          throw new Error(`Kling API error: ${errorText}. Fallback also failed: ${fallbackError}`);
        }
        
        const result = (await image2videoResponse.json()) as KlingResponse;
        console.log("[Kling] Image2video task created:", result);
        
        if (result.code !== 0 || !result.data?.task_id) {
          throw new Error(result.message || "Failed to create Kling task via image2video");
        }

        return new Response(
          JSON.stringify({
            success: true,
            taskId: result.data.task_id,
            status: result.data.task_status,
            requestId: result.request_id,
            endpoint: "image2video",
            note: "Created via image2video (lip-sync requires video input)",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = (await response.json()) as KlingResponse;
      console.log("[Kling] Lip-sync task created:", result);

      if (result.code !== 0 || !result.data?.task_id) {
        throw new Error(result.message || "Failed to create Kling task");
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.data.task_id,
          status: result.data.task_status,
          requestId: result.request_id,
          endpoint: "lip-sync",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ---------- STATUS ---------- */
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) throw new Error("taskId is required");

      console.log(`[Kling] Checking status for task: ${taskId}`);

      // Try lip-sync status endpoint first
      const response = await fetch(
        `${KLING_API_BASE}/v1/videos/lip-sync/${taskId}`,
        {
          headers: { Authorization: `Bearer ${jwtToken}` },
        },
      );

      if (!response.ok) {
        // If not found in lip-sync, try image2video endpoint
        console.log(`[Kling] Task not found in lip-sync, trying image2video...`);
        
        const image2videoResponse = await fetch(
          `${KLING_API_BASE}/v1/videos/image2video/${taskId}`,
          {
            headers: { Authorization: `Bearer ${jwtToken}` },
          },
        );
        
        if (!image2videoResponse.ok) {
          const errorText = await image2videoResponse.text();
          throw new Error(`Task ${taskId} not found: ${errorText}`);
        }
        
        const result = (await image2videoResponse.json()) as KlingResponse;
        console.log(`[Kling] Image2video status:`, JSON.stringify(result));
        
        const klingStatus = result.data?.task_status ?? "unknown";
        const video = result.data?.task_result?.videos?.[0];

        return new Response(
          JSON.stringify({
            success: true,
            status: mapKlingStatus(klingStatus),
            klingStatus,
            videoUrl: video?.url ?? null,
            duration: video?.duration ?? null,
            endpoint: "image2video",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = (await response.json()) as KlingResponse;
      console.log(`[Kling] Lip-sync status:`, JSON.stringify(result));

      const klingStatus = result.data?.task_status ?? "unknown";
      const video = result.data?.task_result?.videos?.[0];

      return new Response(
        JSON.stringify({
          success: true,
          status: mapKlingStatus(klingStatus),
          klingStatus,
          videoUrl: video?.url ?? null,
          duration: video?.duration ?? null,
          endpoint: "lip-sync",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
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

/* ===================== HELPERS ===================== */
function mapKlingStatus(klingStatus: string): "queued" | "processing" | "completed" | "failed" {
  switch (klingStatus.toLowerCase()) {
    case "processing":
    case "running":
      return "processing";
    case "completed":
    case "succeed":
    case "success":
      return "completed";
    case "failed":
    case "error":
      return "failed";
    default:
      return "queued";
  }
}
