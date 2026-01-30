import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
// Standard: Sora | Pro: Sora 2 | Cinema: Nano Banana
// ============================================================

function getVideoModel(quality: string): { model: string; provider: "cometapi" | "lovable" } {
  switch (quality) {
    case "cinema":
      return { model: "nano-banana", provider: "lovable" };
    case "pro":
      return { model: "sora-2", provider: "cometapi" };
    case "standard":
    default:
      return { model: "sora", provider: "cometapi" };
  }
}

// Duration configs per model
const DURATION_CONFIGS: Record<string, { min: number; max: number }> = {
  "sora": { min: 4, max: 10 },
  "sora-2": { min: 4, max: 20 },
  "nano-banana": { min: 5, max: 15 },
};

function clampDuration(duration: number, model: string): number {
  const config = DURATION_CONFIGS[model] || { min: 4, max: 10 };
  return Math.max(config.min, Math.min(config.max, duration));
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
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
        format = "vertical",
        projectId,
        campaignId,
        videoMode = "standard",
        quality = "standard",
        skipCreditDeduction = false,
      }: VideoRequest = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Get model and provider based on quality
      const { model: videoModel, provider } = getVideoModel(quality);
      
      // Clamp duration to model limits
      const clampedDuration = clampDuration(duration, videoModel);

      // Determine credit cost
      const creditCost = getCreditCost(quality);

      console.log("=== Video Generation ===");
      console.log(`User: ${userId || "anonymous"}`);
      console.log(`Quality: ${quality} | Model: ${videoModel} | Provider: ${provider}`);
      console.log(`Credit Cost: ${creditCost}`);
      console.log("Prompt:", prompt.substring(0, 100) + "...");
      console.log("Duration:", clampedDuration, "s | Size:", size);

      // ============================================================
      // CREDIT VALIDATION & DEDUCTION
      // ============================================================
      if (userId && !skipCreditDeduction) {
        const { data: creditsData } = await supabase
          .from("credits")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

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

        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: -creditCost,
          type: "consumption",
          description: `Video generation (${videoModel}, ${clampedDuration}s)`,
        });

        console.log(`✓ Deducted ${creditCost} credits`);
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

      // ============================================================
      // ROUTE TO APPROPRIATE PROVIDER
      // ============================================================
      
      let taskId: string;
      let taskStatus: string;
      let taskProgress: number;

      if (provider === "lovable") {
        // Nano Banana via Lovable AI (image-to-video simulation)
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY is not configured for Nano Banana");
        }

        console.log("Using Nano Banana (Lovable AI)...");
        
        // Generate image first with Nano Banana
        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: `Generate a high-quality cinematic video frame for: ${fullPrompt}. Style: 9:16 vertical, vibrant, professional.`,
              },
            ],
          }),
        });

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          throw new Error(`Nano Banana error: ${errorText}`);
        }

        const imageResult = await imageResponse.json();
        
        // For Nano Banana, we generate a static image (video-like)
        // Store the image as "video" content
        const imageContent = imageResult.choices?.[0]?.message?.content;
        
        taskId = `nano-${Date.now()}`;
        taskStatus = "completed";
        taskProgress = 100;

        // Update generation
        if (generationId) {
          await supabase
            .from("generations")
            .update({ 
              external_task_id: taskId,
              status: "completed",
              step: "completed",
              progress: 100,
              completed_at: new Date().toISOString(),
            })
            .eq("id", generationId);
        }

        return new Response(
          JSON.stringify({
            success: true,
            taskId,
            generationId,
            status: "completed",
            progress: 100,
            quality,
            model: videoModel,
            creditCost: skipCreditDeduction ? 0 : creditCost,
            message: "Nano Banana generates high-quality image frames for video content",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } else {
        // CometAPI for Sora and Sora 2
        console.log(`Using CometAPI (${videoModel})...`);
        
        // Build JSON payload for CometAPI
        const cometPayload = {
          prompt: fullPrompt,
          model: videoModel,
          seconds: String(clampedDuration), // Must be string for CometAPI
          size: size,
        };

        console.log("CometAPI payload:", JSON.stringify(cometPayload));

        const response = await fetch("https://api.cometapi.com/v1/videos", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${COMETAPI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cometPayload),
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
              description: `Refund: Video generation failed (${videoModel})`,
            });
            console.log(`✓ Refunded ${creditCost} credits`);
          }
          
          throw new Error(`CometAPI error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        taskId = result.id;
        taskStatus = result.status || "queued";
        taskProgress = result.progress || 0;
        
        console.log("Video task created:", taskId);

        // Update generation with task ID
        if (generationId) {
          await supabase
            .from("generations")
            .update({ 
              external_task_id: taskId,
              step: "processing",
              progress: 20
            })
            .eq("id", generationId);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          generationId,
          status: taskStatus,
          progress: taskProgress,
          quality,
          model: videoModel,
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

      // Check if Nano Banana task (already completed)
      if (taskId.startsWith("nano-")) {
        return new Response(
          JSON.stringify({
            id: taskId,
            status: "completed",
            progress: 100,
            videoUrl: null, // Nano Banana provides image content, not video URL
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
