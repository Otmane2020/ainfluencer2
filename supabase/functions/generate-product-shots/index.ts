import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOT_TYPES = {
  front: {
    label: "Front View",
    prompt:
      "Generate a perfect front-facing product photo. The product should be centered, facing directly toward the camera. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  angle45: {
    label: "45° Angle",
    prompt:
      "Generate a 3/4 angle (45 degrees) product photo showing depth and dimension. Professional studio lighting highlighting contours and shape, pure white background, high resolution 2048x2048px.",
  },
  profile: {
    label: "Side Profile",
    prompt:
      "Generate a side profile product photo. The product viewed from the side (90 degrees), showing its profile silhouette. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  back: {
    label: "Back View",
    prompt:
      "Generate a back view product photo. The product shown from behind, revealing any back details or features. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  top: {
    label: "Top View",
    prompt:
      "Generate a top-down product photo. Bird's eye view looking directly down at the product. Professional studio lighting showing surface details, pure white background, high resolution 2048x2048px.",
  },
  low_angle: {
    label: "Low Angle",
    prompt:
      "Generate a low angle (contre-plongée) product photo. Camera positioned below looking up at the product, creating a dramatic and imposing view. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  zoom_detail: {
    label: "Detail Close-up",
    prompt:
      "Generate an extreme close-up detail shot focusing on the most interesting feature or texture of the product. Macro-style photography revealing fine details, patterns, or craftsmanship. Professional studio lighting, pure white background, high resolution 2048x2048px.",
  },
  lifestyle: {
    label: "Lifestyle Scene",
    prompt:
      "Generate a lifestyle product photo showing the product in a realistic, appealing environment that matches its use case. Natural lighting, cozy interior setting, the product should be the clear focal point. High resolution 2048x2048px.",
  },
} as const;

type ShotType = keyof typeof SHOT_TYPES;

function normalizeShotTypes(shotTypes: unknown, includeLifestyle: boolean): ShotType[] {
  const allowed = new Set(Object.keys(SHOT_TYPES) as ShotType[]);
  const requested = Array.isArray(shotTypes) ? shotTypes : [];
  const safe = requested.filter((x): x is ShotType => typeof x === "string" && allowed.has(x as ShotType));

  const base = safe.length > 0 ? safe : (["front", "angle45", "profile", "zoom_detail"] as ShotType[]);
  if (includeLifestyle && !base.includes("lifestyle")) base.push("lifestyle");
  return base;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 60_000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  if (!base64 || base64.length < 100) throw new Error("Invalid image data");
  // Guard: avoid huge allocations
  if (base64.length > 15_000_000) throw new Error("Image too large");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const sourceImageUrl = body?.sourceImageUrl as string | undefined;
    const productTitle = (body?.productTitle as string | undefined) || "Product";
    const includeLifestyle = Boolean(body?.includeLifestyle);

    if (!sourceImageUrl || typeof sourceImageUrl !== "string") {
      return new Response(JSON.stringify({ error: "Source image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^https?:\/\//i.test(sourceImageUrl)) {
      return new Response(JSON.stringify({ error: "sourceImageUrl must be a public http(s) URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shotTypes = normalizeShotTypes(body?.shotTypes, includeLifestyle);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Storage not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[generate-product-shots] Starting generation for: ${productTitle}`);
    console.log(`[generate-product-shots] Shot types: ${shotTypes.join(", ")}`);

    const generatedImages: Array<{ type: ShotType; label: string; url: string }> = [];

    for (const shotType of shotTypes) {
      const shotConfig = SHOT_TYPES[shotType];

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
        const response = await fetchWithTimeout(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: imagePrompt },
                    { type: "image_url", image_url: { url: sourceImageUrl } },
                  ],
                },
              ],
              modalities: ["image", "text"],
            }),
          },
          90_000
        );

        if (!response.ok) {
          const status = response.status;
          const errorText = await response.text();
          console.error(`[generate-product-shots] AI error for ${shotType}:`, status, errorText.slice(0, 200));

          if (status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (status === 402) {
            return new Response(JSON.stringify({ error: "Credits required. Please add credits to continue." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // continue other shots
          continue;
        }

        const data = await response.json();
        const imageData: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData || typeof imageData !== "string") {
          console.error(`[generate-product-shots] No image in response for ${shotType}`);
          continue;
        }

        // If API returns http(s) URL instead of base64 data URL, fetch it and convert to data URL
        let dataUrl = imageData;
        if (/^https?:\/\//i.test(imageData)) {
          const imgResp = await fetchWithTimeout(imageData, { method: "GET" }, 60_000);
          if (!imgResp.ok) {
            console.error(`[generate-product-shots] Failed to fetch returned image URL for ${shotType}:`, imgResp.status);
            continue;
          }
          const buf = new Uint8Array(await imgResp.arrayBuffer());
          const b64 = btoa(String.fromCharCode(...buf));
          dataUrl = `data:image/png;base64,${b64}`;
        }

        const imageBytes = dataUrlToBytes(dataUrl);

        const fileName = `product-shots/${Date.now()}-${shotType}-${crypto.randomUUID()}.png`;

        const { error: uploadError } = await supabase.storage.from("media").upload(fileName, imageBytes, {
          contentType: "image/png",
          upsert: true,
        });

        if (uploadError) {
          console.error(`[generate-product-shots] Upload error for ${shotType}:`, uploadError);
          generatedImages.push({ type: shotType, label: shotConfig.label, url: dataUrl });
          continue;
        }

        const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);

        generatedImages.push({
          type: shotType,
          label: shotConfig.label,
          url: publicUrlData.publicUrl,
        });

        console.log(`[generate-product-shots] ${shotType} uploaded: ${publicUrlData.publicUrl}`);
      } catch (shotError) {
        const msg = shotError instanceof Error ? shotError.message : String(shotError);
        console.error(`[generate-product-shots] Error generating ${shotType}:`, msg);
        // continue other shots
      }
    }

    if (generatedImages.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate any images. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, images: generatedImages, productTitle }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate-product-shots] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
