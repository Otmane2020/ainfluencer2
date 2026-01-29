import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// ============================================================
// KLING VIDEO via CometAPI - Low cost video generation
// ~$0.006-0.02 per second - Perfect for Reels automation
// ============================================================

interface ReelRequest {
  prompt: string;
  brandName?: string;
  duration?: number; // 5 or 10 seconds
  imageUrl?: string; // Optional starting frame for image-to-video
}

// Poll for video completion
async function pollForVideo(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 60
): Promise<string | null> {
  console.log(`[REEL] Polling for task ${taskId}...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s

    try {
      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.log(`[REEL] Poll ${i + 1}/${maxAttempts}: HTTP ${response.status}`);
        continue;
      }

      const result = await response.json();
      const videoData = result.data || result;
      const innerData = videoData.data || {};
      const status = (videoData.status || innerData.status || "").toLowerCase();

      console.log(`[REEL] Poll ${i + 1}/${maxAttempts}: status=${status}`);

      if (status === "completed" || status === "success" || status === "succeeded" || status === "done") {
        // CometAPI quirk: video URL sometimes in fail_reason field
        let videoUrl: string | null = null;
        
        if (videoData.fail_reason && typeof videoData.fail_reason === "string" && videoData.fail_reason.startsWith("http")) {
          videoUrl = videoData.fail_reason;
        } else {
          videoUrl = 
            innerData.output_video || 
            videoData.output_video || 
            videoData.video_url || 
            innerData.url || 
            videoData.url ||
            videoData.output ||
            innerData.output;
        }

        if (videoUrl) {
          console.log(`[REEL] Video ready: ${videoUrl.slice(0, 60)}...`);
          return videoUrl;
        }

        // Try content endpoint as fallback
        try {
          const contentResponse = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const contentUrl = contentData.url || contentData.video_url || contentData.data?.url;
            if (contentUrl) {
              console.log(`[REEL] Video from content endpoint: ${contentUrl.slice(0, 60)}...`);
              return contentUrl;
            }
          }
        } catch (e) {
          console.log("[REEL] Content endpoint fallback failed");
        }
      } else if (status === "failed" || status === "error") {
        console.error("[REEL] Task failed:", videoData.fail_reason || "Unknown error");
        return null;
      }
    } catch (error) {
      console.error(`[REEL] Poll error:`, error);
    }
  }

  console.log("[REEL] Timeout waiting for video");
  return null;
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    if (!COMETAPI_API_KEY) {
      throw new Error("COMETAPI_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    // ============================================================
    // STATUS CHECK (for polling from frontend)
    // ============================================================
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      const videoData = result.data || result;
      const innerData = videoData.data || {};
      const rawStatus = (videoData.status || innerData.status || "in_progress").toLowerCase();

      // Normalize status
      let status = "processing";
      if (rawStatus === "completed" || rawStatus === "success" || rawStatus === "succeeded" || rawStatus === "done") {
        status = "completed";
      } else if (rawStatus === "failed" || rawStatus === "error") {
        status = "failed";
      }

      // Extract video URL
      let videoUrl: string | undefined;
      if (status === "completed") {
        if (videoData.fail_reason && typeof videoData.fail_reason === "string" && videoData.fail_reason.startsWith("http")) {
          videoUrl = videoData.fail_reason;
        } else {
          videoUrl = innerData.output_video || videoData.output_video || videoData.video_url || innerData.url || videoData.url;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          status,
          videoUrl,
          progress: innerData.progress || videoData.progress || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // CREATE VIDEO (Kling via CometAPI)
    // ============================================================
    const body: ReelRequest = await req.json();
    const { prompt, brandName, duration = 5, imageUrl } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== GENERATE REEL VIDEO (Kling) ===");
    console.log("Prompt:", prompt.slice(0, 100));
    console.log("Brand:", brandName || "N/A");
    console.log("Duration:", duration, "s");
    console.log("Starting frame:", imageUrl ? "Yes" : "No");

    // Build enhanced prompt for social reels
    let enhancedPrompt = prompt;
    if (brandName) {
      enhancedPrompt = `${prompt} for ${brandName} brand.`;
    }
    enhancedPrompt += " Vertical 9:16 portrait format, perfect for Instagram Reels and TikTok, eye-catching motion, professional quality, vibrant colors, social media optimized.";

    // Create video task with Kling
    const formData = new FormData();
    formData.append("prompt", enhancedPrompt);
    formData.append("model", "kling-video");
    formData.append("seconds", Math.min(Math.max(duration, 5), 10).toString());
    formData.append("size", "720x1280"); // Portrait for Reels

    // If starting frame provided (image-to-video)
    if (imageUrl) {
      formData.append("image_url", imageUrl);
      console.log("[REEL] Using image-to-video mode");
    }

    const createResponse = await fetch("https://api.cometapi.com/v1/videos", {
      method: "POST",
      headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
      body: formData,
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[REEL] CometAPI error:", createResponse.status, errorText.slice(0, 200));
      throw new Error(`CometAPI error: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    const taskId = createData.id;

    if (!taskId) {
      throw new Error("No task ID returned from CometAPI");
    }

    console.log("[REEL] Task created:", taskId);

    // Check if we should wait for completion (sync mode) or return immediately (async mode)
    const waitForCompletion = url.searchParams.get("wait") === "true";

    if (waitForCompletion) {
      // Sync mode: Wait for video completion (for cron jobs)
      const videoUrl = await pollForVideo(taskId, COMETAPI_API_KEY, 60);

      if (!videoUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Video generation timeout or failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Download and upload to Supabase for permanence
      console.log("[REEL] Downloading video for storage...");
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const videoBytes = new Uint8Array(videoBuffer);
      const videoPath = `reels/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });

      if (uploadError) {
        console.error("[REEL] Upload error:", uploadError);
        // Return original URL as fallback
        return new Response(
          JSON.stringify({
            success: true,
            videoUrl,
            taskId,
            status: "completed",
            format: "video",
            aspectRatio: "9:16",
            duration: Math.min(Math.max(duration, 5), 10),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
      console.log("[REEL] ✅ Video uploaded:", publicUrlData.publicUrl);

      return new Response(
        JSON.stringify({
          success: true,
          videoUrl: publicUrlData.publicUrl,
          taskId,
          status: "completed",
          format: "video",
          aspectRatio: "9:16",
          duration: Math.min(Math.max(duration, 5), 10),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Async mode: Return task ID immediately (for frontend polling)
    return new Response(
      JSON.stringify({
        success: true,
        taskId,
        status: "processing",
        format: "video",
        aspectRatio: "9:16",
        duration: Math.min(Math.max(duration, 5), 10),
        message: "Video generation started. Poll status endpoint for completion.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[REEL] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
