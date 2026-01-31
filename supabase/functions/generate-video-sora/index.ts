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
// MODEL SELECTION WITH CORRECT COMETAPI ENDPOINTS
// Each model has its own endpoint in CometAPI
// ============================================================

interface VideoModelConfig {
  model: string;
  endpoint: string;
  maxDuration: number;
  displayName: string;
  requestBody: (prompt: string, duration: number, aspectRatio: string) => Record<string, any>;
}

// CometAPI model configurations with VERIFIED endpoints and request formats
// Updated 2026-01-31 - Model names from CometAPI docs: kling-v2-6, kling-v2-5-turbo, kling-v2-1-master
const COMETAPI_MODELS: Record<string, VideoModelConfig> = {
  // ============================================================
  // KLING MODELS - Endpoint: /kling/v1/videos/text2video
  // Valid model names: kling-v2-6, kling-v2-5-turbo, kling-v2-1-master, kling-v2-1, kling-v2-master
  // ============================================================
  "kling-v2.5-turbo": {
    model: "kling-v2-5-turbo",
    endpoint: "https://api.cometapi.com/kling/v1/videos/text2video",
    maxDuration: 10,
    displayName: "Kling V2.5 Turbo",
    requestBody: (prompt, duration, aspectRatio) => ({
      model_name: "kling-v2-5-turbo",
      prompt,
      duration: String(duration > 5 ? 10 : 5),
      aspect_ratio: aspectRatio,
      mode: "pro",
    }),
  },
  "kling-v2-master": {
    model: "kling-v2-master",
    endpoint: "https://api.cometapi.com/kling/v1/videos/text2video",
    maxDuration: 10,
    displayName: "Kling V2 Master",
    requestBody: (prompt, duration, aspectRatio) => ({
      model_name: "kling-v2-master",
      prompt,
      duration: String(duration > 5 ? 10 : 5),
      aspect_ratio: aspectRatio,
    }),
  },
  "kling-v2.1-master": {
    model: "kling-v2-1-master",
    endpoint: "https://api.cometapi.com/kling/v1/videos/text2video",
    maxDuration: 10,
    displayName: "Kling V2.1 Master",
    requestBody: (prompt, duration, aspectRatio) => ({
      model_name: "kling-v2-1-master",
      prompt,
      duration: String(duration > 5 ? 10 : 5),
      aspect_ratio: aspectRatio,
    }),
  },
  
  // ============================================================
  // MINIMAX - Endpoint: /v1/video_generation
  // Model name: video-01 (NOT video-01-live2d)
  // ============================================================
  "minimax-hailuo": {
    model: "video-01",
    endpoint: "https://api.cometapi.com/v1/video_generation",
    maxDuration: 6,
    displayName: "MiniMax Hailuo",
    requestBody: (prompt, _duration, _aspectRatio) => ({
      model: "video-01",
      prompt,
    }),
  },
  
  // ============================================================
  // BYTEDANCE/SEEDANCE - Endpoint: /volc/v3/contents/generations/tasks
  // content MUST be an array, not an object
  // ============================================================
  "bytedance-video": {
    model: "doubao-seedance-1-0-lite-t2v-250428",
    endpoint: "https://api.cometapi.com/volc/v3/contents/generations/tasks",
    maxDuration: 8,
    displayName: "Bytedance Seedance",
    requestBody: (prompt, _duration, aspectRatio) => ({
      model: "doubao-seedance-1-0-lite-t2v-250428",
      content: [
        {
          type: "text",
          text: prompt,
        }
      ],
      parameters: {
        aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9",
      },
    }),
  },
};

// Fallback chains for each quality tier
const MODEL_FALLBACK_CHAINS: Record<string, string[]> = {
  cinema: ["kling-v2-master", "bytedance-video", "minimax-hailuo"],
  pro: ["kling-v2.1-master", "bytedance-video", "minimax-hailuo"],
  standard: ["kling-v2.5-turbo", "minimax-hailuo", "bytedance-video"],
};

function getModelFallbackChain(quality: string): VideoModelConfig[] {
  const modelIds = MODEL_FALLBACK_CHAINS[quality] || MODEL_FALLBACK_CHAINS["standard"];
  return modelIds.map(id => COMETAPI_MODELS[id]).filter(Boolean);
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
    console.log(`[FALLBACK] Endpoint: ${model.endpoint}`);
    
    try {
      const requestBody = model.requestBody(prompt, clampedDuration, aspectRatio);
      console.log(`[FALLBACK] Request body:`, JSON.stringify(requestBody).substring(0, 200));
      
      const response = await fetch(model.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json", // Force JSON response
        },
        body: JSON.stringify(requestBody),
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
      // MODEL-SPECIFIC STATUS ENDPOINTS
      // Each CometAPI model family has its own status endpoint
      // ============================================================
      
      // Detect model family from task ID prefix or generation record
      let modelFamily = "kling"; // Default to Kling (most common)
      
      if (generationId) {
        const { data: genData } = await supabase
          .from("generations")
          .select("model")
          .eq("id", generationId)
          .single();
        
        if (genData?.model) {
          const model = genData.model.toLowerCase();
          if (model.includes("kling")) modelFamily = "kling";
          else if (model.includes("minimax") || model.includes("hailuo")) modelFamily = "minimax";
          else if (model.includes("runway") || model.includes("gen4")) modelFamily = "runway";
          else if (model.includes("bytedance") || model.includes("seaweed")) modelFamily = "bytedance";
        }
      }
      
      // Model-specific status endpoint mapping
      const STATUS_ENDPOINTS: Record<string, (id: string) => string> = {
        kling: (id) => `https://api.cometapi.com/v1/kling/task/${id}`,
        minimax: (id) => `https://api.cometapi.com/v1/minimax/query/${id}`,
        runway: (id) => `https://api.cometapi.com/v1/runway/task/${id}`,
        bytedance: (id) => `https://api.cometapi.com/v1/video/bytedance/${id}`,
        // Fallback to legacy generic endpoint
        legacy: (id) => `https://api.cometapi.com/v1/videos/${id}`,
      };
      
      const statusEndpoint = STATUS_ENDPOINTS[modelFamily] || STATUS_ENDPOINTS.legacy;
      const statusUrl = statusEndpoint(taskId);
      
      console.log(`[STATUS] Checking ${modelFamily} task ${taskId} at ${statusUrl}`);

      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json", // Force JSON response
        },
      });

      const responseText = await response.text();
      console.log(`[STATUS] Response: ${response.status} - ${responseText.substring(0, 200)}`);
      
      // Handle HTML error page
      if (responseText.trim().startsWith("<!") || responseText.trim().startsWith("<html")) {
        console.warn(`[STATUS] Received HTML - endpoint may not exist for ${modelFamily}`);
        // Return in-progress status to keep polling
        return new Response(
          JSON.stringify({
            id: taskId,
            status: "in_progress",
            progress: 50,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!response.ok) {
        console.error("Status check error:", responseText);
        // Don't throw - return in-progress to keep polling
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
      
      // Normalize response across different model families
      const taskStatus = result.task?.status_name || result.status || result.task_status || "queued";
      const taskProgress = result.progress || result.task?.progress || 0;
      
      console.log(`[STATUS] Task status: ${taskStatus}, progress: ${taskProgress}`);

      const statusResponse: VideoStatusResponse = {
        id: taskId,
        status: taskStatus === "succeed" || taskStatus === "completed" || taskStatus === "complete" ? "completed" :
                taskStatus === "failed" || taskStatus === "error" ? "failed" :
                taskStatus === "queued" || taskStatus === "pending" ? "queued" : "in_progress",
        progress: taskProgress,
      };

      // Map progress to our 0-100 scale
      let dbProgress = 20;
      if (statusResponse.status === "in_progress") {
        dbProgress = Math.min(80, 20 + (taskProgress || 0) * 0.6);
      }

      if (statusResponse.status === "completed") {
        // Extract video URL from various response formats
        let videoUrl = result.output_video || result.video_url || result.url ||
                       result.task?.works?.[0]?.resource?.resource ||
                       result.works?.[0]?.resource?.resource ||
                       result.data?.video_url ||
                       result.output?.video;
        
        // If no URL found, try content endpoint
        if (!videoUrl) {
          console.log("[STATUS] No video URL in response, trying content endpoint...");
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
                console.log("[STATUS] Video uploaded to storage:", videoUrl);
              }
            }
          } catch (e) {
            console.error("[STATUS] Content download failed:", e);
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
        
        console.log(`✓ [STATUS] Video completed: ${videoUrl?.substring(0, 50)}...`);
        
      } else if (statusResponse.status === "failed") {
        statusResponse.error = result.error || result.message || "Video generation failed";
        
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
