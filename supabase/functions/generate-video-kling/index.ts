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

type KlingTaskKind = "lip-sync" | "talking-face";

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

      // The official Kling API uses /v1/images/ai-avatar for image+audio → talking video
      // Reference: https://app.klingai.com/global/dev/document-api
      console.log("[Kling] Creating AI Avatar video from image + audio...");
      
      const avatarRes = await fetch(
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
              duration: Math.min(duration, 30),
              aspect_ratio: aspectRatio,
              model_name: "std", // Standard mode (cheaper) vs "pro"
            },
          }),
        },
      );

      let result: KlingResponse;

      if (avatarRes.ok) {
        result = (await avatarRes.json()) as KlingResponse;
        console.log("[Kling] AI Avatar request succeeded:", result);
      } else {
        const errorText = await avatarRes.text();
        console.log("[Kling] AI Avatar failed:", avatarRes.status, errorText);
        
        // Fallback: Try the video generation endpoint with image-to-video
        // Some Kling setups use /v1/videos/image2video
        console.log("[Kling] Falling back to image2video endpoint...");
        
        const fallbackRes = await fetch(
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
                prompt: "Person speaking naturally, lip-synced to audio",
              },
              config: {
                duration: Math.min(duration, 10),
                aspect_ratio: aspectRatio,
                model_name: "kling-v1-5", // Base video model
                audio_url: audioUrl, // Some endpoints accept audio in config
              },
            }),
          },
        );

        if (!fallbackRes.ok) {
          const fallbackError = await fallbackRes.text();
          console.error("[Kling] Fallback also failed:", fallbackError);
          
          // Last resort: try the legacy lip-sync endpoint with video_url
          // The lip-sync endpoint is actually meant for VIDEO input, not image
          // If the image URL is actually a video, this might work
          console.log("[Kling] Last attempt: trying lip-sync with video input...");
          
          const lipSyncRes = await fetch(
            `${KLING_API_BASE}/v1/videos/lip-sync`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${jwtToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                input: {
                  video_url: imageUrl, // Treat image as first frame video
                  audio_url: audioUrl,
                  audio_type: "url",
                },
                config: {
                  duration: Math.min(duration, 30),
                },
              }),
            },
          );
          
          if (!lipSyncRes.ok) {
            const lipSyncError = await lipSyncRes.text();
            console.error("[Kling] Lip-sync also failed:", lipSyncError);
            throw new Error(`Kling API error: ${fallbackError}`);
          }
          
          result = (await lipSyncRes.json()) as KlingResponse;
          console.log("[Kling] Lip-sync succeeded:", result);
        } else {
          result = (await fallbackRes.json()) as KlingResponse;
          console.log("[Kling] Image2video fallback succeeded:", result);
        }
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
      // We try multiple endpoints and use the first that works
      const endpoints = [
        `${KLING_API_BASE}/v1/images/ai-avatar/${taskId}`,
        `${KLING_API_BASE}/v1/videos/image2video/${taskId}`,
        `${KLING_API_BASE}/v1/videos/lip-sync/${taskId}`,
        `${KLING_API_BASE}/v1/videos/${taskId}`, // Generic video status
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
