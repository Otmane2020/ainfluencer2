import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* -------------------- CORS -------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* -------------------- Constants -------------------- */
const KLING_API_BASE = "https://api.klingai.com";

/* -------------------- Types -------------------- */
interface KlingAvatarRequest {
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

/* -------------------- Utils -------------------- */
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

/* -------------------- JWT -------------------- */
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

/* -------------------- Server -------------------- */
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

    const jwt = await generateKlingJWT(KLING_API_KEY, KLING_API_SECRET);
    console.log("[KLING] JWT generated successfully");

    /* ---------- CREATE (AI Avatar) ---------- */
    if (action === "create" && req.method === "POST") {
      const {
        imageUrl,
        audioUrl,
        aspectRatio = "9:16",
      } = (await req.json()) as KlingAvatarRequest;

      if (!imageUrl || !audioUrl) {
        throw new Error("imageUrl and audioUrl are required");
      }

      console.log("[KLING] Creating AI Avatar task:", {
        imageUrl: imageUrl.substring(0, 50) + "...",
        audioUrl: audioUrl.substring(0, 50) + "...",
        aspectRatio,
      });

      // Use AI Avatar endpoint for portrait image + audio → talking video
      const res = await fetch(`${KLING_API_BASE}/v1/videos/ai-avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_name: "kling-v1",
          input: {
            image_url: imageUrl,
            audio_url: audioUrl,
            mode: "audio",
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[KLING] API error:", res.status, errorText);
        throw new Error(`Kling API error: ${res.status} - ${errorText}`);
      }

      const json = (await res.json()) as KlingResponse;
      console.log("[KLING] Task created:", json);

      if (json.code !== 0 || !json.data?.task_id) {
        throw new Error(json.message || "Kling task creation failed");
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId: json.data.task_id,
          status: json.data.task_status,
          requestId: json.request_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ---------- STATUS ---------- */
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) throw new Error("taskId is required");

      console.log("[KLING] Checking status for task:", taskId);

      const res = await fetch(
        `${KLING_API_BASE}/v1/videos/ai-avatar/${taskId}`,
        { headers: { Authorization: `Bearer ${jwt}` } },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[KLING] Status check error:", res.status, errorText);
        throw new Error(`Kling status error: ${res.status}`);
      }

      const json = (await res.json()) as KlingResponse;
      console.log("[KLING] Status result:", json);

      const klingStatus = json.data?.task_status ?? "unknown";
      const video = json.data?.task_result?.videos?.[0] ?? null;

      // Map Kling status to our format
      let status: "queued" | "in_progress" | "completed" | "failed" = "queued";
      if (klingStatus === "processing") status = "in_progress";
      if (klingStatus === "completed" || klingStatus === "succeed") status = "completed";
      if (klingStatus === "failed" || klingStatus === "error") status = "failed";

      return new Response(
        JSON.stringify({
          success: true,
          status,
          klingStatus,
          videoUrl: video?.url ?? null,
          duration: video?.duration ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("[KLING] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
