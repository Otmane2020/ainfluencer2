import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map commercial product IDs to internal AI models
const PRODUCT_MODEL_MAP: Record<string, string> = {
  "ai-image-smart": "google/gemini-2.5-flash-image", // Lovable AI - Smart Images
  "ai-image-standard": "google/gemini-2.5-flash-image",
  "ai-image-pro": "google/gemini-3-pro-image-preview",
  "ai-image-studio": "google/gemini-3-pro-image-preview",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      productId, 
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
      detectedLanguage,
      includeText,
      overlayText,
      includeAvatar,
      avatarUrl,
      aiContextSummary, // Pre-built context from project
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine output language for any text in the image
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

    // Select model based on product tier
    const model = PRODUCT_MODEL_MAP[productId] || "google/gemini-2.5-flash-image";
    console.log(`Using model: ${model} for product: ${productId}, format: ${format || "default"}, language: ${outputLanguage}`);

    // Build enhanced prompt with scenario context and format
    let enhancedPrompt = prompt;
    const contextParts: string[] = [];

    // Add brand context if provided
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
      enhancedPrompt = `${prompt}. Style: ${contextParts.join(", ")}. Ultra high resolution, professional quality.`;
    } else {
      enhancedPrompt = `${prompt}. Ultra high resolution, professional quality.`;
    }

    // Add brand elements based on options
    if (includeLogo && brandName) {
      enhancedPrompt += ` Include a subtle, elegant brand logo for "${brandName}" in a corner of the image.`;
    }
    if (includeUrl && projectUrl) {
      enhancedPrompt += ` Include the website URL "${projectUrl}" as a subtle watermark or call-to-action element.`;
    }
    if (includeAvatar && avatarUrl) {
      enhancedPrompt += ` Feature a professional spokesperson or avatar prominently in the image, representing the brand.`;
    }
    
    // Add AI context summary if available for richer brand-aware generation
    if (aiContextSummary) {
      enhancedPrompt += ` Brand context: ${aiContextSummary.slice(0, 500)}.`;
    }

    // SOCIAL MEDIA TEXT OVERLAY - Key for engagement
    if (includeText) {
      const textToOverlay = overlayText || brandName || "";
      if (textToOverlay) {
        enhancedPrompt += ` IMPORTANT: Include bold, eye-catching text overlay in ${languageName}: "${textToOverlay}". The text should be large, readable, placed prominently (top or center), with high contrast against the background. Use modern social media typography style - bold sans-serif font, possibly with subtle shadow or outline for readability. This is a social media post image that needs text to grab attention.`;
      } else {
        enhancedPrompt += ` IMPORTANT: This is a social media image. Include a short, punchy headline or call-to-action text overlay in ${languageName}. Use bold, modern typography that pops against the image. Text should be large, centered or at top, highly readable.`;
      }
    }

    console.log("Enhanced prompt:", enhancedPrompt);
    console.log("Brand options - Logo:", includeLogo, "URL:", includeUrl, "Text:", includeText);

    // Call Lovable AI Gateway for image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`AI gateway error: ${status}`, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
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
        JSON.stringify({ imageUrl: imageData }),
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
