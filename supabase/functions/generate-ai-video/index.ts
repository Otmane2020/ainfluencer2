import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// CREDIT COSTS BY QUALITY (AI Video MULTI tool)
// ============================================================

const CREDIT_COSTS: Record<string, number> = {
  standard: 5,
  pro: 10,
  cinema: 20,
  // Tier mappings for MULTI tool
  "fast": 5,
  "medium": 10,
  "high": 20,
};

function getCreditCost(quality: string): number {
  return CREDIT_COSTS[quality] || CREDIT_COSTS["standard"];
}

// ============================================================
// AI VIDEO GENERATOR - Multi-model support
// High: Sora-2 Pro (CometAPI)
// Medium: Sora-2 (CometAPI)
// Low/Fast: Kling 2.x (CometAPI)
// ============================================================

interface VideoRequest {
  prompt: string;
  model: string;
  provider: string;
  duration: number;
  resolution: string;
  action?: string;
  taskId?: string;
  quality?: string;
  skipCreditDeduction?: boolean;
}

async function pollCometVideo(taskId: string, apiKey: string, maxAttempts: number = 60): Promise<string | null> {
  console.log(`[AI-VIDEO] Polling CometAPI task ${taskId}...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) continue;

      const result = await response.json();
      const videoData = result.data || result;
      const innerData = videoData.data || {};
      const status = (videoData.status || innerData.status || "").toLowerCase();

      console.log(`[AI-VIDEO] Poll ${i + 1}/${maxAttempts}: status=${status}`);

      if (status === "completed" || status === "success" || status === "succeeded" || status === "done") {
        let videoUrl: string | null = null;
        
        if (videoData.fail_reason && typeof videoData.fail_reason === "string" && videoData.fail_reason.startsWith("http")) {
          videoUrl = videoData.fail_reason;
        } else {
          videoUrl = innerData.output_video || videoData.output_video || 
                     videoData.video_url || innerData.url || videoData.url ||
                     videoData.output || innerData.output;
        }

        if (videoUrl) {
          console.log(`[AI-VIDEO] Video ready: ${videoUrl.slice(0, 60)}...`);
          return videoUrl;
        }
      } else if (status === "failed" || status === "error") {
        console.error("[AI-VIDEO] Task failed:", videoData.fail_reason || "Unknown error");
        return null;
      }
    } catch (error) {
      console.error(`[AI-VIDEO] Poll error:`, error);
    }
  }

  return null;
}

async function generateWithCometAPI(
  prompt: string,
  model: string,
  duration: number,
  resolution: string,
  apiKey: string
): Promise<{ taskId: string; videoUrl?: string }> {
  // Sora-2 only accepts: "1280x720" (landscape) or "720x1280" (portrait)
  const size = "1280x720";

  console.log(`[AI-VIDEO] CometAPI: model=${model}, duration=${duration}s, size=${size}`);

  const requestBody = {
    prompt: prompt,
    model: model,
    seconds: String(duration),
    size: size,
  };

  console.log("[AI-VIDEO] Request payload:", JSON.stringify(requestBody));

  const response = await fetch("https://api.cometapi.com/v1/videos", {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI-VIDEO] CometAPI error:", response.status, errorText);
    throw new Error(`CometAPI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const taskId = data.id;

  if (!taskId) {
    throw new Error("No task ID returned from CometAPI");
  }

  console.log("[AI-VIDEO] CometAPI task created:", taskId);
  return { taskId };
}

async function generateWithReplicate(
  prompt: string,
  duration: number,
  apiKey: string
): Promise<{ taskId: string; videoUrl?: string }> {
  console.log(`[AI-VIDEO] Replicate Wan 2.1 I2V: duration=${duration}s`);

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "wan-ai/wan2.1-i2v-720p",
      input: {
        prompt: prompt,
        num_frames: duration * 24,
        guidance_scale: 7.5,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI-VIDEO] Replicate error:", response.status, errorText.slice(0, 200));
    throw new Error(`Replicate error: ${response.status}`);
  }

  const data = await response.json();
  console.log("[AI-VIDEO] Replicate prediction created:", data.id);
  
  return { taskId: `replicate:${data.id}` };
}

async function checkReplicateStatus(predictionId: string, apiKey: string): Promise<{ status: string; videoUrl?: string; progress?: number }> {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return { status: "processing", progress: 0 };
  }

  const data = await response.json();
  
  if (data.status === "succeeded") {
    const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    return { status: "completed", videoUrl, progress: 100 };
  } else if (data.status === "failed") {
    return { status: "failed", progress: 0 };
  }

  return { status: "processing", progress: data.logs ? 50 : 25 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    
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

    const body: VideoRequest = await req.json();
    const { 
      action, 
      taskId, 
      prompt, 
      model, 
      provider, 
      duration, 
      resolution,
      quality = "standard",
      skipCreditDeduction = false,
    } = body;

    // ============================================================
    // STATUS CHECK
    // ============================================================
    if (action === "status" && taskId) {
      console.log("[AI-VIDEO] Checking status for:", taskId);

      if (taskId.startsWith("replicate:")) {
        const predictionId = taskId.replace("replicate:", "");
        if (!REPLICATE_API_KEY) {
          throw new Error("REPLICATE_API_KEY not configured");
        }
        const status = await checkReplicateStatus(predictionId, REPLICATE_API_KEY);
        return new Response(
          JSON.stringify({ success: true, ...status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // CometAPI status
        if (!COMETAPI_API_KEY) {
          throw new Error("COMETAPI_API_KEY not configured");
        }

        const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
          headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ success: true, status: "processing", progress: 25 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const result = await response.json();
        console.log("[AI-VIDEO] CometAPI full response:", JSON.stringify(result));
        
        const videoData = result.data || result;
        const innerData = videoData.data || {};
        const rawStatus = (videoData.status || innerData.status || "processing").toLowerCase();

        let status = "processing";
        let videoUrl: string | undefined;
        let progress = videoData.progress || innerData.progress || 50;

        if (rawStatus === "completed" || rawStatus === "success" || rawStatus === "succeeded" || rawStatus === "done") {
          status = "completed";
          progress = 100;
          
          videoUrl = 
            innerData.output_video || videoData.output_video ||
            videoData.video_url || innerData.video_url ||
            videoData.url || innerData.url ||
            videoData.output || innerData.output ||
            videoData.result || innerData.result ||
            videoData.file_url || innerData.file_url ||
            videoData.download_url || innerData.download_url;
            
          if (!videoUrl && videoData.fail_reason && typeof videoData.fail_reason === "string" && videoData.fail_reason.startsWith("http")) {
            videoUrl = videoData.fail_reason;
          }
          
          // Download and upload to storage if no URL
          if (!videoUrl && taskId) {
            console.log("[AI-VIDEO] Downloading video from CometAPI and uploading to storage...");
            try {
              const contentResponse = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
                headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
              });
              
              if (contentResponse.ok) {
                const videoBlob = await contentResponse.blob();
                console.log("[AI-VIDEO] Downloaded video size:", videoBlob.size);
                
                const fileName = `ai-videos/${taskId}.mp4`;
                const { error: uploadError } = await supabase.storage
                  .from("media")
                  .upload(fileName, videoBlob, {
                    contentType: "video/mp4",
                    upsert: true,
                  });
                  
                if (!uploadError) {
                  const { data: publicUrlData } = supabase.storage
                    .from("media")
                    .getPublicUrl(fileName);
                  videoUrl = publicUrlData.publicUrl;
                  console.log("[AI-VIDEO] Uploaded to storage:", videoUrl);
                }
              }
            } catch (downloadError) {
              console.error("[AI-VIDEO] Download/upload error:", downloadError);
            }
          }
          
          console.log("[AI-VIDEO] Final extracted videoUrl:", videoUrl);
        } else if (rawStatus === "failed" || rawStatus === "error") {
          status = "failed";
        }

        return new Response(
          JSON.stringify({ success: true, status, videoUrl, progress }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================================
    // CREATE VIDEO
    // ============================================================
    if (!prompt) {
      throw new Error("prompt is required");
    }

    const creditCost = getCreditCost(quality);

    console.log("=== GENERATE AI VIDEO ===");
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`Quality: ${quality} | Credit Cost: ${creditCost}`);
    console.log("Model:", model);
    console.log("Provider:", provider);
    console.log("Duration:", duration);
    console.log("Resolution:", resolution);
    console.log("Skip credit deduction:", skipCreditDeduction ? "Yes" : "No");
    console.log("Prompt:", prompt.slice(0, 100));

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
        description: `AI Video generation (${quality}, ${duration}s)`,
      });

      console.log(`✓ Deducted ${creditCost} credits for AI video generation`);
    }

    let result: { taskId: string; videoUrl?: string };

    try {
      if (provider === "replicate") {
        if (!REPLICATE_API_KEY) {
          throw new Error("REPLICATE_API_KEY not configured");
        }
        result = await generateWithReplicate(prompt, duration, REPLICATE_API_KEY);
      } else {
        // CometAPI (sora-2 or kling-video)
        if (!COMETAPI_API_KEY) {
          throw new Error("COMETAPI_API_KEY not configured");
        }
        result = await generateWithCometAPI(prompt, model, duration, resolution, COMETAPI_API_KEY);
      }
    } catch (genError) {
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
          description: `Refund: AI Video generation failed (${quality})`,
        });
        console.log(`✓ Refunded ${creditCost} credits due to API error`);
      }
      throw genError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        taskId: result.taskId,
        status: "processing",
        model,
        provider,
        duration,
        quality,
        creditCost: skipCreditDeduction ? 0 : creditCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI-VIDEO] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
