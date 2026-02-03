import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ===================== CORS ===================== */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* ===================== CONSTANTS ===================== */
const COMET_API_BASE = "https://comet.did.com";

/* ===================== TYPES ===================== */
interface CometRequest {
  imageUrl: string;
  audioUrl: string;
  duration?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  model?: string;
}

/* ===================== SERVER ===================== */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "create";

    const COMET_API_KEY = Deno.env.get("COMETAPI_API_KEY");

    if (!COMET_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "COMET API key missing. Get one from https://comet.didi.ai",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* ---------- CREATE TASK ---------- */
    if (action === "create" && req.method === "POST") {
      const {
        imageUrl,
        audioUrl,
        duration = 5,
        aspectRatio = "9:16",
        model = "comet-v1",
      } = (await req.json()) as CometRequest;

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

      console.log("[Comet] Creating talking video...", {
        imageUrl: imageUrl.substring(0, 100) + "...",
        audioUrl: audioUrl.substring(0, 100) + "...",
        duration,
        aspectRatio,
        model,
      });

      try {
        // Attempt 1: Use the main talking video endpoint
        console.log("[Comet] Creating task via /v1/tasks...");
        
        const response = await fetch(
          `${COMET_API_BASE}/v1/tasks`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${COMET_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "talking_video",
              parameters: {
                image_url: imageUrl,
                audio_url: audioUrl,
                duration_seconds: Math.min(Math.max(1, duration), 60),
                aspect_ratio: aspectRatio,
                model: model,
                output_format: "mp4",
              },
              webhook_url: null,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Comet] Tasks API Error:", response.status, errorText);
          
          // Attempt 2: Try alternative endpoint structure
          console.log("[Comet] Trying alternative endpoint /v1/generate...");
          
          const altResponse = await fetch(
            `${COMET_API_BASE}/v1/generate`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${COMET_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                input: {
                  image: imageUrl,
                  audio: audioUrl,
                },
                config: {
                  duration: Math.min(Math.max(1, duration), 60),
                  aspect_ratio: aspectRatio,
                  model: model,
                },
              }),
            },
          );
          
          if (!altResponse.ok) {
            const altError = await altResponse.text();
            console.error("[Comet] Generate endpoint failed:", altError);
            
            // Attempt 3: Try simple video endpoint
            console.log("[Comet] Trying simple video generation at /v1/videos...");
            
            const simpleResponse = await fetch(
              `${COMET_API_BASE}/v1/videos`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${COMET_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  image: imageUrl,
                  audio: audioUrl,
                  settings: {
                    duration: duration,
                    ratio: aspectRatio,
                  },
                }),
              },
            );
            
            if (!simpleResponse.ok) {
              const simpleError = await simpleResponse.text();
              console.error("[Comet] Simple endpoint failed:", simpleError);
              
              throw new Error(`All Comet endpoints failed: Tasks: ${errorText}, Generate: ${altError}, Videos: ${simpleError}`);
            }
            
            const result = await simpleResponse.json();
            return handleCometResponse(result);
          }
          
          const result = await altResponse.json();
          return handleCometResponse(result);
        }

        const result = await response.json();
        return handleCometResponse(result);

      } catch (error) {
        console.error("[Comet] Error:", error);
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

      console.log(`[Comet] Checking status for task: ${taskId}`);

      try {
        // Try different status endpoints
        const endpoints = [
          `${COMET_API_BASE}/v1/tasks/${taskId}`,
          `${COMET_API_BASE}/v1/tasks/${taskId}/status`,
          `${COMET_API_BASE}/v1/videos/${taskId}`,
        ];

        for (const endpoint of endpoints) {
          try {
            console.log(`[Comet] Trying status endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
              headers: {
                "Authorization": `Bearer ${COMET_API_KEY}`,
                "Content-Type": "application/json",
              },
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`[Comet] Status response from ${endpoint}:`, result);
              
              return new Response(
                JSON.stringify({
                  success: true,
                  status: mapCometStatus(result.status || result.data?.status),
                  taskId: result.taskId || result.data?.taskId || taskId,
                  videoUrl: result.videoUrl || result.data?.videoUrl || result.output_url || result.result_url,
                  duration: result.duration || result.data?.duration,
                  progress: result.progress || result.data?.progress,
                  message: result.message,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            } else {
              const errorText = await response.text();
              console.warn(`[Comet] Endpoint ${endpoint} returned ${response.status}: ${errorText}`);
            }
          } catch (error) {
            console.warn(`[Comet] Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : "Unknown error");
          }
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: `Task ${taskId} not found`,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );

      } catch (error) {
        console.error("[Comet] Status check error:", error);
        throw error;
      }
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

/* ===================== HELPER FUNCTIONS ===================== */
function handleCometResponse(result: any): Response {
  console.log("[Comet] Task creation result:", result);
  
  const taskId = result.taskId || result.data?.taskId || result.id || result.task_id;
  const status = result.status || result.data?.status || "pending";
  
  if (!taskId) {
    throw new Error("No taskId received from Comet API");
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      taskId,
      status: mapCometStatus(status),
      estimatedTime: result.estimated_time || result.data?.estimated_time,
      message: result.message,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function mapCometStatus(cometStatus: string): string {
  if (!cometStatus) return "queued";
  
  const status = cometStatus.toLowerCase();
  if (status.includes("processing") || status.includes("running")) {
    return "in_progress";
  } else if (status.includes("completed") || status.includes("success") || status.includes("finished") || status.includes("done")) {
    return "completed";
  } else if (status.includes("failed") || status.includes("error")) {
    return "failed";
  } else if (status.includes("queued") || status.includes("pending")) {
    return "queued";
  }
  return "queued";
}
