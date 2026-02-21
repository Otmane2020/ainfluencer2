import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, style = "promo", language = "en" } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log(`[url-to-video-script] Scraping: ${formattedUrl} | Style: ${style}`);

    // Step 1: Scrape URL with Firecrawl (markdown + screenshot)
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "screenshot"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    let markdown = "";
    let screenshot: string | null = null;
    let pageTitle = "";

    if (scrapeRes.ok) {
      const scrapeData = await scrapeRes.json();
      markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";
      screenshot = scrapeData?.data?.screenshot || scrapeData?.screenshot || null;
      pageTitle = scrapeData?.data?.metadata?.title || scrapeData?.metadata?.title || "";
      console.log(`[url-to-video-script] Firecrawl OK: ${markdown.length} chars | Screenshot: ${screenshot ? "yes" : "no"}`);
    } else {
      const errBody = await scrapeRes.text();
      console.warn(`[url-to-video-script] Firecrawl failed (${scrapeRes.status}): ${errBody}`);
      console.log("[url-to-video-script] Falling back to internal fetch...");

      // Fallback: simple fetch
      try {
        const fallbackRes = await fetch(formattedUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; NanoBanana/1.0)" },
          redirect: "follow",
        });
        const html = await fallbackRes.text();
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        pageTitle = titleMatch ? titleMatch[1].trim() : "";
        // Extract text content (strip tags)
        markdown = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);
        console.log(`[url-to-video-script] Fallback OK: ${markdown.length} chars`);
      } catch (fallbackErr) {
        console.error("[url-to-video-script] Fallback also failed:", fallbackErr);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to scrape URL: Firecrawl returned ${scrapeRes.status} and fallback fetch also failed` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!markdown || markdown.length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not extract enough content from this URL" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Generate video script using OpenRouter
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "OpenRouter API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stylePrompts: Record<string, string> = {
      promo: "Write a short, punchy promotional video script (30-60 seconds) that highlights the key selling points and ends with a strong CTA. Use short sentences. Make it feel like a premium ad.",
      demo: "Write a product walkthrough script (30-60 seconds) that explains what the product does, its key features, and why someone should try it. Keep it clear and professional.",
      explainer: "Write an explainer video script (30-60 seconds) that breaks down what this product/service is, the problem it solves, and how it works. Educational yet engaging tone.",
      testimonial: "Write a script (30-60 seconds) as if a satisfied customer is sharing their experience with this product. Make it authentic and relatable.",
    };

    const styleInstruction = stylePrompts[style] || stylePrompts.promo;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional video scriptwriter for SaaS and ecommerce brands. You write scripts that are read aloud as voiceovers for promotional videos.

Rules:
- Write ONLY the narration text (no scene directions, no timestamps, no emojis)
- Language: ${language === "fr" ? "French" : language === "en" ? "English" : language}
- Keep it under 120 words
- Each sentence on its own line
- Make every word count — no filler
- End with a clear call-to-action`,
          },
          {
            role: "user",
            content: `${styleInstruction}

Website: ${formattedUrl}
Title: ${pageTitle}

Content:
${markdown.slice(0, 3000)}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[url-to-video-script] AI error:", errText);
      
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits to your Lovable workspace under Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "AI rate limit reached. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: "AI script generation failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const script = aiData?.choices?.[0]?.message?.content?.trim() || "";

    console.log(`[url-to-video-script] Script generated: ${script.length} chars`);

    // Step 3: Upload screenshot to Supabase Storage for the render worker
    let screenshotUrl = screenshot; // base64 data URL from Firecrawl
    if (screenshot && screenshot.startsWith("data:")) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Convert base64 to binary
        const base64Data = screenshot.split(",")[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const fileName = `screenshots/url-video-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, bytes, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
          console.log(`[url-to-video-script] Screenshot uploaded: ${screenshotUrl}`);
        } else {
          console.warn("[url-to-video-script] Screenshot upload failed:", uploadError.message);
        }
      } catch (e) {
        console.warn("[url-to-video-script] Screenshot upload error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        script,
        screenshot: screenshotUrl,
        title: pageTitle,
        url: formattedUrl,
        markdownLength: markdown.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[url-to-video-script] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
