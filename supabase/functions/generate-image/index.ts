import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  validateAndBuildContext, 
  fetchProjectContext, 
  logContextValidation,
  type MarketingContext,
  type GenerationGuardInput 
} from "../_shared/generation-context-guard.ts";
import {
  createKieTask,
  checkKieTaskStatus,
  KIE_ENDPOINTS,
} from "../_shared/kie-api-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// MODEL CREDIT COSTS - Centralized pricing
// ============================================================

const MODEL_CREDIT_COSTS: Record<string, number> = {
  // Text → Image
  "qwen-zimage": 0.8,
  "grok-imagine-text": 4,
  "flux-kontext-pro": 5,
  "flux-2-pro-1k": 5,
  "openai-4o-image": 6,
  "flux-2-pro-2k": 7,
  "flux-kontext-max": 10,
  "flux-2-flex-1k": 14,
  "nano-banana-pro-2k": 18,
  "flux-2-flex-2k": 24,
  "nano-banana-pro-4k": 24,
  
  // Image → Image
  "recraft-crisp-upscale": 0.5,
  "recraft-remove-bg": 1,
  "ideogram-v3-remix-turbo": 3.5,
  "grok-imagine-img": 4,
  "ideogram-v3-remix-balanced": 7,
  "ideogram-v3-remix-quality": 10,
  "ideogram-v3-edit-quality": 10,
  "ideogram-v3-reframe": 10,
  
  // Legacy mappings
  "standard": 1,
  "pro": 3,
  "cinema": 5,
  "smart-image": 1,
  "high-image": 3,
  "studio-image": 5,
};

function getCreditCost(modelId: string): number {
  return MODEL_CREDIT_COSTS[modelId] || 5; // Default to 5 credits
}

// ============================================================
// MODEL POOL CONFIGURATION - Legacy support
// ============================================================

interface ModelOption {
  id: string;
  provider: "openai" | "gemini" | "flux" | "kie";
  weight: number;
  apiModel: string;
  displayName: string;
}

const IMAGE_MODEL_POOLS: Record<string, ModelOption[]> = {
  standard: [
    { id: "nano-banana", provider: "gemini", weight: 70, apiModel: "google/gemini-2.5-flash-image", displayName: "Nano Banana" },
    { id: "flux-schnell", provider: "flux", weight: 30, apiModel: "black-forest-labs/flux-schnell", displayName: "FLUX Schnell" },
  ],
  pro: [
    { id: "nano-banana-pro", provider: "gemini", weight: 60, apiModel: "google/gemini-3-pro-image-preview", displayName: "Nano Banana Pro" },
    { id: "flux-dev", provider: "flux", weight: 35, apiModel: "black-forest-labs/flux-dev", displayName: "FLUX Dev" },
    { id: "gpt-image", provider: "openai", weight: 5, apiModel: "gpt-image-1", displayName: "GPT Image" },
  ],
  cinema: [
    { id: "flux-pro", provider: "flux", weight: 50, apiModel: "black-forest-labs/flux-pro", displayName: "FLUX Pro" },
    { id: "nano-banana-pro", provider: "gemini", weight: 45, apiModel: "google/gemini-3-pro-image-preview", displayName: "Nano Banana Pro" },
    { id: "gpt-image", provider: "openai", weight: 5, apiModel: "gpt-image-1", displayName: "GPT Image" },
  ],
};

const LEGACY_QUALITY_MAPPINGS: Record<string, string> = {
  "ai-image-smart": "standard",
  "ai-image-standard": "standard",
  "ai-image-pro": "pro",
  "ai-image-studio": "cinema",
};

function selectModelFromPool(qualityId: string): ModelOption {
  const mappedQualityId = LEGACY_QUALITY_MAPPINGS[qualityId] || qualityId;
  const pool = IMAGE_MODEL_POOLS[mappedQualityId] || IMAGE_MODEL_POOLS["standard"];
  
  const totalWeight = pool.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const model of pool) {
    random -= model.weight;
    if (random <= 0) return model;
  }
  
  return pool[0];
}

// ============================================================
// MODEL ROUTING - Direct model selection
// ============================================================

interface ModelRouting {
  provider: "kie" | "lovable" | "openai" | "replicate";
  endpoint?: string;
  apiModel?: string;
}

function getModelRouting(modelId: string): ModelRouting {
  // KIE API models - all endpoints require /v1/ prefix
  const kieModels: Record<string, string> = {
    "qwen-zimage": "/v1/qwen/z-image",
    "grok-imagine-text": "/v1/grok/imagine",
    "grok-imagine-img": "/v1/grok/imagine",
    "flux-kontext-pro": "/v1/flux/kontext",
    "flux-kontext-max": "/v1/flux/kontext",
    "flux-2-pro-1k": "/v1/flux/2-pro",
    "flux-2-pro-2k": "/v1/flux/2-pro",
    "flux-2-flex-1k": "/v1/flux/2-flex",
    "flux-2-flex-2k": "/v1/flux/2-flex",
    "recraft-remove-bg": "/v1/recraft/remove-background",
    "recraft-crisp-upscale": "/v1/recraft/crisp-upscale",
    "ideogram-v3-remix-turbo": "/v1/ideogram/v3-remix",
    "ideogram-v3-remix-balanced": "/v1/ideogram/v3-remix",
    "ideogram-v3-remix-quality": "/v1/ideogram/v3-remix",
    "ideogram-v3-edit-quality": "/v1/ideogram/v3-edit",
    "ideogram-v3-reframe": "/v1/ideogram/v3-reframe",
  };

  if (kieModels[modelId]) {
    return { provider: "kie", endpoint: kieModels[modelId] };
  }

  // Lovable AI (Nano Banana)
  if (modelId.startsWith("nano-banana")) {
    const apiModel = modelId.includes("4k") || modelId.includes("pro") 
      ? "google/gemini-3-pro-image-preview" 
      : "google/gemini-2.5-flash-image";
    return { provider: "lovable", apiModel };
  }

  // OpenAI
  if (modelId.includes("openai") || modelId === "gpt-image") {
    return { provider: "openai", apiModel: "gpt-image-1" };
  }

  // Default to Lovable
  return { provider: "lovable", apiModel: "google/gemini-2.5-flash-image" };
}

// ============================================================
// LOGO OVERLAY UTILITY
// ============================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

async function overlayLogoOnImage(
  baseImageData: string,
  logoUrl: string,
  position: "bottom-right" | "top-left" | "bottom-left" | "top-right" = "bottom-right"
): Promise<string> {
  try {
    console.log("[LogoOverlay] Fetching logo from:", logoUrl);
    
    const logoResponse = await fetch(logoUrl);
    if (!logoResponse.ok) {
      console.error("[LogoOverlay] Failed to fetch logo:", logoResponse.status);
      return baseImageData;
    }
    
    const logoBlob = await logoResponse.blob();
    const logoArrayBuffer = await logoBlob.arrayBuffer();
    const logoBase64 = arrayBufferToBase64(logoArrayBuffer);
    const logoDataUrl = `data:${logoBlob.type || "image/png"};base64,${logoBase64}`;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[LogoOverlay] No LOVABLE_API_KEY");
      return baseImageData;
    }
    
    const compositePrompt = `Take this base image and add the provided logo to the ${position.replace("-", " ")} corner. 
The logo should be:
- Small (about 10-15% of the image width)
- Semi-transparent or with subtle shadow for integration
- Positioned in the ${position.replace("-", " ")} corner with appropriate padding
- Preserve the original image quality and composition
Keep the base image exactly as is, only add the logo overlay.`;

    console.log("[LogoOverlay] Requesting composite via AI...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: [
              { type: "text", text: compositePrompt },
              { type: "image_url", image_url: { url: baseImageData } },
              { type: "image_url", image_url: { url: logoDataUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("[LogoOverlay] AI composite failed:", response.status);
      return baseImageData;
    }

    const data = await response.json();
    const compositedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (compositedImage) {
      console.log("[LogoOverlay] Logo successfully added!");
      return compositedImage;
    }
    
    console.log("[LogoOverlay] No composited image returned, using original");
    return baseImageData;
  } catch (error) {
    console.error("[LogoOverlay] Error:", error);
    return baseImageData;
  }
}

// ============================================================
// LANGUAGE CONFIGURATION
// ============================================================

const LANGUAGE_CONFIG: Record<string, { name: string; fullName: string; instruction: string }> = {
  fr: { 
    name: "French", 
    fullName: "French (Français)",
    instruction: "TOUT le texte DOIT être en FRANÇAIS. Aucun mot anglais autorisé."
  },
  en: { 
    name: "English", 
    fullName: "English",
    instruction: "All text must be in English."
  },
  es: { 
    name: "Spanish", 
    fullName: "Spanish (Español)",
    instruction: "TODO el texto DEBE estar en ESPAÑOL. No se permite inglés."
  },
  de: { 
    name: "German", 
    fullName: "German (Deutsch)",
    instruction: "ALLE Texte MÜSSEN auf DEUTSCH sein. Kein Englisch erlaubt."
  },
  it: { 
    name: "Italian", 
    fullName: "Italian (Italiano)",
    instruction: "TUTTO il testo DEVE essere in ITALIANO. Nessun inglese permesso."
  },
  pt: { 
    name: "Portuguese", 
    fullName: "Portuguese (Português)",
    instruction: "TODO o texto DEVE estar em PORTUGUÊS. Nenhum inglês permitido."
  },
};

// ============================================================
// KIE API GENERATION
// ============================================================

async function generateWithKieApi(
  prompt: string,
  modelId: string,
  endpoint: string,
  sourceImage?: string,
  aspectRatio: string = "1:1",
  resolution?: string
): Promise<{ imageData: string | null; error?: string }> {
  try {
    console.log(`[KIE] Generating with ${modelId} via ${endpoint}`);
    
    // Build payload based on model type
    const payload: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
    };

    // Add source image for img→img models
    if (sourceImage) {
      payload.image = sourceImage;
    }

    // Add resolution for specific models
    if (resolution) {
      payload.resolution = resolution;
    }

    // Model-specific parameters
    if (modelId.includes("ideogram")) {
      if (modelId.includes("turbo")) {
        payload.rendering_speed = "TURBO";
      } else if (modelId.includes("balanced")) {
        payload.rendering_speed = "BALANCED";
      } else if (modelId.includes("quality")) {
        payload.rendering_speed = "QUALITY";
      }
    }

    if (modelId.includes("flux-kontext-max")) {
      payload.model = "max";
    }

    const result = await createKieTask(endpoint, payload);

    if (!result.success || !result.taskId) {
      return { imageData: null, error: result.error || "Failed to create task" };
    }

    // Poll for result
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const status = await checkKieTaskStatus(result.taskId);
      
      if (status.status === "completed") {
        const imageUrl = status.resultUrl || status.resultUrls?.[0];
        
        if (!imageUrl) {
          return { imageData: null, error: "No image URL in result" };
        }

        // Fetch and convert to base64
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          return { imageData: null, error: "Failed to fetch generated image" };
        }

        const imgBlob = await imgResponse.blob();
        const imgArrayBuffer = await imgBlob.arrayBuffer();
        const imgBase64 = arrayBufferToBase64(imgArrayBuffer);
        const imageData = `data:${imgBlob.type || "image/png"};base64,${imgBase64}`;

        console.log(`[KIE] ✓ Image generated with ${modelId}`);
        return { imageData };
      }
      
      if (status.status === "failed") {
        return { imageData: null, error: status.error || "Generation failed" };
      }
      
      attempts++;
    }

    return { imageData: null, error: "Generation timed out" };
  } catch (error) {
    console.error("[KIE] Exception:", error);
    return { imageData: null, error: String(error) };
  }
}

// ============================================================
// OPENAI GPT IMAGE GENERATION
// ============================================================

async function generateWithOpenAI(
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<{ imageData: string | null; error?: string }> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("[OpenAI] No API key configured");
    return { imageData: null, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const sizeMap: Record<string, string> = {
      "9:16": "1024x1536",
      "16:9": "1536x1024",
      "1:1": "1024x1024",
    };
    const size = sizeMap[aspectRatio] || "1024x1024";

    console.log(`[OpenAI] Generating image with GPT Image, size: ${size}`);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: size,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenAI] Error ${response.status}:`, errorText.slice(0, 300));
      return { imageData: null, error: `OpenAI error: ${response.status}` };
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    const base64Image = data.data?.[0]?.b64_json;

    if (base64Image) {
      const imageData = `data:image/png;base64,${base64Image}`;
      console.log("[OpenAI] ✓ Image generated successfully with GPT Image (b64)");
      return { imageData };
    }

    if (imageUrl) {
      console.log("[OpenAI] Fetching image from URL...");
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        return { imageData: null, error: "Failed to fetch generated image" };
      }
      
      const imgBlob = await imgResponse.blob();
      const imgArrayBuffer = await imgBlob.arrayBuffer();
      const imgBase64 = arrayBufferToBase64(imgArrayBuffer);
      const imageData = `data:${imgBlob.type || "image/png"};base64,${imgBase64}`;
      
      console.log("[OpenAI] ✓ Image generated successfully with GPT Image (url)");
      return { imageData };
    }

    return { imageData: null, error: "No image generated" };
  } catch (error) {
    console.error("[OpenAI] Exception:", error);
    return { imageData: null, error: String(error) };
  }
}

// ============================================================
// LOVABLE AI GENERATION (Nano Banana)
// ============================================================

async function generateWithLovable(
  prompt: string,
  model: string,
  sourceImage?: string
): Promise<{ imageData: string | null; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { imageData: null, error: "LOVABLE_API_KEY not configured" };
  }

  try {
    const displayName = model.includes("gemini-3") ? "Nano Banana Pro" : "Nano Banana";
    console.log(`[Lovable] Generating image with ${displayName} (${model})`);

    const content: any[] = [{ type: "text", text: prompt }];
    
    // Add source image if provided
    if (sourceImage) {
      content.push({ type: "image_url", image_url: { url: sourceImage } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`[Lovable] Error ${status}:`, errorText.slice(0, 200));
      
      if (status === 429) {
        return { imageData: null, error: "Rate limit exceeded. Please try again later." };
      }
      if (status === 402) {
        return { imageData: null, error: "Payment required. Please add credits." };
      }
      return { imageData: null, error: `Lovable error: ${status}` };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return { imageData: null, error: "No image generated" };
    }

    console.log(`[Lovable] ✓ Image generated successfully with ${displayName}`);
    return { imageData };
  } catch (error) {
    console.error("[Lovable] Exception:", error);
    return { imageData: null, error: String(error) };
  }
}

// ============================================================
// UNIFIED GENERATION WITH ROUTING
// ============================================================

async function generateImage(
  prompt: string,
  modelId: string,
  sourceImage?: string,
  aspectRatio: string = "1:1"
): Promise<{ imageData: string | null; error?: string; provider: string }> {
  const routing = getModelRouting(modelId);
  
  console.log(`[Router] Model: ${modelId} → Provider: ${routing.provider}`);

  // Extract resolution from modelId
  let resolution: string | undefined;
  if (modelId.includes("1k")) resolution = "1024";
  if (modelId.includes("2k")) resolution = "2048";
  if (modelId.includes("4k")) resolution = "4096";

  let result: { imageData: string | null; error?: string };

  switch (routing.provider) {
    case "kie":
      result = await generateWithKieApi(
        prompt,
        modelId,
        routing.endpoint!,
        sourceImage,
        aspectRatio,
        resolution
      );
      break;

    case "openai":
      result = await generateWithOpenAI(prompt, aspectRatio);
      break;

    case "lovable":
    default:
      result = await generateWithLovable(prompt, routing.apiModel!, sourceImage);
      break;
  }

  return { ...result, provider: routing.provider };
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt,
      modelId,
      productId,
      qualityId,
      quality,
      format, 
      aspectRatio,
      sourceImage,
      sectorId, 
      styleId, 
      toneId, 
      logoUrl, 
      brandName, 
      includeLogo, 
      includeUrl, 
      projectUrl,
      detectedLanguage,
      includeText,
      overlayText,
      includeAvatar,
      avatarUrl,
      aiContextSummary,
      marketingContext,
      skipCreditDeduction,
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
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

    // Determine model and credit cost
    let effectiveModelId = modelId;
    let isLegacyMode = false;

    // Legacy mode: use pool selection
    if (!modelId && (productId || qualityId || quality)) {
      isLegacyMode = true;
      const effectiveQuality = quality || LEGACY_QUALITY_MAPPINGS[qualityId] || LEGACY_QUALITY_MAPPINGS[productId] || qualityId || "standard";
      const selectedModel = selectModelFromPool(effectiveQuality);
      effectiveModelId = selectedModel.id;
      console.log(`[Legacy] Using pool selection: ${effectiveQuality} → ${effectiveModelId}`);
    }

    const creditCostRaw = getCreditCost(effectiveModelId);
    // Database expects integer - round up to avoid undercharging
    const creditCost = Math.ceil(creditCostRaw);

    console.log(`=== Image Generation Request ===`);
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`Model: ${effectiveModelId} | Credit Cost: ${creditCost} (raw: ${creditCostRaw})`);
    console.log(`Skip credit deduction: ${skipCreditDeduction ? "Yes" : "No"}`);

    // ============================================================
    // CREDIT VALIDATION & DEDUCTION
    // ============================================================
    if (userId && !skipCreditDeduction) {
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
            error: "Insufficient credits", 
            code: "INSUFFICIENT_CREDITS",
            required: creditCost,
            balance: currentBalance,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: deductSuccess, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: userId,
        p_amount: creditCost,
      });

      if (deductError || !deductSuccess) {
        console.error("Credit deduction failed:", deductError);
        return new Response(
          JSON.stringify({ 
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
        description: `Image generation (${effectiveModelId})`,
      });

      console.log(`✓ Deducted ${creditCost} credits for image generation`);
    }

    // Determine output language
    const outputLanguage = detectedLanguage || "en";
    
    // ============================================================
    // BUILD ENHANCED PROMPT
    // ============================================================
    
    const guardInput: GenerationGuardInput = {
      projectName: brandName,
      projectUrl: projectUrl,
      logoUrl: logoUrl,
      themeColor: marketingContext?.visual_identity?.primary_color || undefined,
      detectedLanguage: outputLanguage,
      marketingContext: marketingContext as MarketingContext || null,
      aiContextSummary: aiContextSummary,
      scrapedMarkdown: marketingContext?.scraped_markdown,
      projectDescription: marketingContext?.project_description,
      generationPrompt: prompt,
      generationType: "image",
      includeLogo: includeLogo,
      includeUrl: includeUrl,
      includeText: includeText,
      overlayText: overlayText,
    };
    
    const contextGuard = validateAndBuildContext(guardInput);
    logContextValidation(contextGuard, "ImageGeneration");

    const langConfig = LANGUAGE_CONFIG[outputLanguage] || LANGUAGE_CONFIG["en"];
    const primaryColor = marketingContext?.visual_identity?.primary_color || guardInput.themeColor;
    
    // Build prompt
    const promptParts: string[] = [];
    
    promptParts.push(`=== ARTISTIC DIRECTION ===
STYLE: Ultra-premium cinematic advertising photography. Stylized realism.

⚠️ HUMAN ANATOMY RULES:
- ARMS: Proportional, natural joint angles
- HANDS: 5 fingers, correct proportions
- POSTURE: Natural, balanced, credible
- LIGHTING: Unified, consistent shadows

📸 QUALITY:
- Cinematic lighting with depth
- Professional color grading
- Sharp details, natural textures`);
    
    if (outputLanguage !== "en") {
      promptParts.push(`
⚠️ LANGUAGE: ${langConfig.fullName}
${langConfig.instruction}`);
    }
    
    if (contextGuard.contextScore >= 40) {
      promptParts.push(contextGuard.brandContext);
    } else if (brandName) {
      promptParts.push(`BRAND: ${brandName}`);
    }
    
    promptParts.push(`
=== GENERATION REQUEST ===
${prompt}`);
    
    promptParts.push(`
⛔ TEXT BAN: NO text, words, or typography in the image.`);
    
    if (primaryColor) {
      promptParts.push(`
BRAND COLOR: ${primaryColor} - integrate through lighting and environment.`);
    }
    
    if (includeLogo || includeUrl || includeText) {
      promptParts.push(`
COMPOSITION: Keep bottom 20% clean for overlay.`);
    }
    
    const finalPrompt = promptParts.join('\n\n');
    const effectiveAspect = aspectRatio || (format === "vertical" ? "9:16" : format === "landscape" ? "16:9" : "1:1");

    // Generate image
    const { imageData, error, provider } = await generateImage(
      finalPrompt,
      effectiveModelId,
      sourceImage,
      effectiveAspect
    );

    if (!imageData) {
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
          description: `Refund: Image generation failed (${effectiveModelId})`,
        });
        console.log(`✓ Refunded ${creditCost} credits due to generation failure`);
      }

      return new Response(
        JSON.stringify({ error: error || "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply logo overlay if requested
    let finalImageData = imageData;
    if (includeLogo && logoUrl) {
      console.log("[Main] Applying logo overlay...");
      finalImageData = await overlayLogoOnImage(finalImageData, logoUrl, "bottom-right");
    }

    console.log(`✓ Image generated successfully with ${effectiveModelId}`);

    return new Response(
      JSON.stringify({
        imageUrl: finalImageData,
        model: effectiveModelId,
        provider: provider,
        creditCost: skipCreditDeduction ? 0 : creditCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
