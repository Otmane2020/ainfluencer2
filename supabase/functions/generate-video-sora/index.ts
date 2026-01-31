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
// MODEL SELECTION - OPENAI SORA 2 ONLY
// All video generation uses OpenAI Sora models
// ============================================================

interface VideoModelConfig {
  model: string;
  endpoint: string;
  maxDuration: number;
  displayName: string;
  provider: "openai";
  requestBody: (prompt: string, duration: number, aspectRatio: string) => Record<string, any>;
}

// ============================================================
// OPENAI SORA 2 MODELS
// API: POST https://api.openai.com/v1/videos (multipart/form-data)
// ============================================================
const SORA_MODELS: Record<string, VideoModelConfig> = {
  "sora-2-pro": {
    model: "sora-2-pro",
    endpoint: "https://api.openai.com/v1/videos",
    maxDuration: 12,
    displayName: "Sora 2 Pro",
    provider: "openai",
    requestBody: (prompt, duration, aspectRatio) => ({
      model: "sora-2-pro",
      prompt,
      seconds: String(Math.min(duration, 12)),
      size: aspectRatio === "9:16" ? "720x1280" : "1280x720",
    }),
  },
  "sora-2": {
    model: "sora-2",
    endpoint: "https://api.openai.com/v1/videos",
    maxDuration: 10,
    displayName: "Sora 2",
    provider: "openai",
    requestBody: (prompt, duration, aspectRatio) => ({
      model: "sora-2",
      prompt,
      seconds: String(Math.min(duration, 10)),
      size: aspectRatio === "9:16" ? "720x1280" : "1280x720",
    }),
  },
};

// Quality tier mapping - All use Sora models
const MODEL_FALLBACK_CHAINS: Record<string, string[]> = {
  cinema: ["sora-2-pro"],
  pro: ["sora-2-pro", "sora-2"],
  standard: ["sora-2"],
};

function getModelFallbackChain(quality: string): VideoModelConfig[] {
  const modelIds = MODEL_FALLBACK_CHAINS[quality] || MODEL_FALLBACK_CHAINS["standard"];
  return modelIds.map(id => SORA_MODELS[id]).filter(Boolean);
}

function getVideoModel(quality: string): VideoModelConfig {
  const chain = getModelFallbackChain(quality);
  return chain[0];
}

function clampDuration(duration: number, config: VideoModelConfig): number {
  const min = 3;
  return Math.max(min, Math.min(config.maxDuration, duration));
}

// ============================================================
// OPENAI SORA VIDEO GENERATION
// All models use OpenAI Sora API
// ============================================================

async function tryVideoGeneration(
  models: VideoModelConfig[],
  prompt: string,
  duration: number,
  aspectRatio: string,
  openaiApiKey: string
): Promise<{ success: boolean; model: VideoModelConfig; taskId?: string; status?: string; mediaUrl?: string; error?: string }> {
  
  if (!openaiApiKey) {
    return {
      success: false,
      model: models[0],
      error: "OpenAI API key is not configured. Please add OPENAI_API_KEY in secrets.",
    };
  }
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const clampedDuration = clampDuration(duration, model);
    
    console.log(`[SORA ${i + 1}/${models.length}] Trying ${model.displayName} (${model.model})...`);
    console.log(`[SORA] Endpoint: ${model.endpoint}`);
    
    try {
      const requestBody = model.requestBody(prompt, clampedDuration, aspectRatio);
      console.log(`[SORA] Request body:`, JSON.stringify(requestBody).substring(0, 200));
      
      // OpenAI Sora uses multipart/form-data
      const formData = new FormData();
      Object.entries(requestBody).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      const response = await fetch(model.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });
      
      const responseText = await response.text();
      console.log(`[${model.model}] Response: ${response.status} - ${responseText.substring(0, 300)}`);
      
      // Check for empty response
      if (!responseText || responseText.trim().length === 0) {
        console.warn(`[${model.model}] Empty response - trying next model`);
        continue;
      }
      
      // Check for HTML error page (WAF/Cloudflare/404)
      if (responseText.trim().startsWith("<!") || responseText.trim().startsWith("<html") || responseText.includes("<!DOCTYPE")) {
        console.warn(`[${model.model}] Returned HTML error page - likely WAF/404 - trying next model`);
        continue;
      }
      
      // Check for server errors (500+)
      if (response.status >= 500) {
        console.warn(`[${model.model}] Server error (${response.status}) - trying next model`);
        continue;
      }
      
      // Check for 401/403 (auth issues)
      if (response.status === 401 || response.status === 403) {
        console.warn(`[${model.model}] Auth error (${response.status}) - API key may be invalid - trying next model`);
        continue;
      }
      
      // Check for 404 (endpoint not found) or 410 (deprecated)
      if (response.status === 404 || response.status === 410) {
        console.warn(`[${model.model}] Endpoint not available (${response.status}) - trying next model`);
        continue;
      }
      
      // Check for 429 (rate limit)
      if (response.status === 429) {
        console.warn(`[${model.model}] Rate limited (429) - trying next model`);
        continue;
      }
      
      if (!response.ok) {
        try {
          const errorJson = JSON.parse(responseText);
          const errorMsg = errorJson.error || errorJson.message || errorJson.detail || "";
          if (errorMsg.toLowerCase().includes("unavailable") || 
              errorMsg.toLowerCase().includes("not found") ||
              errorMsg.toLowerCase().includes("invalid") ||
              errorMsg.toLowerCase().includes("not supported")) {
            console.warn(`[${model.model}] Model error: ${errorMsg} - trying next model`);
            continue;
          }
        } catch {
          // Not JSON - continue to next check
        }
        console.warn(`[${model.model}] Failed with status ${response.status} - trying next model`);
        continue;
      }
      
      // Success! Parse the response
      const result = JSON.parse(responseText);
      
      // Different models return task IDs differently
      const taskId = result.task?.id || result.id || result.task_id || result.taskId || `comet-${Date.now()}`;
      const status = result.task?.status_name || result.status || "queued";
      const mediaUrl = result.video_url || result.output?.video || result.works?.[0]?.resource?.resource || null;
      
      console.log(`✓ [${model.displayName}] Success! Task ID: ${taskId}`);
      
      return {
        success: true,
        model,
        taskId: String(taskId),
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured. Please add your OpenAI API key in secrets.");
    }
    
    // Log API key availability (for debugging)
    console.log(`[CONFIG] OpenAI Sora 2: ✓ Available`);

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
      console.log(`Quality: ${quality} | Model: ${modelConfig.model} | Endpoint: ${modelConfig.endpoint}`);
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
        OPENAI_API_KEY
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

      // ============================================================
      // OPENAI SORA STATUS CHECK
      // API: GET https://api.openai.com/v1/videos/{video_id}
      // ============================================================
      
      const statusUrl = `https://api.openai.com/v1/videos/${taskId}`;
      console.log(`[STATUS] Checking Sora task ${taskId} at ${statusUrl}`);

      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
      });

      const responseText = await response.text();
      console.log(`[STATUS] Response: ${response.status} - ${responseText.substring(0, 300)}`);
      
      if (!response.ok) {
        console.error("Status check error:", responseText);
        return new Response(
          JSON.stringify({
            id: taskId,
            status: "in_progress",
            progress: 40,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("[STATUS] Failed to parse response as JSON");
        return new Response(
          JSON.stringify({
            id: taskId,
            status: "in_progress",
            progress: 45,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // OpenAI Sora response format
      const taskStatus = result.status || "queued";
      const taskProgress = result.progress || 0;
      
      console.log(`[STATUS] Task status: ${taskStatus}, progress: ${taskProgress}`);

      const statusResponse: VideoStatusResponse = {
        id: taskId,
        status: taskStatus === "completed" ? "completed" :
                taskStatus === "failed" ? "failed" :
                taskStatus === "queued" ? "queued" : "in_progress",
        progress: taskProgress,
      };

      // Map progress to our 0-100 scale
      let dbProgress = 20;
      if (statusResponse.status === "in_progress") {
        dbProgress = Math.min(80, 20 + (taskProgress || 0) * 0.6);
      }

      if (statusResponse.status === "completed") {
        // Download video from OpenAI and upload to our storage
        console.log("[STATUS] Video completed, downloading from OpenAI...");
        
        try {
          const contentResponse = await fetch(`https://api.openai.com/v1/videos/${taskId}/content`, {
            headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
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
              statusResponse.videoUrl = publicUrlData.publicUrl;
              console.log("[STATUS] Video uploaded to storage:", statusResponse.videoUrl);
            } else {
              console.error("[STATUS] Upload error:", uploadError);
            }
          } else {
            console.error("[STATUS] Content download failed:", await contentResponse.text());
          }
        } catch (e) {
          console.error("[STATUS] Content download error:", e);
        }
        
        dbProgress = 100;

        // Update generation as completed
        if (generationId) {
          await supabase
            .from("generations")
            .update({
              status: "completed",
              media_url: statusResponse.videoUrl,
              step: "completed",
              progress: 100,
              completed_at: new Date().toISOString(),
            })
            .eq("id", generationId);
        }
        
        console.log(`✓ [STATUS] Video completed: ${statusResponse.videoUrl?.substring(0, 50)}...`);
        
      } else if (statusResponse.status === "failed") {
        statusResponse.error = result.error?.message || result.error || "Video generation failed";
        
        if (generationId) {
          await supabase
            .from("generations")
            .update({
              status: "failed",
              error_message: statusResponse.error,
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

      const response = await fetch(`https://api.openai.com/v1/videos/${taskId}/content`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
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
