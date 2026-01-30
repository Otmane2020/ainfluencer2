import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// MODEL POOL CONFIGURATION - Weighted Random Selection
// ============================================================

interface ModelOption {
  id: string;
  provider: "lovable" | "replicate";
  weight: number;
  apiModel: string;
}

const IMAGE_MODEL_POOLS: Record<string, ModelOption[]> = {
  standard: [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image" },
  ],
  pro: [
    { id: "flux-2-pro", provider: "replicate", weight: 60, apiModel: "flux-2-pro" },
    { id: "nano-banana-pro", provider: "replicate", weight: 40, apiModel: "nano-banana-pro" },
  ],
  cinema: [
    { id: "gemini-pro-image", provider: "lovable", weight: 50, apiModel: "google/gemini-3-pro-image-preview" },
    { id: "flux-2-pro", provider: "replicate", weight: 50, apiModel: "flux-2-pro" },
  ],
  // Legacy mappings
  "smart-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image" },
  ],
  "high-image": [
    { id: "flux-2-pro", provider: "replicate", weight: 100, apiModel: "flux-2-pro" },
  ],
  "studio-image": [
    { id: "gemini-pro-image", provider: "lovable", weight: 100, apiModel: "google/gemini-3-pro-image-preview" },
  ],
};

const LEGACY_QUALITY_MAPPINGS: Record<string, string> = {
  "ai-image-smart": "standard",
  "ai-image-standard": "standard",
  "ai-image-pro": "pro",
  "ai-image-studio": "cinema",
  "flux-2-flex": "standard",
  "nano-banana-pro": "pro",
  "flux-2-pro": "cinema",
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
// REPLICATE IMAGE GENERATION
// ============================================================

async function generateWithReplicate(
  prompt: string,
  model: string,
  aspectRatio?: string
): Promise<{ imageData: string | null; error?: string }> {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) {
    return { imageData: null, error: "REPLICATE_API_KEY not configured" };
  }

  try {
    console.log(`[Replicate] Generating image with model: ${model}`);

    const response = await fetch("https://api.cometapi.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: aspectRatio === "16:9" ? "1792x1024" : aspectRatio === "9:16" ? "1024x1792" : "1024x1024",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Replicate] Error ${response.status}:`, errorText.slice(0, 200));
      return { imageData: null, error: `Replicate error: ${response.status}` };
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;

    if (!imageUrl) {
      console.error("[Replicate] No image in response");
      return { imageData: null, error: "No image generated" };
    }

    if (imageUrl.startsWith("http")) {
      const imgResponse = await fetch(imageUrl);
      const imgBlob = await imgResponse.blob();
      const arrayBuffer = await imgBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return { imageData: `data:image/png;base64,${base64}` };
    }

    return { imageData: `data:image/png;base64,${imageUrl}` };
  } catch (error) {
    console.error("[Replicate] Exception:", error);
    return { imageData: null, error: String(error) };
  }
}

// ============================================================
// LOVABLE AI IMAGE GENERATION
// ============================================================

async function generateWithLovableAI(
  prompt: string,
  model: string
): Promise<{ imageData: string | null; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { imageData: null, error: "LOVABLE_API_KEY not configured" };
  }

  try {
    console.log(`[LovableAI] Generating image with model: ${model}`);

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
      console.error(`[LovableAI] Error ${status}:`, errorText.slice(0, 200));

      if (status === 429) {
        return { imageData: null, error: "Rate limit exceeded. Please try again later." };
      }
      if (status === 402) {
        return { imageData: null, error: "Credits required. Please add credits to continue." };
      }
      return { imageData: null, error: "Image generation failed" };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("[LovableAI] No image in response");
      return { imageData: null, error: "No image generated" };
    }

    return { imageData };
  } catch (error) {
    console.error("[LovableAI] Exception:", error);
    return { imageData: null, error: String(error) };
  }
}

// ============================================================
// FALLBACK GENERATION
// ============================================================

async function generateWithFallback(
  prompt: string,
  selectedModel: ModelOption,
  qualityId: string,
  aspectRatio?: string
): Promise<{ imageData: string | null; error?: string; usedModel: ModelOption }> {
  let result: { imageData: string | null; error?: string };
  
  if (selectedModel.provider === "replicate") {
    result = await generateWithReplicate(prompt, selectedModel.apiModel, aspectRatio);
  } else {
    result = await generateWithLovableAI(prompt, selectedModel.apiModel);
  }
  
  if (result.imageData) {
    return { ...result, usedModel: selectedModel };
  }
  
  console.log(`[Fallback] Primary model ${selectedModel.id} failed, trying fallback...`);
  const pool = IMAGE_MODEL_POOLS[qualityId] || IMAGE_MODEL_POOLS["standard"];
  const fallbackModels = pool.filter(m => m.id !== selectedModel.id);
  
  for (const fallbackModel of fallbackModels) {
    console.log(`[Fallback] Trying ${fallbackModel.id}...`);
    
    if (fallbackModel.provider === "replicate") {
      result = await generateWithReplicate(prompt, fallbackModel.apiModel, aspectRatio);
    } else {
      result = await generateWithLovableAI(prompt, fallbackModel.apiModel);
    }
    
    if (result.imageData) {
      console.log(`[Fallback] Success with ${fallbackModel.id}`);
      return { ...result, usedModel: fallbackModel };
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
      quality, // NEW: Direct quality tier (standard/pro/cinema)
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
      skipCreditDeduction, // For campaign-based generation (credits deducted at campaign level)
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
        description: `Image generation (${effectiveQuality})`,
      });

      console.log(`✓ Deducted ${creditCost} credits for image generation`);
    }

    // Select model from pool
    const selectedModel = selectModelFromPool(effectiveQuality);
    console.log(`Selected Model: ${selectedModel.id} (${selectedModel.provider})`);

    // Determine output language
    const outputLanguage = detectedLanguage || "en";
    const languageMap: Record<string, string> = {
      en: "English",
      fr: "French",
      es: "Spanish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
    };
    const languageName = languageMap[outputLanguage] || "English";

    // Build enhanced prompt
    let enhancedPrompt = prompt;
    const contextParts: string[] = [];

    if (outputLanguage !== "en") {
      enhancedPrompt = `[LANGUAGE: All text in this image MUST be in ${languageName}. NO English text allowed.] ${prompt}`;
    }

    if (brandName) {
      contextParts.push(`for ${brandName} brand`);
    }

    if (format === "reel" || format === "story") {
      contextParts.push("vertical portrait format 9:16 aspect ratio");
    } else if (format === "landscape") {
      contextParts.push("horizontal landscape format 16:9 aspect ratio");
    }

    if (sectorId && SECTOR_CONTEXT[sectorId]) {
      contextParts.push(SECTOR_CONTEXT[sectorId]);
    }
    if (styleId && STYLE_CONTEXT[styleId]) {
      contextParts.push(STYLE_CONTEXT[styleId]);
    }
    if (toneId && TONE_CONTEXT[toneId]) {
      contextParts.push(TONE_CONTEXT[toneId]);
    }

    if (contextParts.length > 0) {
      enhancedPrompt = `${enhancedPrompt}. Style: ${contextParts.join(", ")}. Ultra high resolution, professional quality.`;
    } else {
      enhancedPrompt = `${enhancedPrompt}. Ultra high resolution, professional quality.`;
    }

    if (aiContextSummary) {
      enhancedPrompt += ` Brand context: ${aiContextSummary.slice(0, 500)}.`;
    }

    // Brand elements
    if (includeLogo && brandName && !logoUrl) {
      enhancedPrompt += ` IMPORTANT: Include a stylized brand logo area or badge in the bottom-right or top-left corner with the text "${brandName}" in elegant, professional typography that matches the image style.`;
    }
    
    if (includeUrl && projectUrl) {
      const cleanUrl = projectUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
      enhancedPrompt += ` Include a subtle website URL watermark "${cleanUrl}" at the bottom of the image in small, readable text.`;
    }
    
    if (includeAvatar && avatarUrl) {
      enhancedPrompt += ` Feature a professional-looking spokesperson or presenter figure prominently in the image - a confident, friendly person representing the brand, positioned as if speaking directly to the viewer.`;
    }

    if (includeText) {
      const textToOverlay = overlayText || brandName || "";
      if (textToOverlay) {
        enhancedPrompt += ` CRITICAL: Include bold, eye-catching text overlay. The text MUST be in ${languageName}: "${textToOverlay}". NO English text. The text should be large, readable, placed prominently (top or center), with high contrast against the background. Use modern social media typography style.`;
      } else {
        enhancedPrompt += ` CRITICAL: This is a social media image. Include a short, punchy headline or call-to-action text overlay. ALL TEXT MUST BE IN ${languageName.toUpperCase()} ONLY. NO English. Use bold, modern typography that pops against the image.`;
      }
    }

    if (outputLanguage !== "en") {
      enhancedPrompt += ` REMINDER: Any and all text visible in this image must be in ${languageName}, not English.`;
    }
    
    console.log("Enhanced prompt:", enhancedPrompt.slice(0, 200) + "...");

    // Generate image with fallback system
    const result = await generateWithFallback(enhancedPrompt, selectedModel, effectiveQuality, aspectRatio);

    if (!result.imageData) {
      console.error("Image generation failed:", result.error);
      
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
        JSON.stringify({ error: result.error || "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SUCCESS] Generated with model: ${result.usedModel.id}`);

    // Post-processing: Overlay real logo if provided
    let finalImageData = result.imageData;
    
    if (includeLogo && logoUrl) {
      console.log("[PostProcess] Overlaying real logo onto generated image...");
      finalImageData = await overlayLogoOnImage(result.imageData, logoUrl, "bottom-right");
    }

    // Upload to Supabase storage
    const base64Data = finalImageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ imageUrl: finalImageData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    console.log("Image uploaded:", publicUrlData.publicUrl);

    return new Response(
      JSON.stringify({
        imageUrl: publicUrlData.publicUrl,
        storagePath: fileName,
        model: result.usedModel.id,
        provider: result.usedModel.provider,
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
