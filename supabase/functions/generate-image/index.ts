import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  validateAndBuildContext, 
  fetchProjectContext, 
  logContextValidation,
  type MarketingContext,
  type GenerationGuardInput 
} from "../_shared/generation-context-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// CREDIT COSTS BY QUALITY
// ============================================================

const CREDIT_COSTS: Record<string, number> = {
  standard: 1,
  pro: 3,
  cinema: 5,
  // Legacy mappings
  "smart-image": 1,
  "high-image": 3,
  "studio-image": 5,
};

function getCreditCost(quality: string): number {
  return CREDIT_COSTS[quality] || CREDIT_COSTS["standard"];
}

// ============================================================
// MODEL POOL CONFIGURATION - OpenAI GPT Image + Nano Banana (Gemini)
// ============================================================

interface ModelOption {
  id: string;
  provider: "openai" | "gemini";
  weight: number;
  apiModel: string;
  displayName: string;
}

// OpenAI GPT Image and Gemini Nano Banana models
const IMAGE_MODEL_POOLS: Record<string, ModelOption[]> = {
  standard: [
    { id: "nano-banana", provider: "gemini", weight: 100, apiModel: "google/gemini-2.5-flash-image", displayName: "Nano Banana" },
  ],
  pro: [
    { id: "nano-banana-pro", provider: "gemini", weight: 60, apiModel: "google/gemini-3-pro-image-preview", displayName: "Nano Banana Pro" },
    { id: "gpt-image", provider: "openai", weight: 40, apiModel: "gpt-image-1", displayName: "GPT Image" },
  ],
  cinema: [
    { id: "gpt-image", provider: "openai", weight: 70, apiModel: "gpt-image-1", displayName: "GPT Image" },
    { id: "nano-banana-pro", provider: "gemini", weight: 30, apiModel: "google/gemini-3-pro-image-preview", displayName: "Nano Banana Pro" },
  ],
  // Legacy mappings
  "smart-image": [
    { id: "nano-banana", provider: "gemini", weight: 100, apiModel: "google/gemini-2.5-flash-image", displayName: "Nano Banana" },
  ],
  "high-image": [
    { id: "nano-banana-pro", provider: "gemini", weight: 60, apiModel: "google/gemini-3-pro-image-preview", displayName: "Nano Banana Pro" },
    { id: "gpt-image", provider: "openai", weight: 40, apiModel: "gpt-image-1", displayName: "GPT Image" },
  ],
  "studio-image": [
    { id: "gpt-image", provider: "openai", weight: 70, apiModel: "gpt-image-1", displayName: "GPT Image" },
    { id: "nano-banana-pro", provider: "gemini", weight: 30, apiModel: "google/gemini-3-pro-image-preview", displayName: "Nano Banana Pro" },
  ],
};

const LEGACY_QUALITY_MAPPINGS: Record<string, string> = {
  "ai-image-smart": "standard",
  "ai-image-standard": "standard",
  "ai-image-pro": "pro",
  "ai-image-studio": "cinema",
  "flux-2-flex": "standard",
  "nano-banana": "standard",
  "nano-banana-pro": "pro",
  "gpt-image": "cinema",
  "smart-image": "standard",
  "high-image": "pro",
  "studio-image": "cinema",
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
// LOGO OVERLAY UTILITY
// ============================================================

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
    const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)));
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
// TEXT OVERLAY UTILITY
// ============================================================

interface TextOverlayOptions {
  brandName?: string;
  customText?: string;
  websiteUrl?: string;
  themeColor?: string;
}

async function overlayTextOnImage(
  baseImageData: string,
  options: TextOverlayOptions
): Promise<string> {
  const { brandName, customText, websiteUrl, themeColor } = options;
  
  // Build text elements to overlay
  const textElements: string[] = [];
  if (brandName) textElements.push(`Brand name: "${brandName}"`);
  if (customText) textElements.push(`Custom text/CTA: "${customText}"`);
  if (websiteUrl) textElements.push(`Website URL: "${websiteUrl}"`);
  
  if (textElements.length === 0) {
    console.log("[TextOverlay] No text elements to add");
    return baseImageData;
  }
  
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[TextOverlay] No LOVABLE_API_KEY");
      return baseImageData;
    }
    
    const colorInstruction = themeColor 
      ? `Use ${themeColor} as the accent color for text highlights or backgrounds.`
      : "Use a color that contrasts well with the image background.";
    
    const compositePrompt = `Add professional text overlay to this image for social media marketing.

TEXT TO ADD:
${textElements.join("\n")}

STYLING REQUIREMENTS:
- Position text in the bottom area (reserve bottom 15-20% for text)
- Use bold, modern sans-serif typography
- Text must be highly legible with drop shadow or semi-transparent background
- ${colorInstruction}
- Brand name should be larger and prominent
- Website URL should be smaller, positioned at the very bottom
- Custom text/CTA should be eye-catching and centered
- DO NOT alter the main image content, only add text overlay
- Ensure mobile-safe zones: avoid top 150px and keep text within safe margins

Keep the original image exactly as is, only add the text overlay elements.`;

    console.log("[TextOverlay] Adding text overlay:", textElements.join(", "));
    
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
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("[TextOverlay] AI composite failed:", response.status);
      return baseImageData;
    }

    const data = await response.json();
    const compositedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (compositedImage) {
      console.log("[TextOverlay] Text overlay successfully added!");
      return compositedImage;
    }
    
    console.log("[TextOverlay] No composited image returned, using original");
    return baseImageData;
  } catch (error) {
    console.error("[TextOverlay] Error:", error);
    return baseImageData;
  }
}

// Scenario context builders
const SECTOR_CONTEXT: Record<string, string> = {
  restaurant: "food photography style, appetizing, warm lighting, culinary",
  realestate: "architectural photography, interior design, spacious, luxurious",
  doctor: "medical, healthcare, clean, professional, trustworthy",
  coach: "motivational, personal development, inspiring, dynamic",
  ecommerce: "product photography, commercial, clean background, detailed",
  beauty: "beauty, cosmetics, elegant, soft lighting, luxurious",
  fitness: "athletic, energetic, dynamic, healthy lifestyle",
  tech: "technology, modern, sleek, innovative, futuristic",
};

const STYLE_CONTEXT: Record<string, string> = {
  testimonial: "portrait style, authentic, relatable, human connection",
  ugc: "user-generated content style, casual, authentic, lifestyle",
  demo: "demonstration style, clear, educational, step-by-step",
  storytelling: "narrative style, emotional, cinematic, storytelling",
  promo: "promotional, eye-catching, bold colors, marketing",
  tutorial: "instructional, clear, organized, educational",
};

const TONE_CONTEXT: Record<string, string> = {
  urgent: "high contrast, bold, attention-grabbing, dynamic",
  luxurious: "elegant, premium, sophisticated, rich colors",
  inspiring: "uplifting, bright, hopeful, motivational",
  playful: "fun, colorful, energetic, vibrant",
  professional: "corporate, clean, trustworthy, polished",
  authentic: "natural, genuine, relatable, unfiltered",
};

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
    // Map aspect ratio to OpenAI size
    const sizeMap: Record<string, string> = {
      "9:16": "1024x1792",
      "16:9": "1792x1024",
      "1:1": "1024x1024",
    };
    const size = sizeMap[aspectRatio] || "1024x1024";

    console.log(`[OpenAI] Generating image with GPT Image, size: ${size}`);

    // Note: gpt-image-1 does NOT support 'response_format' parameter
    // It returns URL by default, we need to fetch and convert to base64
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
        // Removed: response_format - not supported by gpt-image-1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenAI] Error ${response.status}:`, errorText.slice(0, 300));
      return { imageData: null, error: `OpenAI error: ${response.status}` };
    }

    const data = await response.json();
    
    // Handle both URL and base64 response formats
    const imageUrl = data.data?.[0]?.url;
    const base64Image = data.data?.[0]?.b64_json;

    if (base64Image) {
      // Direct base64 response
      const imageData = `data:image/png;base64,${base64Image}`;
      console.log("[OpenAI] ✓ Image generated successfully with GPT Image (b64)");
      return { imageData };
    }

    if (imageUrl) {
      // URL response - need to fetch and convert to base64
      console.log("[OpenAI] Fetching image from URL...");
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        console.error("[OpenAI] Failed to fetch generated image");
        return { imageData: null, error: "Failed to fetch generated image" };
      }
      
      const imgBlob = await imgResponse.blob();
      const imgArrayBuffer = await imgBlob.arrayBuffer();
      const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgArrayBuffer)));
      const imageData = `data:${imgBlob.type || "image/png"};base64,${imgBase64}`;
      
      console.log("[OpenAI] ✓ Image generated successfully with GPT Image (url)");
      return { imageData };
    }

    console.error("[OpenAI] No image in response");
    return { imageData: null, error: "No image generated" };
  } catch (error) {
    console.error("[OpenAI] Exception:", error);
    return { imageData: null, error: String(error) };
  }
}

// ============================================================
// GEMINI NANO BANANA IMAGE GENERATION (via Lovable AI Gateway)
// ============================================================

async function generateWithGemini(
  prompt: string,
  model: string
): Promise<{ imageData: string | null; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { imageData: null, error: "LOVABLE_API_KEY not configured" };
  }

  try {
    const displayName = model.includes("gemini-3") ? "Nano Banana Pro" : "Nano Banana";
    console.log(`[Gemini] Generating image with ${displayName} (${model})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`[Gemini] Error ${status}:`, errorText.slice(0, 200));
      
      if (status === 429) {
        return { imageData: null, error: "Rate limit exceeded. Please try again later." };
      }
      if (status === 402) {
        return { imageData: null, error: "Payment required. Please add credits." };
      }
      return { imageData: null, error: `Gemini error: ${status}` };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("[Gemini] No image in response");
      return { imageData: null, error: "No image generated" };
    }

    console.log(`[Gemini] ✓ Image generated successfully with ${displayName}`);
    return { imageData };
  } catch (error) {
    console.error("[Gemini] Exception:", error);
    return { imageData: null, error: String(error) };
  }
}

// ============================================================
// FALLBACK GENERATION - Try primary, then fallback
// ============================================================

async function generateWithFallback(
  prompt: string,
  selectedModel: ModelOption,
  qualityId: string,
  aspectRatio: string = "1:1"
): Promise<{ imageData: string | null; error?: string; usedModel: ModelOption }> {
  
  // Try primary model first
  let result: { imageData: string | null; error?: string };
  
  if (selectedModel.provider === "openai") {
    result = await generateWithOpenAI(prompt, aspectRatio);
  } else {
    result = await generateWithGemini(prompt, selectedModel.apiModel);
  }
  
  if (result.imageData) {
    return { ...result, usedModel: selectedModel };
  }
  
  console.log(`[Fallback] ${selectedModel.displayName} failed, trying fallback...`);
  
  // Fallback logic: if OpenAI fails, try Gemini and vice versa
  if (selectedModel.provider === "openai") {
    // Fallback to Nano Banana Pro
    const fallbackModel: ModelOption = {
      id: "nano-banana-pro",
      provider: "gemini",
      weight: 100,
      apiModel: "google/gemini-3-pro-image-preview",
      displayName: "Nano Banana Pro"
    };
    const fallbackResult = await generateWithGemini(prompt, fallbackModel.apiModel);
    if (fallbackResult.imageData) {
      console.log(`[Fallback] ✓ Success with ${fallbackModel.displayName}`);
      return { ...fallbackResult, usedModel: fallbackModel };
    }
  } else {
    // Fallback to GPT Image
    const fallbackModel: ModelOption = {
      id: "gpt-image",
      provider: "openai",
      weight: 100,
      apiModel: "gpt-image-1",
      displayName: "GPT Image"
    };
    const fallbackResult = await generateWithOpenAI(prompt, aspectRatio);
    if (fallbackResult.imageData) {
      console.log(`[Fallback] ✓ Success with ${fallbackModel.displayName}`);
      return { ...fallbackResult, usedModel: fallbackModel };
    }
  }
  
  return { imageData: null, error: result.error || "All models failed", usedModel: selectedModel };
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
      productId,
      qualityId,
      quality,
      format, 
      aspectRatio, 
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
      marketingContext, // NEW: Rich marketing context
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

    // Determine quality tier
    const effectiveQuality = quality || LEGACY_QUALITY_MAPPINGS[qualityId] || LEGACY_QUALITY_MAPPINGS[productId] || qualityId || "standard";
    const creditCost = getCreditCost(effectiveQuality);

    console.log(`=== Image Generation Request ===`);
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`Quality: ${effectiveQuality} | Credit Cost: ${creditCost}`);
    console.log(`Skip credit deduction: ${skipCreditDeduction ? "Yes" : "No"}`);

    // ============================================================
    // CREDIT VALIDATION & DEDUCTION (if user is authenticated)
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
        description: `Image generation (${effectiveQuality})`,
      });

      console.log(`✓ Deducted ${creditCost} credits for image generation`);
    }

    // Select model from pool
    const selectedModel = selectModelFromPool(effectiveQuality);
    console.log(`Selected Model: ${selectedModel.id} (${selectedModel.provider})`);

    // Determine output language
    const outputLanguage = detectedLanguage || "en";
    
    // ============================================================
    // GENERATION CONTEXT GUARD - Validate & Build Enhanced Prompt
    // ============================================================
    
    const guardInput: GenerationGuardInput = {
      projectName: brandName,
      projectUrl: projectUrl,
      logoUrl: logoUrl,
      themeColor: marketingContext?.visual_identity?.primary_color || undefined,
      detectedLanguage: outputLanguage,
      marketingContext: marketingContext as MarketingContext || null,
      aiContextSummary: aiContextSummary,
      scrapedMarkdown: marketingContext?.scraped_markdown, // Add scraped markdown
      projectDescription: marketingContext?.project_description, // Add project description
      generationPrompt: prompt,
      generationType: "image",
      // Brand overlay options for enhanced prompt building
      includeLogo: includeLogo,
      includeUrl: includeUrl,
      includeText: includeText,
      overlayText: overlayText,
    };
    
    const contextGuard = validateAndBuildContext(guardInput);
    logContextValidation(contextGuard, "ImageGeneration");
    
    // Log warnings but don't block generation
    if (contextGuard.warnings.length > 0) {
      console.warn("[ImageGen] Context warnings:", contextGuard.warnings.join("; "));
    }

    // Use the enhanced prompt from the guard if context score is good
    let finalPrompt: string;
    if (contextGuard.contextScore >= 40) {
      // Good context - use full enhanced prompt
      finalPrompt = contextGuard.enhancedPrompt;
      console.log(`[ImageGen] Using enhanced prompt (score: ${contextGuard.contextScore})`);
    } else {
      // Fallback to basic enhancement
      console.log(`[ImageGen] Low context score (${contextGuard.contextScore}), using basic prompt`);
      const enhancedParts: string[] = [];
      
      // Add language instruction
      const languageMap: Record<string, string> = {
        en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese",
      };
      const languageName = languageMap[outputLanguage] || "English";
      if (outputLanguage !== "en") {
        enhancedParts.push(`[LANGUAGE: All text in this image MUST be in ${languageName}. NO English text allowed.]`);
      }
      
      // Add scenario context
      if (sectorId && SECTOR_CONTEXT[sectorId]) {
        enhancedParts.push(`Sector style: ${SECTOR_CONTEXT[sectorId]}`);
      }
      if (styleId && STYLE_CONTEXT[styleId]) {
        enhancedParts.push(`Visual style: ${STYLE_CONTEXT[styleId]}`);
      }
      if (toneId && TONE_CONTEXT[toneId]) {
        enhancedParts.push(`Tone: ${TONE_CONTEXT[toneId]}`);
      }
      if (brandName) {
        enhancedParts.push(`Brand: ${brandName}`);
      }
      if (aiContextSummary) {
        enhancedParts.push(`Brand context: ${aiContextSummary.substring(0, 200)}`);
      }
      
      finalPrompt = enhancedParts.length > 0 
        ? `${enhancedParts.join(". ")}. ${prompt}`
        : prompt;
    }

    // Add format specifications
    if (format === "vertical" || aspectRatio === "9:16") {
      finalPrompt += " Vertical format (9:16), optimized for mobile, Instagram Reels, TikTok.";
    } else if (format === "square" || aspectRatio === "1:1") {
      finalPrompt += " Square format (1:1), perfect for Instagram feed.";
    } else if (format === "landscape" || aspectRatio === "16:9") {
      finalPrompt += " Landscape format (16:9), optimized for YouTube, presentations.";
    }

    // Add quality enhancements
    finalPrompt += " Ultra high resolution, professional advertising quality, stunning composition, perfect lighting.";

    // === MANDATORY TEXT OVERLAY REQUIREMENTS ===
    if (includeText && overlayText) {
      const themeColor = marketingContext?.visual_identity?.primary_color || guardInput.themeColor;
      finalPrompt += `

TEXT OVERLAY REQUIREMENTS (MANDATORY - CRITICAL):
- Display this EXACT text in the image: "${overlayText}"
- SIZE: LARGE, occupying at least 15-20% of image width
- FONT: Bold modern sans-serif (like Helvetica Bold, Montserrat Bold), highly readable
- COLOR: High contrast - white text with dark shadow/outline, or ${themeColor || 'brand color'} on light backgrounds
- POSITION: Center-bottom or lower-third of image (mobile-safe zone)
- STYLE: Clean, professional, eye-catching typography
- CRITICAL: The text must be the FIRST thing viewers notice - make it IMPOSSIBLE to miss
- Add subtle drop shadow or outline to ensure readability on any background`;
    }

    // === MANDATORY URL REQUIREMENTS ===
    if (includeUrl && projectUrl) {
      finalPrompt += `

WEBSITE URL REQUIREMENTS (MANDATORY):
- Display this URL clearly: "${projectUrl}"
- POSITION: Bottom of image, clearly visible
- SIZE: Readable but not dominant (5-8% of image height)
- COLOR: White text with subtle dark shadow for visibility on any background
- FONT: Clean, modern sans-serif font
- Must be LEGIBLE - do not let it blend into the background`;
    }

    // === MANDATORY BRAND COLOR REQUIREMENTS ===
    const primaryColor = marketingContext?.visual_identity?.primary_color || guardInput.themeColor;
    if (primaryColor) {
      finalPrompt += `

BRAND COLOR REQUIREMENTS (MANDATORY):
- Primary brand color: ${primaryColor}
- This color MUST appear PROMINENTLY in the image (backgrounds, key objects, accents, clothing, or UI elements)
- The overall image should "feel" on-brand with this color dominating the palette
- Do NOT use conflicting or clashing color schemes`;
    }

    // === LOGO SPACE RESERVATION ===
    if (includeLogo && logoUrl) {
      finalPrompt += `

LOGO SPACE REQUIREMENT (MANDATORY):
- Reserve a CLEAR, UNCLUTTERED area in the bottom-right corner (approximately 15% of image)
- This space will be used for brand logo overlay
- Ensure the background in that corner is SIMPLE (solid color or subtle gradient)
- Do NOT place important subjects, text, or busy patterns in the bottom-right corner`;
    }

    console.log("Final prompt length:", finalPrompt.length);

    // Determine aspect ratio for CometAPI
    const effectiveAspect = aspectRatio || (format === "vertical" ? "9:16" : format === "landscape" ? "16:9" : "1:1");

    // Generate image with CometAPI (Flux) primary, Lovable AI fallback
    const { imageData, error, usedModel } = await generateWithFallback(
      finalPrompt,
      selectedModel,
      effectiveQuality,
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
          description: `Refund: Image generation failed (${effectiveQuality})`,
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

    // Apply text overlay if any text options are enabled
    const hasTextOverlay = includeText || includeUrl || brandName;
    if (hasTextOverlay) {
      const textOptions: { brandName?: string; customText?: string; websiteUrl?: string; themeColor?: string } = {};
      
      // Add brand name if enabled
      if (brandName) {
        textOptions.brandName = brandName;
      }
      
      // Add custom overlay text if enabled
      if (includeText && overlayText) {
        textOptions.customText = overlayText;
      }
      
      // Add website URL if enabled
      if (includeUrl && projectUrl) {
        textOptions.websiteUrl = projectUrl;
      }
      
      // Add theme color for styling
      if (marketingContext?.visual_identity?.primary_color) {
        textOptions.themeColor = marketingContext.visual_identity.primary_color;
      }
      
      if (Object.keys(textOptions).length > 0) {
        console.log("[Main] Applying text overlay...", textOptions);
        finalImageData = await overlayTextOnImage(finalImageData, textOptions);
      }
    }

    console.log(`✓ Image generated successfully with ${usedModel.id}`);

    return new Response(
      JSON.stringify({
        imageUrl: finalImageData,
        model: usedModel.id,
        provider: usedModel.provider,
        quality: effectiveQuality,
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