import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// ============================================================
// CREDIT COSTS BY QUALITY
// ============================================================

const CREDIT_COSTS: Record<string, number> = {
  standard: 3,
  pro: 8,
  cinema: 15,
};

function getCreditCost(quality: string): number {
  return CREDIT_COSTS[quality] || CREDIT_COSTS["standard"];
}

// ============================================================
// MODEL SELECTION BY QUALITY
// ============================================================

function getReelModel(quality: string): { model: string; durations: number[] } {
  switch (quality) {
    case "cinema":
      return { model: "sora-2", durations: [4, 5, 8, 10, 12, 15, 20] };
    case "pro":
      return { model: "sora-2", durations: [4, 5, 8, 10, 12, 15, 20] };
    case "standard":
    default:
      return { model: "kling-video", durations: [5, 10] };
  }
}

// ============================================================
// REEL VIDEO via CometAPI
// ============================================================

interface ReelRequest {
  prompt: string;
  brandName?: string;
  duration?: number;
  imageUrl?: string;
  quality?: string;
  skipCreditDeduction?: boolean;
}

async function pollForVideo(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 60
): Promise<string | null> {
  console.log(`[REEL] Polling for task ${taskId}...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

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
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    // ============================================================
    // STATUS CHECK
    // ============================================================
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      const videoData = result.data || result;
      const innerData = videoData.data || {};
      const rawStatus = (videoData.status || innerData.status || "in_progress").toLowerCase();

      let status = "processing";
      if (rawStatus === "completed" || rawStatus === "success" || rawStatus === "succeeded" || rawStatus === "done") {
        status = "completed";
      } else if (rawStatus === "failed" || rawStatus === "error") {
        status = "failed";
      }

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
    // CREATE VIDEO
    // ============================================================
    const body: ReelRequest = await req.json();
    const { 
      prompt, 
      brandName, 
      duration = 5, 
      imageUrl, 
      quality = "standard",
      skipCreditDeduction = false,
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get model config
    const modelConfig = getReelModel(quality);
    const creditCost = getCreditCost(quality);

    // Clamp duration to valid values for selected model
    const validDurations = modelConfig.durations;
    const clampedDuration = validDurations.includes(duration)
      ? duration
      : validDurations.reduce((prev, curr) =>
          Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
        );

    console.log("=== GENERATE REEL VIDEO ===");
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`Quality: ${quality} | Credit Cost: ${creditCost}`);
    console.log("Selected Model:", modelConfig.model);
    console.log("Prompt:", prompt.slice(0, 100));
    console.log("Brand:", brandName || "N/A");
    console.log("Duration:", clampedDuration, "s (requested:", duration, "s)");
    console.log("Skip credit deduction:", skipCreditDeduction ? "Yes" : "No");

    // ============================================================
    // CREDIT VALIDATION & DEDUCTION
    // ============================================================
    if (userId && !skipCreditDeduction) {
      // Check current balance
      const { data: creditsData, error: creditsError } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        console.error("Credits fetch error:", creditsError);
      }

      const currentBalance = creditsData?.balance || 0;
      console.log(`Current balance: ${currentBalance} | Required: ${creditCost}`);

      if (currentBalance < creditCost) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Insufficient credits", 
            code: "INSUFFICIENT_CREDITS",
            required: creditCost,
            balance: currentBalance,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct credits
      const { data: deductSuccess, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: userId,
        p_amount: creditCost,
      });

      if (deductError || !deductSuccess) {
        console.error("Credit deduction failed:", deductError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Failed to deduct credits", 
            code: "DEDUCTION_FAILED" 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -creditCost,
        type: "consumption",
        description: `Reel generation (${quality}, ${clampedDuration}s)`,
      });

      console.log(`✓ Deducted ${creditCost} credits for reel generation`);
    }

    // Build enhanced prompt
    let enhancedPrompt = prompt;
    if (brandName) {
      enhancedPrompt = `${prompt} (for ${brandName})`;
    }
    enhancedPrompt += " | Vertical 9:16, 1080x1920, professional quality.";

    // Create video task
    const formData = new FormData();
    formData.append("prompt", enhancedPrompt);
    formData.append("model", modelConfig.model);
    formData.append("seconds", clampedDuration.toString());
    formData.append("size", "1080x1920"); // 1080p vertical

    if (imageUrl) {
      formData.append("image_url", imageUrl);
      console.log("[REEL] Using image-to-video mode");
    }

    const createResponse = await fetch("https://api.cometapi.com/v1/videos", {
      method: "POST",
      headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
      body: formData,
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[REEL] CometAPI error:", createResponse.status, errorText.slice(0, 200));
      
      // Refund credits on failure
      if (userId && !skipCreditDeduction) {
        await supabase.rpc("add_credits", {
          p_user_id: userId,
          p_amount: creditCost,
        });
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: creditCost,
          type: "refund",
          description: `Refund: Reel generation failed (${quality})`,
        });
        console.log(`✓ Refunded ${creditCost} credits due to API error`);
      }
      
      throw new Error(`CometAPI error: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    const taskId = createData.id;

    if (!taskId) {
      throw new Error("No task ID returned from CometAPI");
    }

    console.log("[REEL] Task created:", taskId, "| Model:", modelConfig.model);

    const waitForCompletion = url.searchParams.get("wait") === "true";

    if (waitForCompletion) {
      const videoUrl = await pollForVideo(taskId, REPLICATE_API_KEY, 60);

      if (!videoUrl) {
        // Refund credits on failure
        if (userId && !skipCreditDeduction) {
          await supabase.rpc("add_credits", {
            p_user_id: userId,
            p_amount: creditCost,
          });
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: creditCost,
            type: "refund",
            description: `Refund: Reel generation timeout (${quality})`,
          });
          console.log(`✓ Refunded ${creditCost} credits due to timeout`);
        }
        
        return new Response(
          JSON.stringify({ success: false, error: "Video generation timeout or failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
        return new Response(
          JSON.stringify({
            success: true,
            videoUrl,
            taskId,
            status: "completed",
            format: "video",
            aspectRatio: "9:16",
            duration: clampedDuration,
            model: modelConfig.model,
            quality,
            creditCost: skipCreditDeduction ? 0 : creditCost,
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
          duration: clampedDuration,
          model: modelConfig.model,
          quality,
          creditCost: skipCreditDeduction ? 0 : creditCost,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Async mode
    return new Response(
      JSON.stringify({
        success: true,
        taskId,
        status: "processing",
        format: "video",
        aspectRatio: "9:16",
        duration: clampedDuration,
        model: modelConfig.model,
        quality,
        creditCost: skipCreditDeduction ? 0 : creditCost,
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
