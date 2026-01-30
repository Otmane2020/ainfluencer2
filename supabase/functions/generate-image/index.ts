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
// MODEL POOL CONFIGURATION - All via Lovable AI
// ============================================================

interface ModelOption {
  id: string;
  provider: "lovable";
  weight: number;
  apiModel: string;
}

const IMAGE_MODEL_POOLS: Record<string, ModelOption[]> = {
  standard: [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image" },
  ],
  pro: [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image" },
  ],
  cinema: [
    { id: "gemini-pro-image", provider: "lovable", weight: 100, apiModel: "google/gemini-3-pro-image-preview" },
  ],
  // Legacy mappings
  "smart-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image" },
  ],
  "high-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image" },
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
// LOVABLE AI IMAGE GENERATION (Nano Banana)
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
  qualityId: string
): Promise<{ imageData: string | null; error?: string; usedModel: ModelOption }> {
  const result = await generateWithLovableAI(prompt, selectedModel.apiModel);
  
  if (result.imageData) {
    return { ...result, usedModel: selectedModel };
  }
  
  console.log(`[Fallback] Primary model ${selectedModel.id} failed, trying fallback...`);
  const pool = IMAGE_MODEL_POOLS[qualityId] || IMAGE_MODEL_POOLS["standard"];
  const fallbackModels = pool.filter(m => m.id !== selectedModel.id);
  
  for (const fallbackModel of fallbackModels) {
    console.log(`[Fallback] Trying ${fallbackModel.id}...`);
    const fallbackResult = await generateWithLovableAI(prompt, fallbackModel.apiModel);
    
    if (fallbackResult.imageData) {
      console.log(`[Fallback] Success with ${fallbackModel.id}`);
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
    const enhancedParts: string[] = [];
    
    // Add language instruction if not English
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

    // Add brand context
    if (brandName) {
      enhancedParts.push(`Brand: ${brandName}`);
    }

    // Add rich marketing context if available
    if (marketingContext && typeof marketingContext === "object") {
      const mc = marketingContext as any;
      const marketingParts: string[] = [];
      
      // Target audience context
      if (mc.target_audience?.primary) {
        marketingParts.push(`TARGET AUDIENCE: ${mc.target_audience.primary}`);
      }
      if (mc.target_audience?.pain_points?.length > 0) {
        marketingParts.push(`Their pain points: ${mc.target_audience.pain_points.join(", ")}`);
      }
      if (mc.target_audience?.desires?.length > 0) {
        marketingParts.push(`Their desires: ${mc.target_audience.desires.join(", ")}`);
      }
      
      // Brand personality
      if (mc.brand_personality?.tone) {
        marketingParts.push(`BRAND TONE: ${mc.brand_personality.tone}`);
      }
      if (mc.brand_personality?.values?.length > 0) {
        marketingParts.push(`Brand values: ${mc.brand_personality.values.join(", ")}`);
      }
      
      // Products to showcase
      if (mc.products_services?.length > 0) {
        const productsList = mc.products_services
          .slice(0, 3)
          .map((p: any) => `${p.name}: ${p.key_benefit}`)
          .join("; ");
        marketingParts.push(`PRODUCTS TO SHOWCASE: ${productsList}`);
      }
      
      // Visual style
      if (mc.visual_identity?.aesthetic_style) {
        marketingParts.push(`VISUAL STYLE: ${mc.visual_identity.aesthetic_style}`);
      }
      if (mc.visual_identity?.mood) {
        marketingParts.push(`Mood: ${mc.visual_identity.mood}`);
      }
      if (mc.visual_identity?.logo_description) {
        marketingParts.push(`Logo description: ${mc.visual_identity.logo_description}`);
      }
      
      // Content guidelines
      if (mc.content_guidelines?.visual_banned?.length > 0) {
        marketingParts.push(`AVOID visually: ${mc.content_guidelines.visual_banned.join(", ")}`);
      }
      if (mc.content_guidelines?.visual_preferred?.length > 0) {
        marketingParts.push(`PREFER visually: ${mc.content_guidelines.visual_preferred.join(", ")}`);
      }
      
      if (marketingParts.length > 0) {
        enhancedParts.push(`MARKETING CONTEXT:\n${marketingParts.join("\n")}`);
      }
    } else if (aiContextSummary) {
      // Fallback to old context summary
      enhancedParts.push(`Brand context: ${aiContextSummary.substring(0, 200)}`);
    }

    // Build final prompt
    let finalPrompt = prompt;
    if (enhancedParts.length > 0) {
      finalPrompt = `${enhancedParts.join(". ")}. ${prompt}`;
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
    finalPrompt += " Ultra high resolution, professional quality, stunning composition, perfect lighting.";

    // Add text overlay instructions if needed
    if (includeText && overlayText) {
      finalPrompt += ` Include this text prominently in the image: "${overlayText}". Make the text bold, readable, and well-integrated into the design.`;
    }

    // Add URL if requested
    if (includeUrl && projectUrl) {
      finalPrompt += ` Subtly include the website URL "${projectUrl}" in the composition.`;
    }

    console.log("Final prompt length:", finalPrompt.length);

    // Generate image
    const { imageData, error, usedModel } = await generateWithFallback(
      finalPrompt,
      selectedModel,
      effectiveQuality
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
      finalImageData = await overlayLogoOnImage(imageData, logoUrl, "bottom-right");
    }

    console.log(`✓ Image generated successfully with ${usedModel.id}`);

    return new Response(
      JSON.stringify({
        imageData: finalImageData,
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