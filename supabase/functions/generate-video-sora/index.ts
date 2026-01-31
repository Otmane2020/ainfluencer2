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
// MODEL SELECTION - SORA 2 (OpenAI) + VEO 3.1 (Gemini API)
// 4 models only: Sora 2, Sora 2 Pro, Veo 3.1, Veo 3.1 Pro
// ============================================================

interface VideoModelConfig {
  model: string;
  endpoint: string;
  maxDuration: number;
  displayName: string;
  provider: "openai" | "gemini";
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
// GEMINI VEO 3.1 MODELS (Direct Google API)
// API: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning
// ============================================================
const GEMINI_VEO_MODELS: Record<string, VideoModelConfig> = {
  "veo-3.1-pro": {
    model: "veo-3.1-generate-preview", // Gemini API model name
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning",
    maxDuration: 8,
    displayName: "Veo 3.1 Pro",
    provider: "gemini",
    requestBody: (prompt, duration, aspectRatio) => ({
      instances: [{
        prompt,
      }],
      parameters: {
        aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
        durationSeconds: Math.min(duration, 8),
        negativePrompt: "blurry, low quality, distorted, amateur, watermark",
      },
    }),
  },
  "veo-3.1": {
    model: "veo-3.1-generate-preview",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning",
    maxDuration: 8,
    displayName: "Veo 3.1",
    provider: "gemini",
    requestBody: (prompt, duration, aspectRatio) => ({
      instances: [{
        prompt,
      }],
      parameters: {
        aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
        durationSeconds: Math.min(duration, 8),
      },
    }),
  },
};

// All available models
const ALL_MODELS: Record<string, VideoModelConfig> = {
  ...OPENAI_MODELS,
  ...GEMINI_VEO_MODELS,
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

// Valid durations for each provider
const VALID_DURATIONS: Record<string, number[]> = {
  openai: [4, 8, 12],  // Sora only accepts 4, 8, or 12 seconds
  gemini: [5, 6, 7, 8], // Veo accepts 5-8 seconds
};

function clampDuration(duration: number, config: VideoModelConfig): number {
  const validDurations = VALID_DURATIONS[config.provider] || [5, 8];
  
  // Find the closest valid duration that doesn't exceed requested
  const validBelow = validDurations.filter(d => d <= duration);
  if (validBelow.length > 0) {
    return Math.max(...validBelow);
  }
  
  // If no valid duration is below, use the smallest valid one
  return Math.min(...validDurations);
}

// ============================================================
// VIDEO GENERATION WITH MULTI-PROVIDER FALLBACK
// Supports OpenAI (FormData) and Gemini Veo (JSON with x-goog-api-key)
// ============================================================

async function tryVideoGeneration(
  models: VideoModelConfig[],
  prompt: string,
  duration: number,
  aspectRatio: string,
  openaiApiKey: string,
  geminiApiKey: string
): Promise<{ success: boolean; model: VideoModelConfig; taskId?: string; status?: string; mediaUrl?: string; error?: string }> {
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const clampedDuration = clampDuration(duration, model);
    
    // Check if we have the API key for this provider
    const apiKey = model.provider === "openai" ? openaiApiKey : geminiApiKey;
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
        // Gemini Veo API uses x-goog-api-key header
        response = await fetch(model.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
    
    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      throw new Error("No video API keys configured. Please add OPENAI_API_KEY or GEMINI_API_KEY in secrets.");
    }
    
    // Log API key availability (for debugging)
    console.log(`[CONFIG] OpenAI Sora 2: ${OPENAI_API_KEY ? "✓ Available" : "✗ Not configured"}`);
    console.log(`[CONFIG] Gemini Veo 3.1: ${GEMINI_API_KEY ? "✓ Available" : "✗ Not configured"}`);

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

      // Create generation record with delayed check scheduling
      // Provider-based check delays: OpenAI Sora = 150s, CometAPI Veo = 45s
      const PROVIDER_CHECK_DELAYS: Record<string, number> = {
        openai: 150000,  // 2.5 minutes for Sora
        cometapi: 45000, // 45 seconds for Veo
      };
      
      let generationId: string | null = null;
      if (userId) {
        // Calculate initial check_after based on primary model's provider
        const primaryProvider = modelConfig.provider;
        const checkDelay = PROVIDER_CHECK_DELAYS[primaryProvider] || 120000;
        const checkAfter = new Date(Date.now() + checkDelay);
        
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
            // Delayed check fields
            provider: primaryProvider,
            check_after: checkAfter.toISOString(),
            check_count: 0,
          })
          .select("id")
          .single();

        if (!genError && genData) {
          generationId = genData.id;
          console.log(`Created generation record: ${generationId} (check_after: ${checkAfter.toISOString()})`);
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
        GEMINI_API_KEY
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
      
      // Update generation record with task ID, provider, and model used
      if (generationId) {
        // Gemini Veo is faster (~45s), Sora takes longer (~150s)
        const checkDelay = result.model.provider === "gemini" ? 45000 : 150000;
        const checkAfter = new Date(Date.now() + checkDelay);
        
        await supabase
          .from("generations")
          .update({
            external_task_id: result.taskId,
            model: result.model.model,
            provider: result.model.provider,
            progress: 20,
            step: "processing",
            check_after: checkAfter.toISOString(),
          })
          .eq("id", generationId);
        
        console.log(`[VIDEO] Updated generation with task ID, next check at: ${checkAfter.toISOString()}`);
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
        // Gemini Veo status endpoint - poll the operation
        const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
        const response = await fetch(`${BASE_URL}/${taskId}`, {
          method: "GET",
          headers: {
            "x-goog-api-key": GEMINI_API_KEY,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[STATUS] Gemini error: ${response.status} - ${errorText}`);
          
          statusResponse = {
            id: taskId,
            status: "failed",
            progress: 0,
            error: `Status check failed: ${response.status}`,
          };
        } else {
          const result = await response.json();
          console.log(`[STATUS] Gemini result:`, JSON.stringify(result).substring(0, 200));
          
          // Map Gemini operation status
          const isDone = result.done === true;
          let mappedStatus: VideoStatusResponse["status"] = "queued";
          let progress = 0;
          let videoUrl: string | undefined;
          
          if (isDone) {
            if (result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri) {
              mappedStatus = "completed";
              progress = 100;
              videoUrl = result.response.generateVideoResponse.generatedSamples[0].video.uri;
            } else if (result.error) {
              mappedStatus = "failed";
            } else {
              mappedStatus = "completed";
              progress = 100;
            }
          } else {
            mappedStatus = "in_progress";
            progress = 50;
          }
          
          statusResponse = {
            id: taskId,
            status: mappedStatus,
            progress,
            videoUrl,
            error: result.error?.message,
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
        // Gemini Veo - get video URL from operation status
        const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
        const response = await fetch(`${BASE_URL}/${taskId}`, {
          method: "GET",
          headers: {
            "x-goog-api-key": GEMINI_API_KEY,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.done && result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri) {
            videoUrl = result.response.generateVideoResponse.generatedSamples[0].video.uri;
          }
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
