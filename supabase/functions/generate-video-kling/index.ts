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
  mode?: "fast" | "quality";
  modelName?: "std" | "pro" | "kling-v1-5";
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
        mode = "fast",
        modelName = "kling-v1-5",
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

      console.log("[Kling] Creating video task...", {
        imageUrl: imageUrl.substring(0, 100) + "...",
        audioUrl: audioUrl.substring(0, 100) + "...",
        duration,
        aspectRatio,
        mode,
        modelName,
      });

      // Attempt 1: Try image2video with audio
      try {
        console.log("[Kling] Trying image2video with audio...");
        
        const requestBody = {
          input: {
            image_url: imageUrl,
            prompt: "A realistic person speaking naturally, with synchronized lip movements",
            audio_url: audioUrl,
          },
          config: {
            duration: Math.min(Math.max(1, duration), 10),
            aspect_ratio: aspectRatio,
            model_name: modelName,
          },
        };

        console.log("[Kling] Request body:", JSON.stringify(requestBody));

        const response = await fetch(
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Kling] Image2video failed:", errorText);
          
          // Attempt 2: Try lip-sync with mode
          console.log("[Kling] Trying lip-sync endpoint...");
          
          const lipSyncBody = {
            input: {
              video_url: imageUrl,
              audio_url: audioUrl,
              mode: mode,
            },
            config: {
              duration: Math.min(Math.max(1, duration), 30),
            },
          };

          const lipSyncResponse = await fetch(
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

          if (!lipSyncResponse.ok) {
            const lipSyncError = await lipSyncResponse.text();
            console.error("[Kling] Lip-sync failed:", lipSyncError);
            
            // Attempt 3: Try simple image2video without audio
            console.log("[Kling] Trying simple image2video without audio...");
            
            const simpleImage2VideoBody = {
              input: {
                image_url: imageUrl,
                prompt: "A person looking at camera, realistic facial expressions",
              },
              config: {
                duration: Math.min(Math.max(1, duration), 10),
                aspect_ratio: aspectRatio,
                model_name: modelName,
              },
            };

            const simpleResponse = await fetch(
              `${KLING_API_BASE}/v1/videos/image2video`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${jwtToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(simpleImage2VideoBody),
              },
            );

            if (!simpleResponse.ok) {
              const simpleError = await simpleResponse.text();
              console.error("[Kling] Simple image2video failed:", simpleError);
              
              throw new Error(`All Kling endpoints failed. Image2video: ${errorText}, Lip-sync: ${lipSyncError}, Simple: ${simpleError}`);
            }

            const simpleResult = (await simpleResponse.json()) as KlingResponse;
            
            if (simpleResult.code !== 0 || !simpleResult.data?.task_id) {
              throw new Error(simpleResult.message || "Failed to create simple video task");
            }

            return new Response(
              JSON.stringify({
                success: true,
                taskId: simpleResult.data.task_id,
                status: simpleResult.data.task_status,
                requestId: simpleResult.request_id,
                note: "Created video without audio lip-sync",
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const lipSyncResult = (await lipSyncResponse.json()) as KlingResponse;
          
          if (lipSyncResult.code !== 0 || !lipSyncResult.data?.task_id) {
            throw new Error(lipSyncResult.message || "Failed to create lip-sync task");
          }

          return new Response(
            JSON.stringify({
              success: true,
              taskId: lipSyncResult.data.task_id,
              status: lipSyncResult.data.task_status,
              requestId: lipSyncResult.request_id,
              note: "Created via lip-sync endpoint",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const result = (await response.json()) as KlingResponse;
        console.log("[Kling] Task created via image2video:", result);

        if (result.code !== 0 || !result.data?.task_id) {
          throw new Error(result.message || "Failed to create Kling task");
        }

        return new Response(
          JSON.stringify({
            success: true,
            taskId: result.data.task_id,
            status: result.data.task_status,
            requestId: result.request_id,
            note: "Created via image2video with audio",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

      } catch (error) {
        console.error("[Kling] All endpoints failed:", error);
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

      // Try different status endpoints
      const endpoints = [
        `${KLING_API_BASE}/v1/videos/image2video/${taskId}`,
        `${KLING_API_BASE}/v1/videos/lip-sync/${taskId}`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`[Kling] Trying status endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${jwtToken}` },
          });
          
          if (response.ok) {
            const result = (await response.json()) as KlingResponse;
            console.log(`[Kling] Found task at: ${endpoint}`, result);

            const klingStatus = result.data?.task_status ?? "unknown";
            const video = result.data?.task_result?.videos?.[0];

            // Determine simplified status
            let status: string;
            switch (klingStatus.toLowerCase()) {
              case "processing":
              case "running":
                status = "in_progress";
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
              case "queued":
              case "pending":
                status = "queued";
                break;
              default:
                status = "queued";
            }

            return new Response(
              JSON.stringify({
                success: true,
                status,
                klingStatus,
                videoUrl: video?.url || null,
                duration: video?.duration || null,
                endpoint: endpoint.includes("image2video") ? "image2video" : "lip-sync",
                message: result.message,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          } else if (response.status !== 404) {
            const errorText = await response.text();
            console.warn(`[Kling] Status endpoint ${endpoint} returned ${response.status}: ${errorText}`);
          }
        } catch (error) {
          console.warn(`[Kling] Error checking endpoint ${endpoint}:`, error instanceof Error ? error.message : "Unknown error");
        }
      }

      // If no endpoint works
      return new Response(
        JSON.stringify({
          success: false,
          error: `Task ${taskId} not found on any endpoint`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
