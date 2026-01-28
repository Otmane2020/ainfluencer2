import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shot types with prompts for generating different angles
const SHOT_TYPES = {
  front: {
    label: "Front View",
    prompt: "Generate a perfect front-facing product photo. The product should be centered, facing directly toward the camera. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  angle45: {
    label: "45° Angle",
    prompt: "Generate a 3/4 angle (45 degrees) product photo showing depth and dimension. Professional studio lighting highlighting contours and shape, pure white background, high resolution 2048x2048px.",
  },
  profile: {
    label: "Side Profile",
    prompt: "Generate a side profile product photo. The product viewed from the side (90 degrees), showing its profile silhouette. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  back: {
    label: "Back View",
    prompt: "Generate a back view product photo. The product shown from behind, revealing any back details or features. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  top: {
    label: "Top View",
    prompt: "Generate a top-down product photo. Bird's eye view looking directly down at the product. Professional studio lighting showing surface details, pure white background, high resolution 2048x2048px.",
  },
  low_angle: {
    label: "Low Angle",
    prompt: "Generate a low angle (contre-plongée) product photo. Camera positioned below looking up at the product, creating a dramatic and imposing view. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  zoom_detail: {
    label: "Detail Close-up",
    prompt: "Generate an extreme close-up detail shot focusing on the most interesting feature or texture of the product. Macro-style photography revealing fine details, patterns, or craftsmanship. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  lifestyle: {
    label: "Lifestyle Scene",
    prompt: "Generate a lifestyle product photo showing the product in a realistic, appealing environment that matches its use case. Natural lighting, cozy interior setting, the product should be the clear focal point. High resolution 2048x2048px.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sourceImageUrl, 
      shotTypes = ["front", "angle45", "profile", "zoom_detail"],
      productTitle = "Product",
      includeLifestyle = false,
    } = await req.json();

    if (!sourceImageUrl) {
      return new Response(
        JSON.stringify({ error: "Source image URL is required" }),
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

    // Initialize Supabase client for storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[generate-product-shots] Starting generation for: ${productTitle}`);
    console.log(`[generate-product-shots] Shot types requested: ${shotTypes.join(", ")}`);

    const generatedImages: Array<{
      type: string;
      label: string;
      url: string;
    }> = [];

    // Add lifestyle if requested
    const allShotTypes = includeLifestyle ? [...shotTypes, "lifestyle"] : shotTypes;

    for (const shotType of allShotTypes) {
      const shotConfig = SHOT_TYPES[shotType as keyof typeof SHOT_TYPES];
      if (!shotConfig) {
        console.log(`[generate-product-shots] Unknown shot type: ${shotType}, skipping`);
        continue;
      }

      console.log(`[generate-product-shots] Generating ${shotType} for ${productTitle}...`);

      const imagePrompt = `Based on this product image, ${shotConfig.prompt}

Product: ${productTitle}

CRITICAL REQUIREMENTS:
- Maintain EXACT product identity, colors, materials, and proportions from the source image
- Only change the viewing angle as specified
- Keep the product instantly recognizable as the same item
- Professional e-commerce quality photography
- No text, watermarks, or borders
- Ultra high resolution, sharp focus on the product`;

      try {
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
                  { type: "text", text: imagePrompt },
                  { type: "image_url", image_url: { url: sourceImageUrl } }
                ]
              }
            ],
            modalities: ["image", "text"]
          }),
        });

        if (!response.ok) {
          const status = response.status;
          const errorText = await response.text();
          console.error(`[generate-product-shots] AI error for ${shotType}:`, status, errorText.slice(0, 200));

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

          // Continue with other shots even if one fails
          continue;
        }

        const data = await response.json();
        const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData) {
          console.error(`[generate-product-shots] No image in response for ${shotType}`);
          continue;
        }

        // Upload to Supabase storage
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const fileName = `product-shots/${Date.now()}-${shotType}-${Math.random().toString(36).slice(2)}.png`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, imageBytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(`[generate-product-shots] Upload error for ${shotType}:`, uploadError);
          // Still include the base64 as fallback
          generatedImages.push({
            type: shotType,
            label: shotConfig.label,
            url: imageData,
          });
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);

        console.log(`[generate-product-shots] ${shotType} uploaded:`, publicUrlData.publicUrl);

        generatedImages.push({
          type: shotType,
          label: shotConfig.label,
          url: publicUrlData.publicUrl,
        });

      } catch (shotError) {
        console.error(`[generate-product-shots] Error generating ${shotType}:`, shotError);
        // Continue with other shots
      }
    }

    if (generatedImages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to generate any images. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-product-shots] Successfully generated ${generatedImages.length} images`);

    return new Response(
      JSON.stringify({
        success: true,
        images: generatedImages,
        productTitle,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-product-shots] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
