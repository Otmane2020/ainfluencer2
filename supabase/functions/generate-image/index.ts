import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// QUALITY-BASED MODEL ROUTING
// ============================================================

interface ModelRouting {
  provider: "lovable" | "cometapi";
  model: string;
}

const QUALITY_MODEL_MAP: Record<string, ModelRouting> = {
  // Quality Levels - Use Lovable AI (Gemini) as primary for reliability
  "smart-image": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
  "high-image": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
  "studio-image": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
  
  // Legacy product IDs (backwards compatibility)
  "ai-image-smart": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
  "ai-image-standard": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
  "ai-image-pro": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
  "ai-image-studio": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
};

// Default to Lovable AI for stability
const DEFAULT_MODEL_ROUTING: ModelRouting = { provider: "lovable", model: "google/gemini-2.5-flash-image" };

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
// COMETAPI IMAGE GENERATION
// ============================================================

async function generateWithCometAPI(
  prompt: string,
  model: string,
  aspectRatio?: string
): Promise<{ imageData: string | null; error?: string }> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) {
    return { imageData: null, error: "COMETAPI_API_KEY not configured" };
  }

  try {
    console.log(`[CometAPI] Generating image with model: ${model}`);

    const response = await fetch("https://api.cometapi.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
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
      console.error(`[CometAPI] Error ${response.status}:`, errorText.slice(0, 200));
      return { imageData: null, error: `CometAPI error: ${response.status}` };
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;

    if (!imageUrl) {
      console.error("[CometAPI] No image in response");
      return { imageData: null, error: "No image generated" };
    }

    // If it's a URL, fetch and convert to base64
    if (imageUrl.startsWith("http")) {
      const imgResponse = await fetch(imageUrl);
      const imgBlob = await imgResponse.blob();
      const arrayBuffer = await imgBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return { imageData: `data:image/png;base64,${base64}` };
    }

    return { imageData: `data:image/png;base64,${imageUrl}` };
  } catch (error) {
    console.error("[CometAPI] Exception:", error);
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
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt,
      productId, // Legacy: "ai-image-smart", etc.
      qualityId, // New: "smart-image", "high-image", "studio-image"
      format, 
      aspectRatio, 
      width, 
      height, 
      sectorId, 
      styleId, 
      toneId, 
      logoUrl, 
      brandName, 
      includeLogo, 
      includeUrl, 
      projectUrl,
      themeColor,
      detectedLanguage,
      includeText,
      overlayText,
      includeAvatar,
      avatarUrl,
      aiContextSummary,
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine model routing - prefer qualityId, fallback to productId
    const modelKey = qualityId || productId || "smart-image";
    const routing = QUALITY_MODEL_MAP[modelKey] || DEFAULT_MODEL_ROUTING;

    console.log(`=== Image Generation Request ===`);
    console.log(`Quality/Product ID: ${modelKey}`);
    console.log(`Provider: ${routing.provider}, Model: ${routing.model}`);

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

    // Build enhanced prompt with scenario context
    let enhancedPrompt = prompt;
    const contextParts: string[] = [];

    // CRITICAL: Add explicit language instruction at the start
    if (outputLanguage !== "en") {
      enhancedPrompt = `[LANGUAGE: All text in this image MUST be in ${languageName}. NO English text allowed.] ${prompt}`;
    }

    if (brandName) {
      contextParts.push(`for ${brandName} brand`);
    }

    // Add format context
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

    // Add AI context for brand personality and products
    if (aiContextSummary) {
      enhancedPrompt += ` Brand context: ${aiContextSummary.slice(0, 500)}.`;
    }

    // BRAND ELEMENTS: Describe what the AI should generate (not actual files)
    if (includeLogo && brandName) {
      enhancedPrompt += ` IMPORTANT: Include a stylized brand logo area or badge in the bottom-right or top-left corner with the text "${brandName}" in elegant, professional typography that matches the image style.`;
    }
    
    if (includeUrl && projectUrl) {
      // Extract clean domain for display
      const cleanUrl = projectUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
      enhancedPrompt += ` Include a subtle website URL watermark "${cleanUrl}" at the bottom of the image in small, readable text.`;
    }
    
    if (includeAvatar && avatarUrl) {
      // Describe the avatar style for AI to generate a similar spokesperson
      enhancedPrompt += ` Feature a professional-looking spokesperson or presenter figure prominently in the image - a confident, friendly person representing the brand, positioned as if speaking directly to the viewer.`;
    }

    // Social media text overlay - ALWAYS specify language
    if (includeText) {
      const textToOverlay = overlayText || brandName || "";
      if (textToOverlay) {
        enhancedPrompt += ` CRITICAL: Include bold, eye-catching text overlay. The text MUST be in ${languageName}: "${textToOverlay}". NO English text. The text should be large, readable, placed prominently (top or center), with high contrast against the background. Use modern social media typography style.`;
      } else {
        enhancedPrompt += ` CRITICAL: This is a social media image. Include a short, punchy headline or call-to-action text overlay. ALL TEXT MUST BE IN ${languageName.toUpperCase()} ONLY. NO English. Use bold, modern typography that pops against the image.`;
      }
    }

    // Final language reminder
    if (outputLanguage !== "en") {
      enhancedPrompt += ` REMINDER: Any and all text visible in this image must be in ${languageName}, not English.`;
    }
    
    // Log what brand options are being applied
    console.log("Brand options applied:", { 
      includeLogo, includeUrl, includeAvatar, includeText,
      brandName, 
      hasLogoUrl: !!logoUrl, 
      hasAvatarUrl: !!avatarUrl, 
      hasProjectUrl: !!projectUrl,
      themeColor 
    });

    console.log("Enhanced prompt:", enhancedPrompt.slice(0, 200) + "...");

    // Generate image based on provider
    let result: { imageData: string | null; error?: string };

    if (routing.provider === "cometapi") {
      result = await generateWithCometAPI(enhancedPrompt, routing.model, aspectRatio);
    } else {
      result = await generateWithLovableAI(enhancedPrompt, routing.model);
    }

    if (!result.imageData) {
      console.error("Image generation failed:", result.error);
      return new Response(
        JSON.stringify({ error: result.error || "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = result.imageData.replace(/^data:image\/\w+;base64,/, "");
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
      // Return base64 URL as fallback
      return new Response(
        JSON.stringify({ imageUrl: result.imageData }),
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
        prompt: enhancedPrompt,
        qualityId: modelKey,
        provider: routing.provider,
        model: routing.model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
