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
// MODEL SELECTION - SORA 2 (OpenAI) + VEO 3.1 (CometAPI)
// 4 models only: Sora 2, Sora 2 Pro, Veo 3.1, Veo 3.1 Pro
// ============================================================

interface VideoModelConfig {
  model: string;
  endpoint: string;
  maxDuration: number;
  displayName: string;
  provider: "openai" | "cometapi";
  requestBody: (prompt: string, duration: number, aspectRatio: string) => Record<string, any>;
}

// ============================================================
// OPENAI SORA 2 MODELS
// API: POST https://api.openai.com/v1/videos (multipart/form-data)
// ============================================================
const OPENAI_MODELS: Record<string, VideoModelConfig> = {
  "sora-2-pro": {
    model: "sora-2-pro",
    endpoint: "https://api.openai.com/v1/videos",
    maxDuration: 20,
    displayName: "Sora 2 Pro",
    provider: "openai",
    requestBody: (prompt, duration, aspectRatio) => ({
      model: "sora-2-pro",
      prompt,
      seconds: String(Math.min(duration, 20)),
      size: aspectRatio === "9:16" ? "720x1280" : "1280x720",
    }),
  },
  "sora-2": {
    model: "sora-2",
    endpoint: "https://api.openai.com/v1/videos",
    maxDuration: 12,
    displayName: "Sora 2",
    provider: "openai",
    requestBody: (prompt, duration, aspectRatio) => ({
      model: "sora-2",
      prompt,
      seconds: String(Math.min(duration, 12)),
      size: aspectRatio === "9:16" ? "720x1280" : "1280x720",
    }),
  },
};

// ============================================================
// COMETAPI VEO 3.1 MODELS
// API: POST https://api.cometapi.com/v1/video/generations (JSON)
// ============================================================
const COMETAPI_MODELS: Record<string, VideoModelConfig> = {
  "veo-3.1-pro": {
    model: "veo-3.1-pro",
    endpoint: "https://api.cometapi.com/v1/video/generations",
    maxDuration: 10,
    displayName: "Veo 3.1 Pro",
    provider: "cometapi",
    requestBody: (prompt, duration, aspectRatio) => ({
      model: "veo-3.1-pro",
      prompt,
      duration: Math.min(duration, 10),
      aspect_ratio: aspectRatio,
    }),
  },
  "veo-3.1": {
    model: "veo-3.1",
    endpoint: "https://api.cometapi.com/v1/video/generations",
    maxDuration: 10,
    displayName: "Veo 3.1",
    provider: "cometapi",
    requestBody: (prompt, duration, aspectRatio) => ({
      model: "veo-3.1",
      prompt,
      duration: Math.min(duration, 10),
      aspect_ratio: aspectRatio,
    }),
  },
};

// All available models
const ALL_MODELS: Record<string, VideoModelConfig> = {
  ...OPENAI_MODELS,
  ...COMETAPI_MODELS,
};

// Quality tier mapping with fallbacks
const MODEL_FALLBACK_CHAINS: Record<string, string[]> = {
  cinema: ["sora-2-pro", "veo-3.1-pro", "sora-2", "veo-3.1"],
  pro: ["sora-2", "veo-3.1", "sora-2-pro", "veo-3.1-pro"],
  standard: ["veo-3.1", "sora-2", "veo-3.1-pro", "sora-2-pro"],
};

function getModelFallbackChain(quality: string): VideoModelConfig[] {
  const modelIds = MODEL_FALLBACK_CHAINS[quality] || MODEL_FALLBACK_CHAINS["standard"];
  return modelIds.map(id => ALL_MODELS[id]).filter(Boolean);
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
// VIDEO GENERATION WITH MULTI-PROVIDER FALLBACK
// Supports OpenAI (FormData) and CometAPI (JSON)
// ============================================================

async function tryVideoGeneration(
  models: VideoModelConfig[],
  prompt: string,
  duration: number,
  aspectRatio: string,
  openaiApiKey: string,
  cometApiKey: string
): Promise<{ success: boolean; model: VideoModelConfig; taskId?: string; status?: string; mediaUrl?: string; error?: string }> {
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const clampedDuration = clampDuration(duration, model);
    
    // Check if we have the API key for this provider
    const apiKey = model.provider === "openai" ? openaiApiKey : cometApiKey;
    if (!apiKey) {
      console.log(`[${model.displayName}] Skipping - no API key for ${model.provider}`);
      continue;
    }
    
    console.log(`[VIDEO ${i + 1}/${models.length}] Trying ${model.displayName} (${model.provider})...`);
    console.log(`[VIDEO] Endpoint: ${model.endpoint}`);
    
    try {
      const requestBody = model.requestBody(prompt, clampedDuration, aspectRatio);
      console.log(`[VIDEO] Request body:`, JSON.stringify(requestBody).substring(0, 200));
      
      let response: Response;
      
      if (model.provider === "openai") {
        // OpenAI uses multipart/form-data
        const formData = new FormData();
        Object.entries(requestBody).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        response = await fetch(model.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
          body: formData,
        });
      } else {
        // CometAPI uses JSON
        response = await fetch(model.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
      }
      
      const responseText = await response.text();
      console.log(`[${model.model}] Response: ${response.status} - ${responseText.substring(0, 300)}`);
      
      // Check for empty response
      if (!responseText || responseText.trim().length === 0) {
        console.warn(`[${model.model}] Empty response - trying next model`);
        continue;
      }
      
      // Check for HTML error page
      if (responseText.trim().startsWith("<!") || responseText.trim().startsWith("<html") || responseText.includes("<!DOCTYPE")) {
        console.warn(`[${model.model}] Returned HTML error page - trying next model`);
        continue;
      }
      
      // Check for server errors (500+)
      if (response.status >= 500) {
        console.warn(`[${model.model}] Server error (${response.status}) - trying next model`);
        continue;
      }
      
      // Check for 401/403 (auth issues)
      if (response.status === 401 || response.status === 403) {
        console.warn(`[${model.model}] Auth error (${response.status}) - trying next model`);
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
          const errorMsg = errorJson.error?.message || errorJson.error || errorJson.message || errorJson.detail || "";
          if (errorMsg.toLowerCase().includes("unavailable") || 
              errorMsg.toLowerCase().includes("not found") ||
              errorMsg.toLowerCase().includes("invalid") ||
              errorMsg.toLowerCase().includes("billing") ||
              errorMsg.toLowerCase().includes("limit") ||
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
      
      // Different providers return task IDs differently
      const taskId = result.task?.id || result.id || result.task_id || result.taskId || `${model.provider}-${Date.now()}`;
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY") || "";
    
    if (!OPENAI_API_KEY && !COMETAPI_API_KEY) {
      throw new Error("No video API keys configured. Please add OPENAI_API_KEY or COMETAPI_API_KEY in secrets.");
    }
    
    // Log API key availability (for debugging)
    console.log(`[CONFIG] OpenAI Sora 2: ${OPENAI_API_KEY ? "✓ Available" : "✗ Not configured"}`);
    console.log(`[CONFIG] CometAPI Veo 3.1: ${COMETAPI_API_KEY ? "✓ Available" : "✗ Not configured"}`);

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
        duration = 10, // Default 10 seconds
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
          description: `Video generation (${modelConfig.displayName}, ${clampedDuration}s)`,
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

      console.log(`[VIDEO] Project context: ${projectName || "none"} | Language: ${detectedLanguage || "en"}`);

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
        OPENAI_API_KEY,
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
        
        // Update generation record as failed
        if (generationId) {
          await supabase
            .from("generations")
            .update({
              status: "error",
              error_message: result.error,
              completed_at: new Date().toISOString(),
            })
            .eq("id", generationId);
        }
        
        return new Response(
          JSON.stringify({ success: false, error: result.error }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Update generation record with task ID and model used
      if (generationId) {
        await supabase
          .from("generations")
          .update({
            external_task_id: result.taskId,
            model: result.model.model,
            progress: 20,
            step: "processing",
          })
          .eq("id", generationId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.taskId,
          status: result.status,
          model: result.model.displayName,
          provider: result.model.provider,
          generationId,
          mediaUrl: result.mediaUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      const provider = url.searchParams.get("provider") || "openai";
      
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      console.log(`[STATUS] Checking task ${taskId} (${provider})`);

      let statusResponse: VideoStatusResponse;

      if (provider === "openai") {
        // OpenAI Sora status endpoint
        const response = await fetch(`https://api.openai.com/v1/videos/${taskId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[STATUS] OpenAI error: ${response.status} - ${errorText}`);
          
          statusResponse = {
            id: taskId,
            status: "failed",
            progress: 0,
            error: `Status check failed: ${response.status}`,
          };
        } else {
          const result = await response.json();
          console.log(`[STATUS] OpenAI result:`, JSON.stringify(result).substring(0, 200));
          
          // Map OpenAI status to our status
          const openaiStatus = result.status || "queued";
          let mappedStatus: VideoStatusResponse["status"] = "queued";
          let progress = 0;
          
          if (openaiStatus === "completed" || openaiStatus === "succeeded") {
            mappedStatus = "completed";
            progress = 100;
          } else if (openaiStatus === "failed" || openaiStatus === "error") {
            mappedStatus = "failed";
            progress = 0;
          } else if (openaiStatus === "processing" || openaiStatus === "in_progress") {
            mappedStatus = "in_progress";
            progress = 50;
          }
          
          statusResponse = {
            id: taskId,
            status: mappedStatus,
            progress,
            videoUrl: result.output_video || result.video_url || result.output?.video,
            error: result.error,
          };
        }
      } else {
        // CometAPI status endpoint
        const response = await fetch(`https://api.cometapi.com/v1/video/generations/${taskId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${COMETAPI_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[STATUS] CometAPI error: ${response.status} - ${errorText}`);
          
          statusResponse = {
            id: taskId,
            status: "failed",
            progress: 0,
            error: `Status check failed: ${response.status}`,
          };
        } else {
          const result = await response.json();
          console.log(`[STATUS] CometAPI result:`, JSON.stringify(result).substring(0, 200));
          
          // Map CometAPI status
          const cometStatus = result.task?.status_name || result.status || "queued";
          let mappedStatus: VideoStatusResponse["status"] = "queued";
          let progress = result.task?.progress || 0;
          
          if (cometStatus === "completed" || cometStatus === "success" || cometStatus === "succeed") {
            mappedStatus = "completed";
            progress = 100;
          } else if (cometStatus === "failed" || cometStatus === "error") {
            mappedStatus = "failed";
            progress = 0;
          } else if (cometStatus === "processing" || cometStatus === "running") {
            mappedStatus = "in_progress";
          }
          
          statusResponse = {
            id: taskId,
            status: mappedStatus,
            progress,
            videoUrl: result.video_url || result.output?.video || result.works?.[0]?.resource?.resource,
            error: result.error_message,
          };
        }
      }

      // Update generation record if we have a video URL
      if (statusResponse.status === "completed" && statusResponse.videoUrl) {
        const { data: genData } = await supabase
          .from("generations")
          .select("id")
          .eq("external_task_id", taskId)
          .maybeSingle();

        if (genData) {
          await supabase
            .from("generations")
            .update({
              status: "completed",
              media_url: statusResponse.videoUrl,
              progress: 100,
              step: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", genData.id);
          console.log(`[STATUS] Updated generation ${genData.id} as completed`);
        }
      }

      return new Response(
        JSON.stringify(statusResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "download") {
      const taskId = url.searchParams.get("taskId");
      const provider = url.searchParams.get("provider") || "openai";
      
      if (!taskId) {
        throw new Error("taskId is required for download");
      }

      console.log(`[DOWNLOAD] Getting video for task ${taskId} (${provider})`);

      let videoUrl: string | null = null;

      if (provider === "openai") {
        // OpenAI - get video URL from status
        const response = await fetch(`https://api.openai.com/v1/videos/${taskId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          videoUrl = result.output_video || result.video_url || result.output?.video;
        }
      } else {
        // CometAPI - get video URL from status
        const response = await fetch(`https://api.cometapi.com/v1/video/generations/${taskId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${COMETAPI_API_KEY}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          videoUrl = result.video_url || result.output?.video || result.works?.[0]?.resource?.resource;
        }
      }

      if (!videoUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Video not ready or not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, videoUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
