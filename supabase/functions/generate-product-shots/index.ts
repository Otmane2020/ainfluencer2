import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

async function enforceAspectRatio(
  bytes: Uint8Array,
  targetW: number,
  targetH: number,
): Promise<Uint8Array> {
  try {
    const img = await Image.decode(bytes);
    const srcRatio = img.width / img.height;
    const dstRatio = targetW / targetH;
    // If already close enough (±2%), just resize to exact target
    if (Math.abs(srcRatio - dstRatio) < 0.02) {
      img.resize(targetW, targetH);
      return await img.encode();
    }
    // CONTAIN (letterbox): scale so the entire product fits, then center on a white canvas.
    // Avoids cropping the product when switching to portrait/landscape formats.
    let newW: number, newH: number;
    if (srcRatio > dstRatio) {
      // source wider → fit by width
      newW = targetW;
      newH = Math.round(targetW / srcRatio);
    } else {
      // source taller → fit by height
      newH = targetH;
      newW = Math.round(targetH * srcRatio);
    }
    img.resize(newW, newH);
    const canvas = new Image(targetW, targetH);
    canvas.fill(0xffffffff); // opaque white background
    const x = Math.floor((targetW - newW) / 2);
    const y = Math.floor((targetH - newH) / 2);
    canvas.composite(img, x, y);
    return await canvas.encode();
  } catch (e) {
    console.warn("[enforceAspectRatio] failed, returning original:", e);
    return bytes;
  }
}

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

function classifyProviderFailure(status: number, message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    status === 429 ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("queue full")
  ) {
    return "RATE_LIMITED";
  }

  if (
    normalizedMessage.includes("not enough credits") ||
    normalizedMessage.includes("billing hard limit") ||
    normalizedMessage.includes("billing limit") ||
    normalizedMessage.includes("payment_required") ||
    normalizedMessage.includes("credits exhausted")
  ) {
    return "CREDITS_EXHAUSTED";
  }

  if (status === 404 || normalizedMessage.includes("not found")) {
    return "MODEL_UNAVAILABLE";
  }

  if (status >= 500) {
    return "PROVIDER_UNAVAILABLE";
  }

  return "PROVIDER_ERROR";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const sourceImageUrl = body?.sourceImageUrl as string | undefined;
    const productTitle = (body?.productTitle as string | undefined) || "Product";
    const includeLifestyle = Boolean(body?.includeLifestyle);
    const customPrompt = typeof body?.customPrompt === "string" ? body.customPrompt.trim().slice(0, 500) : "";
    const withAmbiance = Boolean(body?.withAmbiance);
    const ambiancePrompt = typeof body?.ambiancePrompt === "string" ? body.ambiancePrompt.trim().slice(0, 300) : "";
    const formatRaw = String(body?.format || "square").toLowerCase();
    const FORMAT_MAP: Record<string, { label: string; ratio: string; px: string; orient: string; width: number; height: number }> = {
      square: { label: "Square", ratio: "1:1", px: "2048x2048", orient: "balanced centered framing", width: 2048, height: 2048 },
      portrait: { label: "Portrait (Mobile / Reels)", ratio: "9:16", px: "1080x1920", orient: "vertical mobile-first composition with subject filling the vertical frame", width: 1080, height: 1920 },
      landscape: { label: "Landscape", ratio: "16:9", px: "1920x1080", orient: "horizontal cinematic composition", width: 1920, height: 1080 },
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const HF_TOKEN = Deno.env.get("HF_TOKEN");
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

    // Lazy-cached base64 of source image (used by Gemini direct fallback)
    let sourceImageB64: { mime: string; data: string } | null = null;
    const getSourceImageB64 = async (): Promise<{ mime: string; data: string }> => {
      if (sourceImageB64) return sourceImageB64;
      const r = await fetchWithTimeout(sourceImageUrl, { method: "GET" }, 60_000);
      if (!r.ok) throw new Error(`Failed to fetch source image: ${r.status}`);
      const mime = r.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const buf = new Uint8Array(await r.arrayBuffer());
      sourceImageB64 = { mime, data: bytesToBase64(buf) };
      return sourceImageB64;
    };

    let pollinationsQueue = Promise.resolve();
    const runPollinationsRequest = async (url: string): Promise<Response> => {
      const waitForTurn = pollinationsQueue;
      let releaseQueue!: () => void;
      pollinationsQueue = new Promise<void>((resolve) => {
        releaseQueue = resolve;
      });

      await waitForTurn;
      try {
        return await fetchWithTimeout(url, { method: "GET" }, 90_000);
      } finally {
        releaseQueue();
      }
    };


    const generateOneShot = async (
      shotType: ShotType,
    ): Promise<
      | { type: ShotType; label: string; url: string }
      | { type: ShotType; label: string; url: ""; failures: Array<{ provider: string; status: number; message: string; code: string }> }
      | null
    > => {
      const shotConfig = SHOT_TYPES[shotType];

      const useAmbiance = withAmbiance && shotType !== "lifestyle" && ambiancePrompt.length > 0;
      const ambianceBlock = useAmbiance
        ? `\nAMBIANCE / SCENE (must replace any white background): ${ambiancePrompt}. Place the product naturally within this environment while keeping it the clear focal point.\n`
        : "";

      const imagePrompt = `Based on this product image, ${shotConfig.prompt}

Product: ${productTitle}
${customPrompt ? `\nUSER INSTRUCTIONS (must be respected): ${customPrompt}\n` : ""}${ambianceBlock}
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

      // Providers: Lovable AI Gateway first, then Gemini direct (multiple model names — availability varies)
      type Provider =
        | { name: string; kind: "openrouter"; key: string; model: string }
        | { name: string; kind: "google"; key: string; model: string }
        | { name: string; kind: "openai"; key: string; model: string }
        | { name: string; kind: "huggingface"; key: string; model: string }
        | { name: string; kind: "pollinations"; key: ""; model: string };
      const PROVIDERS: Provider[] = [
        { name: "lovable-ai", kind: "openrouter", key: LOVABLE_API_KEY, model: "google/gemini-2.5-flash-image" },
      ];
      if (GEMINI_API_KEY) {
        for (const m of [
          "gemini-2.5-flash-image",
        ]) {
          PROVIDERS.push({ name: `gemini-direct:${m}`, kind: "google", key: GEMINI_API_KEY, model: m });
        }
      }
      if (OPENAI_API_KEY) {
        PROVIDERS.push({ name: "openai:gpt-image-1", kind: "openai", key: OPENAI_API_KEY, model: "gpt-image-1" });
      }
      // Free fallback #1 — HuggingFace FLUX.1-schnell (Apache 2.0, free tier with HF token)
      if (HF_TOKEN) {
        PROVIDERS.push({ name: "hf:flux-schnell", kind: "huggingface", key: HF_TOKEN, model: "black-forest-labs/FLUX.1-schnell" });
      }
      // Free fallback #2 — Pollinations.ai, no API key required
      PROVIDERS.push({ name: "pollinations:flux", kind: "pollinations", key: "", model: "flux" });

      let imageData: string | undefined;
      let lastStatus = 0;
      let lastError = "";
      const providerFailures: Array<{ provider: string; status: number; message: string; code: string }> = [];

      const MAX_ATTEMPTS = 2;
      outer: for (const provider of PROVIDERS) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            let r: Response;
            if (provider.kind === "openrouter") {
              r = await fetchWithTimeout(
                "https://ai.gateway.lovable.dev/v1/chat/completions",
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
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
              }
            } else if (provider.kind === "google") {
              // Google Generative Language API direct — requires inline base64 + responseModalities
              const src = await getSourceImageB64();
              r = await fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.key}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{
                      role: "user",
                      parts: [
                        { text: imagePrompt },
                        { inline_data: { mime_type: src.mime, data: src.data } },
                      ],
                    }],
                    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
                  }),
                },
                90_000
              );
              if (r.ok) {
                const data = await r.json();
                const parts = data?.candidates?.[0]?.content?.parts || [];
                const imgPart = parts.find((p: { inline_data?: { data?: string; mime_type?: string }; inlineData?: { data?: string; mimeType?: string } }) =>
                  p?.inline_data?.data || p?.inlineData?.data
                );
                const b64 = imgPart?.inline_data?.data || imgPart?.inlineData?.data;
                const mime = imgPart?.inline_data?.mime_type || imgPart?.inlineData?.mimeType || "image/png";
                if (b64) imageData = `data:${mime};base64,${b64}`;
              }
            } else if (provider.kind === "openai") {
              // OpenAI gpt-image-1 via images/edits (multipart) — uses source image as reference
              const src = await getSourceImageB64();
              const imgBytes = Uint8Array.from(atob(src.data), (c) => c.charCodeAt(0));
              const form = new FormData();
              form.append("model", provider.model);
              form.append("prompt", imagePrompt.slice(0, 3900));
              form.append("size", format.width >= format.height
                ? (format.width === format.height ? "1024x1024" : "1536x1024")
                : "1024x1536");
              form.append("n", "1");
              form.append("image", new Blob([imgBytes], { type: src.mime }), "source.png");
              r = await fetchWithTimeout(
                "https://api.openai.com/v1/images/edits",
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${provider.key}` },
                  body: form,
                },
                120_000
              );
              if (r.ok) {
                const data = await r.json();
                const b64 = data?.data?.[0]?.b64_json;
                const url = data?.data?.[0]?.url;
                if (b64) imageData = `data:image/png;base64,${b64}`;
                else if (url) imageData = url;
              }
            } else if (provider.kind === "huggingface") {
              // HuggingFace Inference API — text-to-image (FLUX.1-schnell, Apache 2.0, free tier)
              r = await fetchWithTimeout(
                `https://api-inference.huggingface.co/models/${provider.model}`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${provider.key}`,
                    "Content-Type": "application/json",
                    Accept: "image/png",
                  },
                  body: JSON.stringify({
                    inputs: imagePrompt.slice(0, 1800),
                    parameters: {
                      width: format.width,
                      height: format.height,
                      num_inference_steps: 4,
                    },
                  }),
                },
                90_000
              );
              if (r.ok) {
                const buf = new Uint8Array(await r.arrayBuffer());
                if (buf.byteLength > 1000) {
                  imageData = `data:image/png;base64,${bytesToBase64(buf)}`;
                }
              }
            } else {
              // Pollinations.ai — free, no API key, no billing. Anonymous tier is single-file / single-queue per IP,
              // so requests must be serialized inside this invocation.
              const seed = Math.floor(Math.random() * 1_000_000);
              const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt.slice(0, 1800))}?width=${format.width}&height=${format.height}&model=${provider.model}&nologo=true&seed=${seed}`;
              r = await runPollinationsRequest(url);
              if (r.ok) {
                const buf = new Uint8Array(await r.arrayBuffer());
                if (buf.byteLength > 1000) {
                  imageData = `data:image/png;base64,${bytesToBase64(buf)}`;
                }
              }
            }

            if (r.ok && imageData) {
              console.log(`[generate-product-shots] ${shotType} via ${provider.name} (attempt ${attempt})`);
              break outer;
            }
            if (r.ok) {
              lastError = "no image in response";
              console.warn(`[generate-product-shots] ${shotType} attempt ${attempt} via ${provider.name}: empty image, retrying...`);
            } else {
              lastStatus = r.status;
              lastError = (await r.text()).slice(0, 200);
              const errorCode = classifyProviderFailure(lastStatus, lastError);
              providerFailures.push({
                provider: provider.name,
                status: lastStatus,
                message: lastError,
                code: errorCode,
              });
              console.warn(`[generate-product-shots] ${provider.name} failed [${lastStatus}] attempt ${attempt}: ${lastError}`);
              // 429/5xx → retry; other 4xx (incl. 402 credits, 404 model) → stop and move to next provider
              if (lastStatus < 500 && lastStatus !== 429) break;
            }
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            console.warn(`[generate-product-shots] ${provider.name} exception attempt ${attempt}:`, lastError);
          }
          const backoff =
            lastError.toLowerCase().includes("queue full") || lastStatus === 429
              ? 15_500
              : 600 * attempt + Math.random() * 400;
          await new Promise((res) => setTimeout(res, backoff));
        }
      }


      try {
        if (!imageData) {
          console.error(`[generate-product-shots] All providers failed for ${shotType}: ${lastStatus} ${lastError}`);
          return {
            type: shotType,
            label: shotConfig.label,
            url: "",
            failures: providerFailures,
          } as const;
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

        const rawBytes = dataUrlToBytes(dataUrl);
        const imageBytes = await enforceAspectRatio(rawBytes, format.width, format.height);
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

    // Limit concurrency to 3 — avoids Nano Banana throttling that returns 200 with no image
    const CONCURRENCY = 3;
    const results: Array<
      | { type: ShotType; label: string; url: string }
      | { type: ShotType; label: string; url: ""; failures: Array<{ provider: string; status: number; message: string; code: string }> }
      | null
    > = [];
    for (let i = 0; i < shotTypes.length; i += CONCURRENCY) {
      const batch = shotTypes.slice(i, i + CONCURRENCY);
      const batchRes = await Promise.all(batch.map((s) => generateOneShot(s)));
      results.push(...batchRes);
    }
    const generatedImages = results.filter((r): r is { type: ShotType; label: string; url: string } => Boolean(r && "url" in r && r.url));
    const failedShots = results.filter((r): r is { type: ShotType; label: string; url: ""; failures: Array<{ provider: string; status: number; message: string; code: string }> } => Boolean(r && "failures" in r));

    if (generatedImages.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        fallback: true,
        error: failedShots.some((shot) => shot.failures.some((failure) => failure.code === "CREDITS_EXHAUSTED"))
          ? "Image generation is temporarily unavailable because the connected AI providers have exhausted their credits or billing limits."
          : "All image providers are temporarily unavailable. Please retry in a moment.",
        code: "ALL_PROVIDERS_FAILED",
        failedShots,
      }), {
        status: 200,
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

    return new Response(JSON.stringify({ success: true, images: generatedImages, productTitle, creditsCharged: cost, failedShots }), {
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
