import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Kling API endpoints
const KLING_API_BASE = "https://api.klingai.com";

interface KlingLipSyncRequest {
  imageUrl: string;        // Portrait image URL
  audioUrl: string;        // Audio URL for lip-sync
  duration?: number;       // Video duration
  aspectRatio?: string;    // "9:16", "16:9", "1:1"
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "create";

  try {
    const KLING_API_KEY = Deno.env.get("KLING_API_KEY");
    if (!KLING_API_KEY) {
      throw new Error("KLING_API_KEY is not configured");
    }

    // ACTION: Create lip-sync video task
    if (action === "create" && req.method === "POST") {
      const body: KlingLipSyncRequest = await req.json();
      const { imageUrl, audioUrl, duration = 5, aspectRatio = "9:16" } = body;

      if (!imageUrl) {
        throw new Error("imageUrl is required");
      }
      if (!audioUrl) {
        throw new Error("audioUrl is required");
      }

      console.log("[KLING] Creating lip-sync video task:", {
        imageUrl: imageUrl.substring(0, 50) + "...",
        audioUrl: audioUrl.substring(0, 50) + "...",
        duration,
        aspectRatio,
      });

      // Call Kling API to create lip-sync task
      // Using the video/lip-sync endpoint for talking avatar
      const response = await fetch(`${KLING_API_BASE}/v1/videos/lip-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${KLING_API_KEY}`,
        },
        body: JSON.stringify({
          input: {
            face_image_url: imageUrl,
            audio_url: audioUrl,
            audio_type: "url",
          },
          config: {
            duration: Math.min(duration, 30), // Max 30s for Kling
            aspect_ratio: aspectRatio,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[KLING] API error:", response.status, errorText);
        throw new Error(`Kling API error: ${response.status} - ${errorText}`);
      }

      const result: KlingResponse = await response.json();
      console.log("[KLING] Task created:", result);

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
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION: Check task status
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId parameter is required");
      }

      console.log("[KLING] Checking status for task:", taskId);

      const response = await fetch(`${KLING_API_BASE}/v1/videos/lip-sync/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${KLING_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[KLING] Status check error:", response.status, errorText);
        throw new Error(`Kling status error: ${response.status}`);
      }

      const result: KlingResponse = await response.json();
      console.log("[KLING] Status result:", result);

      const taskStatus = result.data?.task_status || "unknown";
      const videos = result.data?.task_result?.videos || [];

      // Map Kling status to our status format
      let status: "queued" | "in_progress" | "completed" | "failed" = "queued";
      if (taskStatus === "processing") status = "in_progress";
      if (taskStatus === "completed" || taskStatus === "succeed") status = "completed";
      if (taskStatus === "failed" || taskStatus === "error") status = "failed";

      return new Response(
        JSON.stringify({
          success: true,
          status,
          klingStatus: taskStatus,
          videoUrl: videos.length > 0 ? videos[0].url : null,
          duration: videos.length > 0 ? videos[0].duration : null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("[KLING] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
