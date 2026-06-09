// Public endpoint for the /mobileads landing trial.
// 1 free trial per IP. Scrapes a product URL, then generates 4 stylized images
// via direct Gemini API with modern backgrounds.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STYLES = [
  "in a bright minimalist studio with soft pastel gradient background and floating geometric shapes",
  "on a luxurious marble surface with golden accents, dramatic spotlight, premium editorial mood",
  "in a modern outdoor lifestyle scene with natural daylight, organic textures, soft shadows",
  "on a vibrant futuristic background with neon glow, holographic reflections, ultra-modern composition",
];

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function uploadDataUrl(
  supabase: ReturnType<typeof createClient>,
  dataUrl: string,
  prefix: string,
): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) return null;
    const mime = m[1];
    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const path = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });
    if (error) {
      console.error("upload err", error);
      return null;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("uploadDataUrl", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const url: string = (body?.url ?? "").toString().trim();
    const force: boolean = !!body?.force;

    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "Please provide a valid URL starting with http(s)://" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IP detection (Supabase is behind proxies)
    const fwd = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const ip = fwd.split(",")[0].trim() || "unknown";
    const ipHash = await sha256(`mobileads:${ip}`);
    const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Check existing trial for this IP
    const { data: existing } = await supabase
      .from("mobileads_trials")
      .select("id, status, result_images, product_title, product_url")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (existing && existing.status === "completed" && !force) {
      return new Response(
        JSON.stringify({
          alreadyUsed: true,
          images: existing.result_images,
          productTitle: existing.product_title,
          productUrl: existing.product_url,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert or reset trial row (pending/failed entries can be retried)
    if (!existing) {
      const { error: insErr } = await supabase.from("mobileads_trials").insert({
        ip_hash: ipHash,
        product_url: url,
        status: "pending",
        user_agent: userAgent,
      });
      if (insErr) {
        console.error("insert trial err", insErr);
        return new Response(JSON.stringify({ error: "Could not initialize trial. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      await supabase
        .from("mobileads_trials")
        .update({ status: "pending", product_url: url, error_message: null })
        .eq("ip_hash", ipHash);
    }

    // 1) Scrape with Firecrawl
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    let markdown = "";
    let pageTitle = "";
    let scrapedImage: string | null = null;

    if (FIRECRAWL_API_KEY) {
      try {
        const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 2000 }),
        });
        if (r.ok) {
          const j = await r.json();
          markdown = j?.data?.markdown || j?.markdown || "";
          pageTitle = j?.data?.metadata?.title || j?.metadata?.title || "";
          // Get the first product-looking image from markdown
          const imgMatch = markdown.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+\.(?:jpg|jpeg|png|webp))/i);
          scrapedImage = imgMatch ? imgMatch[1] : null;
        }
      } catch (e) {
        console.warn("firecrawl err", e);
      }
    }

    // Fallback simple fetch
    if (!markdown) {
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ClipMotion/1.0" } });
        const html = await r.text();
        pageTitle = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
        const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
        if (og) scrapedImage = og;
        markdown = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 4000);
      } catch (e) {
        console.warn("fallback fetch err", e);
      }
    }

    if (!markdown || markdown.length < 30) {
      await supabase
        .from("mobileads_trials")
        .update({ status: "failed", error_message: "Could not read this URL" })
        .eq("ip_hash", ipHash);
      return new Response(JSON.stringify({ error: "Could not read content from this URL" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Ask Gemini (direct API) to extract product description
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysisRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: "You analyze e-commerce product pages. Return a JSON object with: {\"product_name\": string, \"category\": string, \"visual_description\": string (a precise one-sentence description of the physical object: shape, color, material, key features for an image generator)}. ONLY JSON, no markdown.\n\n" },
              { text: `Title: ${pageTitle}\n\nContent:\n${markdown.slice(0, 3000)}` },
            ],
          }],
        }),
      },
    );
    const analysisJson = await analysisRes.json();
    let product = { product_name: pageTitle || "Product", category: "product", visual_description: "a modern product" };
    try {
      const txt = analysisJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = txt.replace(/```json|```/g, "").trim();
      product = { ...product, ...JSON.parse(cleaned) };
    } catch (e) {
      console.warn("analysis parse err", e);
    }

    // 3) Generate 4 images with direct Gemini API, fallback to Pollinations
    async function generateOne(prompt: string): Promise<string | null> {
      // Primary: direct Gemini API
      if (GEMINI_API_KEY) {
        try {
          const parts: any[] = [{ text: prompt }];
          if (scrapedImageB64) {
            parts.push({ inline_data: { mime_type: scrapedImageB64.mime, data: scrapedImageB64.data } });
          }
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts }],
                generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
              }),
            },
          );
          if (r.ok) {
            const j = await r.json();
            const inline = j?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inline_data || p?.inlineData);
            const inlineData = inline?.inline_data ?? inline?.inlineData;
            if (inlineData?.data) {
              const mime = inlineData.mime_type ?? inlineData.mimeType ?? "image/png";
              return `data:${mime};base64,${inlineData.data}`;
            }
          } else {
            console.warn("gemini-direct img failed", r.status, (await r.text()).slice(0, 200));
          }
        } catch (e) {
          console.warn("gemini-direct err", e);
        }
      }

      // Fallback: Pollinations.ai — free, no API key
      try {
        const seed = Math.floor(Math.random() * 1_000_000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1800))}?width=1080&height=1920&model=flux&nologo=true&seed=${seed}`;
        const r = await fetch(url, { method: "GET" });
        if (r.ok) {
          const buf = new Uint8Array(await r.arrayBuffer());
          if (buf.byteLength > 1000) {
            let bin = "";
            for (let j = 0; j < buf.length; j += 8192) {
              const end = Math.min(j + 8192, buf.length);
              for (let k = j; k < end; k++) bin += String.fromCharCode(buf[k]);
            }
            return `data:image/png;base64,${btoa(bin)}`;
          }
        }
      } catch (e) {
        console.warn("pollinations err", e);
      }

      return null;
    }

    const generatedUrls: string[] = [];
    for (let i = 0; i < STYLES.length; i++) {
      const style = STYLES[i];
      const prompt = `Ultra-realistic professional product photography of ${product.visual_description}. The product is ${product.product_name}. Place it ${style}. 9:16 vertical mobile-ad composition, sharp focus on the product, premium commercial lighting, hyper-detailed, no text, no logos. Magazine-quality, photorealistic.`;
      const dataUrl = await generateOne(prompt);
      if (!dataUrl) continue;
      const publicUrl = await uploadDataUrl(supabase, dataUrl, "mobileads");
      if (publicUrl) generatedUrls.push(publicUrl);
    }

    if (generatedUrls.length === 0) {
      await supabase
        .from("mobileads_trials")
        .update({ status: "failed", error_message: "Image generation failed" })
        .eq("ip_hash", ipHash);
      return new Response(JSON.stringify({ error: "Failed to generate images. Please try a different URL." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("mobileads_trials")
      .update({
        status: "completed",
        result_images: generatedUrls,
        product_title: product.product_name,
        completed_at: new Date().toISOString(),
      })
      .eq("ip_hash", ipHash);

    return new Response(
      JSON.stringify({
        success: true,
        images: generatedUrls,
        productTitle: product.product_name,
        productUrl: url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[mobileads-generate] fatal", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
