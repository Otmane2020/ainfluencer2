import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// CREDIT COSTS BY QUALITY
// ============================================================

const CREDIT_COSTS: Record<string, number> = {
  standard: 5,
  pro: 10,
  cinema: 20,
  // Legacy mappings
  "smart-video": 5,
  "high-video": 10,
  "cinema-video": 20,
};

function getCreditCost(quality: string): number {
  return CREDIT_COSTS[quality] || CREDIT_COSTS["standard"];
}

// ============================================================
// MODEL SELECTION BY QUALITY
// ============================================================

function getVideoModel(quality: string): string {
  switch (quality) {
    case "cinema":
      return "sora-2"; // Premium, will be sora-2-pro when available
    case "pro":
      return "sora-2";
    case "standard":
    default:
      return "kling-video";
  }
}

interface VideoRequest {
  prompt: string;
  avatarUrl?: string;
  duration?: number;
  size?: string;
  format?: string;
  projectId?: string;
  campaignId?: string;
  videoMode?: string;
  quality?: string;
  skipCreditDeduction?: boolean;
}

interface VideoStatusResponse {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    if (!COMETAPI_API_KEY) {
      throw new Error("COMETAPI_API_KEY is not configured");
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

    if (action === "create") {
      const { 
        prompt, 
        avatarUrl, 
        duration = 8, 
        size = "720x1280",
        format = "reel",
        projectId,
        campaignId,
        videoMode = "standard",
        quality = "standard",
        skipCreditDeduction = false,
      }: VideoRequest = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Clamp duration to 4-20 seconds for Sora-2
      const clampedDuration = Math.max(4, Math.min(20, duration));

      // Determine credit cost
      const creditCost = getCreditCost(quality);
      const videoModel = getVideoModel(quality);

      console.log("=== Sora-2 Video Generation ===");
      console.log(`User: ${userId || "anonymous"}`);
      console.log(`Quality: ${quality} | Credit Cost: ${creditCost}`);
      console.log(`Model: ${videoModel}`);
      console.log("Prompt:", prompt.substring(0, 100) + "...");
      console.log("Duration:", clampedDuration, "s | Size:", size);
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
          description: `Video generation (${quality}, ${clampedDuration}s)`,
        });

        console.log(`✓ Deducted ${creditCost} credits for video generation`);
      }

      // Build enhanced prompt
      let fullPrompt = prompt;
      if (avatarUrl) {
        fullPrompt = `Ultra-realistic cinematic video: ${prompt}. Style: professional, high quality, cinematic lighting, vibrant colors.`;
      }

      // Create generation record
      let generationId: string | null = null;
      if (userId) {
        const { data: genData, error: genError } = await supabase
          .from("generations")
          .insert({
            user_id: userId,
            project_id: projectId || null,
            campaign_id: campaignId || null,
            type: "video",
            video_mode: videoMode,
            status: "processing",
            prompt: prompt.substring(0, 500),
            format: format,
            duration: clampedDuration,
            model: videoModel,
            quality: quality,
            step: "generating",
            progress: 10,
            estimated_cost: creditCost,
            actual_cost: skipCreditDeduction ? 0 : creditCost,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!genError && genData) {
          generationId = genData.id;
          console.log("Created generation record:", generationId);
        }
      }

      // Create FormData for CometAPI
      const formData = new FormData();
      formData.append("prompt", fullPrompt);
      formData.append("model", videoModel);
      formData.append("seconds", clampedDuration.toString());
      formData.append("size", size);

      const response = await fetch("https://api.cometapi.com/v1/videos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("CometAPI error:", errorText);
        
        // Update generation as failed
        if (generationId) {
          await supabase
            .from("generations")
            .update({ status: "failed", error_message: errorText, step: "error" })
            .eq("id", generationId);
        }

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
            description: `Refund: Video generation failed (${quality})`,
          });
          console.log(`✓ Refunded ${creditCost} credits due to API error`);
        }
        
        throw new Error(`CometAPI error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Video task created:", result.id);

      // Update generation with task ID
      if (generationId) {
        await supabase
          .from("generations")
          .update({ 
            external_task_id: result.id,
            step: "processing",
            progress: 20
          })
          .eq("id", generationId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.id,
          generationId: generationId,
          status: result.status,
          progress: result.progress || 0,
          quality,
          creditCost: skipCreditDeduction ? 0 : creditCost,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      const generationId = url.searchParams.get("generationId");
      
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      console.log("Checking status for task:", taskId);

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Status check error:", errorText);
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Task status:", result.status, "Progress:", result.progress);

      const statusResponse: VideoStatusResponse = {
        id: result.id,
        status: result.status,
        progress: result.progress || 0,
      };

      // Map CometAPI progress to our progress
      let dbProgress = 20;
      if (result.status === "in_progress") {
        dbProgress = Math.min(80, 20 + (result.progress || 0) * 0.6);
      }

      if (result.status === "completed") {
        let videoUrl = result.output_video || result.video_url || result.url;
        
        // If no URL, try content endpoint
        if (!videoUrl) {
          try {
            const contentResponse = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
              headers: { "Authorization": `Bearer ${COMETAPI_API_KEY}` },
            });
            
            if (contentResponse.ok) {
              const videoBlob = await contentResponse.blob();
              const arrayBuffer = await videoBlob.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              
              const fileName = `videos/${Date.now()}-${taskId}.mp4`;
              const { error: uploadError } = await supabase.storage
                .from("media")
                .upload(fileName, uint8Array, { contentType: "video/mp4", upsert: true });
              
              if (!uploadError) {
                const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
                videoUrl = publicUrlData.publicUrl;
                console.log("Video uploaded to storage:", videoUrl);
              }
            }
          } catch (e) {
            console.error("Content download failed:", e);
          }
        }
        
        statusResponse.videoUrl = videoUrl;
        dbProgress = 100;

        // Update generation as completed
        if (generationId) {
          await supabase
            .from("generations")
            .update({
              status: "completed",
              media_url: videoUrl,
              step: "completed",
              progress: 100,
              completed_at: new Date().toISOString(),
            })
            .eq("id", generationId);
        }
      } else if (result.status === "failed") {
        statusResponse.error = result.error || "Video generation failed";
        
        if (generationId) {
          await supabase
            .from("generations")
            .update({
              status: "failed",
              error_message: result.error || "Generation failed",
              step: "error",
            })
            .eq("id", generationId);
        }
      } else if (generationId) {
        // Update progress
        await supabase
          .from("generations")
          .update({ progress: dbProgress, step: "processing" })
          .eq("id", generationId);
      }

      return new Response(
        JSON.stringify(statusResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "download") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId is required for download");
      }

      console.log("Downloading video for task:", taskId);

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download error:", errorText);
        throw new Error(`Download failed: ${response.status}`);
      }

      const videoBlob = await response.blob();
      
      return new Response(videoBlob, {
        headers: { ...corsHeaders, "Content-Type": "video/mp4" },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Video generation error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
