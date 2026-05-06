import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function bytesToBase64(bytes: Uint8Array): string {
  // Per-byte loop in 8KB windows — avoids "Maximum call stack size exceeded"
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, bytes.length);
    for (let j = i; j < end; j++) binary += String.fromCharCode(bytes[j]);
  }
  return btoa(binary);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  if (!base64 || base64.length < 100) throw new Error("Invalid image data");
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
    const customPrompt = typeof body?.customPrompt === "string" ? body.customPrompt.trim().slice(0, 500) : "";
    const formatRaw = String(body?.format || "square").toLowerCase();
    const FORMAT_MAP: Record<string, { label: string; ratio: string; px: string; orient: string }> = {
      square: { label: "Square", ratio: "1:1", px: "2048x2048", orient: "balanced centered framing" },
      portrait: { label: "Portrait (Mobile / Reels)", ratio: "9:16", px: "1080x1920", orient: "vertical mobile-first composition with subject filling the vertical frame" },
      landscape: { label: "Landscape", ratio: "16:9", px: "1920x1080", orient: "horizontal cinematic composition" },
    };
    const format = FORMAT_MAP[formatRaw] || FORMAT_MAP.square;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
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

    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-check balance
    const { data: creditsRow } = await supabase
      .from("credits").select("balance").eq("user_id", userId).maybeSingle();
    const balance = creditsRow?.balance ?? 0;
    if (balance < shotTypes.length) {
      return new Response(JSON.stringify({
        error: `Not enough credits. You need ${shotTypes.length}, you have ${balance}.`,
        code: "INSUFFICIENT_CREDITS",
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[generate-product-shots] user=${userId} balance=${balance} requested=${shotTypes.length}`);
    console.log(`[generate-product-shots] Starting generation for: ${productTitle}`);
    console.log(`[generate-product-shots] Shot types: ${shotTypes.join(", ")}`);

    const generateOneShot = async (shotType: ShotType): Promise<{ type: ShotType; label: string; url: string } | null> => {
      const shotConfig = SHOT_TYPES[shotType];

      const imagePrompt = `Based on this product image, ${shotConfig.prompt}

Product: ${productTitle}

OUTPUT FORMAT:
- Aspect ratio: ${format.ratio} (${format.label}, ${format.px})
- Composition: ${format.orient}
- For mobile/portrait: keep the product fully visible, avoid cropping at edges, leave safe space top & bottom

CRITICAL REQUIREMENTS:
- Maintain EXACT product identity, colors, materials, and proportions from the source image
- Only change the viewing angle as specified
- Keep the product instantly recognizable as the same item
- Professional e-commerce quality photography
- No text, watermarks, or borders
- Ultra high resolution, sharp focus on the product`;

      // Lovable AI Gateway only (Nano Banana)
      type Provider = { name: string; type: "openai"; url: string; key: string; model: string };
      const PROVIDERS: Provider[] = [
        {
          name: "lovable-ai",
          type: "openai",
          url: "https://ai.gateway.lovable.dev/v1/chat/completions",
          key: LOVABLE_API_KEY,
          model: "google/gemini-2.5-flash-image",
        },
      ];

      let imageData: string | undefined;
      let lastStatus = 0;
      let lastError = "";

      for (const provider of PROVIDERS) {
        try {
          const r = await fetchWithTimeout(
            provider.url,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${provider.key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: provider.model,
                messages: [{
                  role: "user",
                  content: [
                    { type: "text", text: imagePrompt },
                    { type: "image_url", image_url: { url: sourceImageUrl } },
                  ],
                }],
                modalities: ["image", "text"],
              }),
            },
            90_000
          );

          if (r.ok) {
            const data = await r.json();
            imageData = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (imageData) {
              console.log(`[generate-product-shots] ${shotType} via ${provider.name}`);
              break;
            }
            lastError = "no image in response";
            continue;
          }

          lastStatus = r.status;
          lastError = (await r.text()).slice(0, 200);
          console.warn(`[generate-product-shots] ${provider.name} failed [${lastStatus}]: ${lastError}`);
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          console.warn(`[generate-product-shots] ${provider.name} exception:`, lastError);
        }
      }

      try {
        if (!imageData) {
          console.error(`[generate-product-shots] All providers failed for ${shotType}: ${lastStatus} ${lastError}`);
          return null;
        }

        let dataUrl = imageData;
        if (/^https?:\/\//i.test(imageData)) {
          const imgResp = await fetchWithTimeout(imageData, { method: "GET" }, 60_000);
          if (!imgResp.ok) {
            console.error(`[generate-product-shots] Failed to fetch returned image URL for ${shotType}:`, imgResp.status);
            return null;
          }
          const buf = new Uint8Array(await imgResp.arrayBuffer());
          const b64 = bytesToBase64(buf);
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
          return { type: shotType, label: shotConfig.label, url: dataUrl };
        }

        const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
        console.log(`[generate-product-shots] ${shotType} uploaded: ${publicUrlData.publicUrl}`);
        return { type: shotType, label: shotConfig.label, url: publicUrlData.publicUrl };
      } catch (shotError) {
        const msg = shotError instanceof Error ? shotError.message : String(shotError);
        console.error(`[generate-product-shots] Error generating ${shotType}:`, msg);
        return null;
      }
    };

    const results = await Promise.all(shotTypes.map((s) => generateOneShot(s)));
    const generatedImages = results.filter((r): r is { type: ShotType; label: string; url: string } => r !== null);

    if (generatedImages.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate any images. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits: 1 per successfully generated image
    const cost = generatedImages.length;
    const { data: deducted, error: dedErr } = await supabase.rpc("deduct_credits", {
      p_user_id: userId, p_amount: cost,
    });
    if (dedErr) {
      console.error("[generate-product-shots] deduct_credits error:", dedErr);
    } else if (deducted) {
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -cost,
        type: "product_shots",
        description: `Product Shots: ${cost} image(s) — ${productTitle}`,
      });
      console.log(`[generate-product-shots] Deducted ${cost} credits from ${userId}`);
    } else {
      console.warn(`[generate-product-shots] deduct returned false for user ${userId}`);
    }

    return new Response(JSON.stringify({ success: true, images: generatedImages, productTitle, creditsCharged: cost }), {
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
