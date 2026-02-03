import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  compileVideoPrompt, 
  extractBrandContext, 
  type BrandContext, 
  type VideoPromptConfig 
} from "../_shared/video-prompt-compiler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// CREDIT COSTS - Duration-Based Pricing Strategy
// • Social Boost   → 4-6s (BASE cost)
// • Pro Engagement → 8-12s (2x cost)
// • Cinema Premium → 12-20s (4x cost)
// ============================================================

const BASE_CREDIT_COSTS: Record<string, number> = {
  standard: 5,  // Sora 2 base
  pro: 10,      // Sora 2 Pro base
  cinema: 10,   // Same as pro (uses Sora 2 Pro)
  // Legacy mappings
  "smart-video": 5,
  "high-video": 10,
  "cinema-video": 10,
};

// Calculate credit cost based on quality AND duration tier
function getCreditCost(quality: string, duration: number): number {
  const baseCost = BASE_CREDIT_COSTS[quality] || BASE_CREDIT_COSTS["standard"];
  
  // Duration tier multipliers
  if (duration <= 6) return baseCost;       // Social tier: 1x
  if (duration <= 12) return baseCost * 2;  // Pro tier: 2x
  return baseCost * 4;                       // Cinema tier: 4x
}

// Get duration tier label for logging
function getDurationTierLabel(duration: number): string {
  if (duration <= 6) return "Social (1x)";
  if (duration <= 12) return "Pro (2x)";
  return "Cinema (4x)";
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

// All available models (Sora 2 + Veo 3.1)
// NOTE: Veo models are only attempted when GEMINI_API_KEY is present.
const ALL_MODELS: Record<string, VideoModelConfig> = {
  ...OPENAI_MODELS,
  ...GEMINI_VEO_MODELS,
};

// Quality tier mapping with fallbacks
// Prefer OpenAI Sora models first, then fall back to Gemini Veo when configured.
// This prevents total outages when OpenAI is rate-limited or billing-limited.
const MODEL_FALLBACK_CHAINS: Record<string, string[]> = {
  cinema: ["sora-2-pro", "sora-2", "veo-3.1-pro", "veo-3.1"],
  pro: ["sora-2-pro", "sora-2", "veo-3.1-pro", "veo-3.1"],
  standard: ["sora-2", "sora-2-pro", "veo-3.1", "veo-3.1-pro"],
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
// Sora 2 Pro supports 4-20s in 4s increments: 4, 8, 12, 16, 20
// Sora 2 (standard) supports 4-12s in 4s increments: 4, 8, 12
const VALID_DURATIONS: Record<string, number[]> = {
  "sora-2-pro": [4, 8, 12, 16, 20],  // Sora 2 Pro supports up to 20s
  "sora-2": [4, 8, 12],               // Sora 2 standard up to 12s
  gemini: [5, 6, 7, 8],               // Veo accepts 5-8 seconds
};

function clampDuration(duration: number, config: VideoModelConfig): number {
  // Use model-specific durations, not provider-level
  const validDurations = VALID_DURATIONS[config.model] || VALID_DURATIONS[config.provider] || [5, 8];
  
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
// Supports OpenAI Sora (FormData with image-to-video) and Gemini Veo
// ============================================================

async function tryVideoGeneration(
  models: VideoModelConfig[],
  prompt: string,
  duration: number,
  aspectRatio: string,
  openaiApiKey: string,
  geminiApiKey: string,
  referenceImageUrl?: string // Optional image for image-to-video
): Promise<{ success: boolean; model: VideoModelConfig; taskId?: string; status?: string; mediaUrl?: string; error?: string }> {
  let lastBillingLimitError: string | null = null;

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
    console.log(`[VIDEO] Requested duration: ${duration}s → Clamped to: ${clampedDuration}s`);
    console.log(`[VIDEO] Endpoint: ${model.endpoint}`);
    if (referenceImageUrl) {
      console.log(`[VIDEO] Image-to-Video mode with reference: ${referenceImageUrl.substring(0, 100)}...`);
    }
    
    try {
      const requestBody = model.requestBody(prompt, clampedDuration, aspectRatio);
      console.log(`[VIDEO] Request params: model=${requestBody.model}, seconds=${requestBody.seconds || clampedDuration}, size=${requestBody.size}`);
      
      let response: Response;
      
      if (model.provider === "openai") {
        // OpenAI uses multipart/form-data
        const formData = new FormData();
        Object.entries(requestBody).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        // Image-to-video: fetch the reference image and attach as input_reference
        if (referenceImageUrl) {
          try {
            console.log(`[VIDEO] Fetching reference image for image-to-video...`);
            const imageResponse = await fetch(referenceImageUrl);
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              const imageBytes = new Uint8Array(imageBuffer);
              
              // Determine content type from URL or default to png
              const contentType = imageResponse.headers.get("content-type") || "image/png";
              const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
              
              // Create a Blob and append to FormData
              const imageBlob = new Blob([imageBytes], { type: contentType });
              formData.append("input_reference", imageBlob, `reference.${extension}`);
              console.log(`[VIDEO] ✓ Attached reference image (${imageBytes.length} bytes, ${contentType})`);
            } else {
              console.warn(`[VIDEO] Failed to fetch reference image: ${imageResponse.status}`);
            }
          } catch (imgErr) {
            console.warn(`[VIDEO] Error fetching reference image:`, imgErr);
            // Continue without image - fall back to text-to-video
          }
        }
        
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

           // Special-case: surface OpenAI billing limit clearly (and keep trying fallbacks)
           if (errorMsg.toLowerCase().includes("billing") && errorMsg.toLowerCase().includes("hard limit")) {
             lastBillingLimitError = errorMsg;
             console.warn(`[${model.model}] Billing limit hit: ${errorMsg} - trying next model`);
             continue;
           }

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
      
      console.log(`✓ [${model.displayName}] Success! Task ID: ${taskId}${referenceImageUrl ? " (image-to-video)" : " (text-to-video)"}`);
      
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
    error: lastBillingLimitError
      ? `Video generation is blocked by provider billing limits: ${lastBillingLimitError}`
      : "All video models are currently unavailable. Please try again later.",
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
  // Image-to-video: optional reference image URL
  referenceImageUrl?: string;
  startingFrameUrl?: string;
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

// ============================================================
// PROMPT CLEANER - Remove emojis, scripts, formatting for Sora
// Sora interprets ALL text literally - emojis become "show emoji"
// ============================================================

function cleanPromptForSora(rawPrompt: string): string {
  let cleaned = rawPrompt;
  
  // Remove emojis and special Unicode characters
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/gu, "");
  
  // Remove common formatting patterns from scenario generator
  cleaned = cleaned.replace(/^🎬.*$/gm, "");           // Header lines
  cleaned = cleaned.replace(/^━+$/gm, "");              // Separator lines
  cleaned = cleaned.replace(/^📍\s*Angle:.*$/gm, "");   // Angle metadata
  cleaned = cleaned.replace(/^📊\s*Engagement:.*$/gm, ""); // Engagement metadata
  cleaned = cleaned.replace(/^📜\s*SCRIPT:$/gm, "");   // Script header
  cleaned = cleaned.replace(/^🎥\s*SCENE BREAKDOWN:$/gm, ""); // Scene header
  cleaned = cleaned.replace(/^\[.*?\]$/gm, "");         // [0-5s] timing markers
  cleaned = cleaned.replace(/^Visual:\s*/gm, "");       // Visual: prefixes
  cleaned = cleaned.replace(/^Voiceover:\s*/gm, "");   // Voiceover: prefixes
  cleaned = cleaned.replace(/^#\w+/gm, "");             // Hashtags
  
  // Remove excessive whitespace and empty lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/^\s+|\s+$/gm, "");
  
  // Extract only the actual scene descriptions (not the script text)
  // Look for descriptive visual content, not dialogue/script
  const lines = cleaned.split("\n").filter(line => {
    const trimmed = line.trim();
    // Skip empty lines and very short lines
    if (trimmed.length < 10) return false;
    // Skip lines that look like spoken dialogue (quotes, first person)
    if (/^["']/.test(trimmed)) return false;
    // Keep lines that describe visuals
    return true;
  });
  
  // Take first 3-4 meaningful lines to keep prompt focused
  const essentialLines = lines.slice(0, 4).join(" ");
  
  // Final cleanup
  cleaned = essentialLines
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500); // Sora works best with concise prompts
  
  console.log(`[PROMPT CLEANER] Original: ${rawPrompt.length} chars → Cleaned: ${cleaned.length} chars`);
  console.log(`[PROMPT CLEANER] Result: ${cleaned.substring(0, 200)}...`);
  
  return cleaned || "Professional promotional video with smooth camera movements and elegant transitions.";
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
        // Image-to-video
        referenceImageUrl,
        startingFrameUrl,
        // Project context
        projectName,
        projectUrl,
        logoUrl,
        detectedLanguage,
        aiContextSummary,
        marketingContext,
      }: VideoRequest = await req.json();

      // Use referenceImageUrl or startingFrameUrl for image-to-video
      const imageToVideoUrl = referenceImageUrl || startingFrameUrl;

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Get model config based on quality
      const modelConfig = getVideoModel(quality);
      
      // Clamp duration to model limits
      const clampedDuration = clampDuration(duration, modelConfig);

      // Determine credit cost (based on quality AND duration tier)
      const creditCost = getCreditCost(quality, clampedDuration);
      const durationTier = getDurationTierLabel(clampedDuration);

      console.log("=== Video Generation ===");
      console.log(`User: ${userId || "anonymous"}`);
      console.log(`Quality: ${quality} | Model: ${modelConfig.model} | Provider: ${modelConfig.provider}`);
      console.log(`Duration: ${clampedDuration}s | Tier: ${durationTier} | Credit Cost: ${creditCost}`);
      console.log(`Mode: ${imageToVideoUrl ? "Image-to-Video" : "Text-to-Video"}`);
      console.log("Prompt:", prompt.substring(0, 100) + "...");
      console.log("Size:", size);

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

      // ============================================================
      // BUILD VIDEO PROMPT USING BRAND CONTEXT COMPILER
      // Pattern: Brand Context → Prompt Compiler → Clean Sora Prompt
      // ============================================================
      
      // Extract brand context from project data
      const brandContext: BrandContext = {
        brand_name: projectName,
        website: projectUrl,
        logo_url: logoUrl,
        primary_color: marketingContext?.visual_identity?.primary_color,
        secondary_colors: marketingContext?.visual_identity?.secondary_colors,
        tone: marketingContext?.brand_personality?.tone,
        values: marketingContext?.brand_personality?.values,
        target_audience: marketingContext?.target_audience?.primary,
        target_demographics: marketingContext?.target_audience?.demographics,
        pain_points: marketingContext?.target_audience?.pain_points,
        desires: marketingContext?.target_audience?.desires,
        products: marketingContext?.products_services,
        aesthetic_style: marketingContext?.visual_identity?.aesthetic_style,
        mood: marketingContext?.visual_identity?.mood,
        visual_preferred: marketingContext?.content_guidelines?.visual_preferred,
        visual_banned: marketingContext?.content_guidelines?.visual_banned,
        competitive_positioning: marketingContext?.competitive_positioning,
        detected_language: detectedLanguage || "en",
        // Full text context for deeper brand understanding
        ai_context_summary: aiContextSummary,
        scraped_markdown: marketingContext?.scraped_markdown,
        project_description: marketingContext?.project_description,
      };
      
      // Compile the video prompt
      const promptConfig: VideoPromptConfig = {
        scenarioType: "promotional",
        duration: clampedDuration,
        aspectRatio: format === "vertical" ? "9:16" : "16:9",
        isClipMotion: videoMode === "clipmotion",
        customPrompt: cleanPromptForSora(prompt), // CLEAN the prompt before compilation
        includeEndBranding: true,
      };
      
      const compiledPrompt = compileVideoPrompt(brandContext, promptConfig);
      let fullPrompt = compiledPrompt.prompt;
      
      // Add avatar styling if provided
      if (avatarUrl) {
        fullPrompt = `Ultra-realistic cinematic video with realistic human presenter: ${fullPrompt}`;
      }

      console.log(`[VIDEO] Brand Compiler: score=${compiledPrompt.metadata.completenessScore}/100 | ClipMotion=${videoMode === "clipmotion"}`);
      console.log(`[VIDEO] Project: ${projectName || "none"} | Language: ${detectedLanguage || "en"}`);
      console.log(`[VIDEO] Final prompt (first 500 chars):`, fullPrompt.substring(0, 500));

      // Create generation record with delayed check scheduling
      // Single API call to start, then wait 4 minutes before first check
      // This matches Sora's actual processing time (3-5 minutes)
      const PROVIDER_CHECK_DELAYS: Record<string, number> = {
        openai: 240000,  // 4 minutes for Sora (reduced unnecessary polling)
        cometapi: 60000, // 1 minute for other providers
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
        GEMINI_API_KEY,
        imageToVideoUrl // Pass reference image for image-to-video
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
