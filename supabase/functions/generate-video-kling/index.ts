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
  audioUrl?: string; // Optional - if not provided, uses image2video only
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

      if (!imageUrl) {
        throw new Error("imageUrl is required");
      }

      let result: KlingResponse;

      // If audioUrl is provided, use lip-sync endpoint for talking video
      if (audioUrl) {
        console.log("[Kling] Creating lip-sync video with audio...");
        console.log("[Kling] Image URL:", imageUrl);
        console.log("[Kling] Audio URL:", audioUrl);
        
        const lipSyncBody = {
          input: {
            face_image_url: imageUrl,
            audio_url: audioUrl,
          },
        };
        
        console.log("[Kling] Lip-sync request body:", JSON.stringify(lipSyncBody, null, 2));
        
        const lipSyncRes = await fetch(
          `${KLING_API_BASE}/v1/videos/lip-sync`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(lipSyncBody),
          },
        );
        
        const responseText = await lipSyncRes.text();
        console.log("[Kling] Lip-sync response status:", lipSyncRes.status);
        console.log("[Kling] Lip-sync response body:", responseText);
        
        if (!lipSyncRes.ok) {
          throw new Error(`Kling lip-sync API error: ${responseText}`);
        }
        
        result = JSON.parse(responseText) as KlingResponse;
      } else {
        // No audio: use image2video to validate image and create base video
        console.log("[Kling] Creating base video from image (no audio)...");
        console.log("[Kling] Image URL:", imageUrl);
        
        const requestBody = {
          model_name: "kling-v1-6",
          image: imageUrl,
          prompt: "Person with subtle natural movements, slight head motion, blinking, breathing",
          duration: String(Math.min(duration, 10)),
          mode: "std",
          aspect_ratio: aspectRatio,
        };
        
        console.log("[Kling] Image2video request body:", JSON.stringify(requestBody, null, 2));

        const image2videoRes = await fetch(
          `${KLING_API_BASE}/v1/videos/image2video`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        const responseText = await image2videoRes.text();
        console.log("[Kling] Image2video response status:", image2videoRes.status);
        console.log("[Kling] Image2video response body:", responseText);

        if (!image2videoRes.ok) {
          throw new Error(`Kling image2video API error: ${responseText}`);
        }
        
        result = JSON.parse(responseText) as KlingResponse;
      }

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
    }

    /* ---------- STATUS ---------- */
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) throw new Error("taskId is required");

      // Kling uses different status endpoints depending on the task type
      // We try both endpoints and use the first that works
      const endpoints = [
        `${KLING_API_BASE}/v1/videos/image2video/${taskId}`,
        `${KLING_API_BASE}/v1/videos/lip-sync/${taskId}`,
      ];

      let response: Response | null = null;
      let successfulEndpoint = "";

      for (const endpoint of endpoints) {
        console.log(`[Kling] Trying status endpoint: ${endpoint}`);
        const r = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        });
        
        if (r.ok) {
          response = r;
          successfulEndpoint = endpoint;
          console.log(`[Kling] Status endpoint worked: ${endpoint}`);
          break;
        } else if (r.status !== 404) {
          // If it's not a 404, capture the response for error reporting
          const errorText = await r.text();
          console.log(`[Kling] Status endpoint error (${r.status}): ${errorText}`);
          // Continue trying other endpoints unless it's an auth error
          if (r.status === 401 || r.status === 403) {
            throw new Error(`Auth error: ${errorText}`);
          }
        } else {
          console.log(`[Kling] Status endpoint 404: ${endpoint}`);
        }
      }

      if (!response) {
        throw new Error(`Could not find task ${taskId} on any Kling endpoint`);
      }

      const result = (await response.json()) as KlingResponse;
      console.log(`[Kling] Task status response:`, JSON.stringify(result));

      const klingStatus = result.data?.task_status ?? "unknown";
      const video = result.data?.task_result?.videos?.[0];

      return new Response(
        JSON.stringify({
          success: true,
          status:
            klingStatus === "processing"
              ? "in_progress"
              : klingStatus === "completed" || klingStatus === "succeed"
              ? "completed"
              : klingStatus === "failed" || klingStatus === "error"
              ? "failed"
              : "queued",
          klingStatus,
          videoUrl: video?.url ?? null,
          duration: video?.duration ?? null,
          endpoint: successfulEndpoint,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("[Kling] Error:", error);
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
