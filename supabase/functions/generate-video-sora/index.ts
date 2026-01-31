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
// MODEL SELECTION WITH FALLBACK CHAIN
// Each quality tier has a primary model and fallbacks
// ============================================================

interface VideoModelConfig {
  model: string;
  provider: "cometapi";
  maxDuration: number;
  displayName: string;
}

// Fallback chains for each quality tier
const MODEL_FALLBACK_CHAINS: Record<string, VideoModelConfig[]> = {
  cinema: [
    { model: "sora-2", provider: "cometapi", maxDuration: 20, displayName: "Sora 2 Pro" },
    { model: "veo-3.1-pro", provider: "cometapi", maxDuration: 16, displayName: "Veo 3.1 Pro" },
    { model: "kling-v2-master", provider: "cometapi", maxDuration: 10, displayName: "Kling V2 Master" },
  ],
  pro: [
    { model: "sora", provider: "cometapi", maxDuration: 12, displayName: "Sora 2" },
    { model: "veo-3.1", provider: "cometapi", maxDuration: 12, displayName: "Veo 3.1" },
    { model: "kling-v2.1-master", provider: "cometapi", maxDuration: 10, displayName: "Kling V2.1" },
  ],
  standard: [
    { model: "kling-v2.5-turbo", provider: "cometapi", maxDuration: 10, displayName: "Kling V2.5 Turbo" },
    { model: "minimax-hailuo", provider: "cometapi", maxDuration: 6, displayName: "MiniMax Hailuo" },
    { model: "sora", provider: "cometapi", maxDuration: 12, displayName: "Sora 2" },
  ],
};

function getModelFallbackChain(quality: string): VideoModelConfig[] {
  return MODEL_FALLBACK_CHAINS[quality] || MODEL_FALLBACK_CHAINS["standard"];
}

function getVideoModel(quality: string): VideoModelConfig {
  const chain = getModelFallbackChain(quality);
  return chain[0]; // Return primary model
}

function clampDuration(duration: number, config: VideoModelConfig): number {
  const min = 3;
  return Math.max(min, Math.min(config.maxDuration, duration));
}

// ============================================================
// COMETAPI VIDEO GENERATION WITH FALLBACK
// Tries each model in the chain until one succeeds
// ============================================================

async function tryVideoGeneration(
  models: VideoModelConfig[],
  prompt: string,
  duration: number,
  aspectRatio: string,
  apiKey: string
): Promise<{ success: boolean; model: VideoModelConfig; taskId?: string; status?: string; mediaUrl?: string; error?: string }> {
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const clampedDuration = clampDuration(duration, model);
    
    console.log(`[FALLBACK ${i + 1}/${models.length}] Trying ${model.displayName} (${model.model})...`);
    
    try {
      const response = await fetch("https://api.cometapi.com/v1/video/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.model,
          prompt: prompt,
          duration: `${clampedDuration}`,
          aspect_ratio: aspectRatio,
        }),
      });
      
      const responseText = await response.text();
      console.log(`[${model.model}] Response: ${response.status} - ${responseText.substring(0, 200)}`);
      
      // Check for HTML error page
      if (responseText.trim().startsWith("<!") || responseText.trim().startsWith("<html")) {
        console.warn(`[${model.model}] Returned HTML error page - trying next model`);
        continue;
      }
      
      // Check for 503 Service Unavailable or other server errors
      if (response.status === 503 || response.status === 502 || response.status === 504) {
        console.warn(`[${model.model}] Service unavailable (${response.status}) - trying next model`);
        continue;
      }
      
      // Check for 404 (model not found) or 410 (deprecated)
      if (response.status === 404 || response.status === 410) {
        console.warn(`[${model.model}] Model not available (${response.status}) - trying next model`);
        continue;
      }
      
      if (!response.ok) {
        // Try to parse error
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.error?.includes("unavailable") || errorJson.error?.includes("not found")) {
            console.warn(`[${model.model}] Model error: ${errorJson.error} - trying next model`);
            continue;
          }
        } catch {
          // Not JSON, continue to next model
        }
        console.warn(`[${model.model}] Failed with status ${response.status} - trying next model`);
        continue;
      }
      
      // Success!
      const result = JSON.parse(responseText);
      const taskId = result.id || result.task_id || `comet-${Date.now()}`;
      const status = result.status || "queued";
      const mediaUrl = result.video_url || result.output || null;
      
      console.log(`✓ [${model.displayName}] Success! Task ID: ${taskId}`);
      
      return {
        success: true,
        model,
        taskId,
        status,
        mediaUrl,
      };
      
    } catch (error) {
      console.error(`[${model.model}] Exception:`, error);
      continue;
    }
  }
  
  // All models failed
  return {
    success: false,
    model: models[0],
    error: "All video models are currently unavailable. Please try again later.",
  };
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
  // Project context for brand-aligned generation
  projectName?: string;
  projectUrl?: string;
  logoUrl?: string;
  detectedLanguage?: string;
  aiContextSummary?: string;
  marketingContext?: any;
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
        format = "vertical",
        projectId,
        campaignId,
        videoMode = "standard",
        quality = "standard",
        skipCreditDeduction = false,
        // Project context
        projectName,
        projectUrl,
        logoUrl,
        detectedLanguage,
        aiContextSummary,
        marketingContext,
      }: VideoRequest = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Get model config based on quality
      const modelConfig = getVideoModel(quality);
      
      // Clamp duration to model limits
      const clampedDuration = clampDuration(duration, modelConfig);

      // Determine credit cost
      const creditCost = getCreditCost(quality);

      console.log("=== Video Generation ===");
      console.log(`User: ${userId || "anonymous"}`);
      console.log(`Quality: ${quality} | Model: ${modelConfig.model} | Provider: ${modelConfig.provider}`);
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
          description: `Video generation (${modelConfig.model}, ${clampedDuration}s)`,
        });

        console.log(`✓ Deducted ${creditCost} credits`);
      }

      // Build enhanced prompt with project context
      let fullPrompt = prompt;
      
      // Add brand context if available
      if (projectName || aiContextSummary || marketingContext) {
        const contextParts: string[] = [];
        
        if (projectName) {
          contextParts.push(`Brand: ${projectName}`);
        }
        if (projectUrl) {
          contextParts.push(`Website: ${projectUrl}`);
        }
        if (aiContextSummary) {
          contextParts.push(`Brand Context: ${aiContextSummary.substring(0, 500)}`);
        }
        if (marketingContext?.target_audience?.primary) {
          contextParts.push(`Target: ${marketingContext.target_audience.primary}`);
        }
        if (marketingContext?.brand_personality?.tone) {
          contextParts.push(`Tone: ${marketingContext.brand_personality.tone}`);
        }
        if (marketingContext?.visual_identity?.primary_color) {
          contextParts.push(`Brand Color: ${marketingContext.visual_identity.primary_color}`);
        }
        if (marketingContext?.products_services?.length > 0) {
          const products = marketingContext.products_services.slice(0, 3).map((p: any) => p.name).join(", ");
          contextParts.push(`Products: ${products}`);
        }
        
        if (contextParts.length > 0) {
          fullPrompt = `[BRAND CONTEXT: ${contextParts.join(" | ")}]\n\n${prompt}`;
        }
      }
      
      // Add language instruction
      const languageMap: Record<string, string> = {
        en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese"
      };
      const langName = languageMap[detectedLanguage || "en"] || "English";
      if (detectedLanguage && detectedLanguage !== "en") {
        fullPrompt = `[OUTPUT IN ${langName.toUpperCase()} - NO ENGLISH TEXT]\n${fullPrompt}`;
      }
      
      if (avatarUrl) {
        fullPrompt = `Ultra-realistic cinematic video: ${fullPrompt}. Style: professional, high quality, cinematic lighting, vibrant colors.`;
      }

      console.log(`[VIDEO-SORA] Project context: ${projectName || "none"} | Language: ${detectedLanguage || "en"}`);

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
            model: modelConfig.model,
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
      // VIDEO GENERATION WITH FALLBACK CHAIN
      // ============================================================
      
      const aspectRatio = format === "vertical" ? "9:16" : "16:9";
      const fallbackChain = getModelFallbackChain(quality);
      
      console.log(`[VIDEO] Starting generation with ${fallbackChain.length} model fallbacks`);
      console.log(`[VIDEO] Quality: ${quality} | Primary: ${fallbackChain[0].displayName}`);
      
      const result = await tryVideoGeneration(
        fallbackChain,
        fullPrompt,
        clampedDuration,
        aspectRatio,
        COMETAPI_API_KEY
      );
      
      if (!result.success) {
        // All models failed - refund credits
        if (userId && !skipCreditDeduction) {
          await supabase.rpc("add_credits", {
            p_user_id: userId,
            p_amount: creditCost,
          });
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: creditCost,
            type: "refund",
            description: `Refund: All video models unavailable`,
          });
          console.log(`✓ Refunded ${creditCost} credits`);
        }
        
        if (generationId) {
          await supabase
            .from("generations")
            .update({ status: "failed", error_message: result.error, step: "error" })
            .eq("id", generationId);
        }
        
        throw new Error(result.error || "Video generation failed");
      }
      
      const taskId = result.taskId!;
      const initialStatus = result.status || "queued";
      const mediaUrl = result.mediaUrl || null;
      const usedModel = result.model;
      
      console.log(`✓ Video task created: ${taskId} (model: ${usedModel.displayName}, status: ${initialStatus})`);

      // Update generation with task ID and actual model used
      if (generationId) {
        await supabase
          .from("generations")
          .update({ 
            external_task_id: taskId,
            model: usedModel.model,
            status: initialStatus === "completed" ? "completed" : "processing",
            step: initialStatus === "completed" ? "completed" : "generating",
            progress: initialStatus === "completed" ? 100 : 30,
            media_url: mediaUrl,
          })
          .eq("id", generationId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          generationId,
          status: initialStatus,
          progress: initialStatus === "completed" ? 100 : 30,
          quality,
          model: usedModel.model,
          modelName: usedModel.displayName,
          provider: "cometapi",
          mediaUrl,
          creditCost: skipCreditDeduction ? 0 : creditCost,
          message: `Video generation started via ${usedModel.displayName}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      const generationId = url.searchParams.get("generationId");
      
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      // All Lovable AI tasks are completed immediately
      if (taskId.startsWith("lovable-") || taskId.startsWith("nano-")) {
        // Get media URL from generation record if available
        let mediaUrl: string | null = null;
        if (generationId) {
          const { data: genData } = await supabase
            .from("generations")
            .select("media_url")
            .eq("id", generationId)
            .single();
          mediaUrl = genData?.media_url || null;
        }
        
        return new Response(
          JSON.stringify({
            id: taskId,
            status: "completed",
            progress: 100,
            videoUrl: mediaUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Legacy: CometAPI status check (for existing tasks)
      console.log("Checking status for legacy CometAPI task:", taskId);

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
