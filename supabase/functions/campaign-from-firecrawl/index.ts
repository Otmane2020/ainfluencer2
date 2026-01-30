// supabase/functions/campaign-from-firecrawl/index.ts
// 🔥 Multi-URL → 30-day VIDEO + IMAGE campaign generator
// Input: { urls: string[] }
// Output: { language, services, campaign[30] }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// FIRECRAWL
// ============================================================

async function firecrawl(url: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("Missing FIRECRAWL_API_KEY");

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 3000,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(`Firecrawl failed for ${url}: ${json?.error || res.status}`);
  }
  return json.data?.markdown || "";
}

// ============================================================
// SIMPLE SERVICE NORMALIZER (business-focused)
// ============================================================

function normalizeServices(text: string): string[] {
  const s = text.toLowerCase();
  const out: string[] = [];

  if (/avis|review|réponse/.test(s)) out.push("Réponses aux avis avec IA");
  if (/chatgpt|perplexity|gemini/.test(s)) out.push("Visibilité ChatGPT");
  if (/aeo|q&a|questions/.test(s)) out.push("AEO local");
  if (/seo|articles|blog|autopost/.test(s)) out.push("SEO local");

  return [...new Set(out)];
}

// ============================================================
// LANGUAGE DETECTION
// ============================================================

function detectLanguage(content: string): string {
  const text = content.toLowerCase();
  
  const frenchPatterns = /\b(le|la|les|de|du|des|un|une|et|est|que|pour|avec|dans|sur|par|nous|vous|sont|ont|fait|peut|tout|bien|très)\b/gi;
  const englishPatterns = /\b(the|is|are|was|were|have|has|had|will|would|could|should|been|being|their|there|they|this|that|with|from|about)\b/gi;
  const spanishPatterns = /\b(el|la|los|las|de|del|un|una|que|en|es|por|con|para|su|sus|son|han|este|esta|como|más)\b/gi;
  const germanPatterns = /\b(der|die|das|und|ist|von|mit|für|auf|sich|nicht|auch|als|ein|eine|dem|den|werden|nach|bei)\b/gi;

  const scores = [
    { lang: "fr", score: (text.match(frenchPatterns) || []).length },
    { lang: "en", score: (text.match(englishPatterns) || []).length },
    { lang: "es", score: (text.match(spanishPatterns) || []).length },
    { lang: "de", score: (text.match(germanPatterns) || []).length },
  ];

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score >= 5 ? scores[0].lang : "en";
}

// ============================================================
// CAMPAIGN GENERATION (30 DAYS) - Using Lovable AI
// ============================================================

async function generateCampaign(content: string, services: string[], language: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("Missing LOVABLE_API_KEY");

  const langInstruction = language === "fr" 
    ? "Generate ALL content in French. Never use English."
    : language === "es"
    ? "Generate ALL content in Spanish. Never use English."
    : language === "de"
    ? "Generate ALL content in German. Never use English."
    : "Generate all content in English.";

  const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are a senior growth marketer specializing in SaaS social media campaigns.
Generate short, high-conversion video scenarios and image prompts.
Business tone. Reels/TikTok/Instagram ready. Clear hook + CTA.
${langInstruction}`,
        },
        {
          role: "user",
          content: `Business context:
Services: ${services.join(", ")}

Website content (summary):
${content.substring(0, 4000)}

Task:
Generate a 30-day social media campaign.
For each day, provide:
- day (1-30)
- angle (one of: problem, benefit, proof, comparison, authority)
- video_prompt (short scenario description, 6-12 seconds video, vertical 9:16)
- image_prompt (detailed prompt for Flux/SDXL, include style, colors, composition)
- cta (max 6 words, action-oriented)
- hashtags (5-7 relevant hashtags)

Return ONLY a valid JSON array, no markdown, no explanation.
Example format:
[{"day":1,"angle":"problem","video_prompt":"...","image_prompt":"...","cta":"...","hashtags":["#tag1","#tag2"]}]`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Lovable AI error: ${error}`);
  }

  const json = await res.json();
  const content_response = json.choices?.[0]?.message?.content || "";
  
  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = content_response.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[campaign-from-firecrawl] Failed to parse campaign JSON:", jsonStr.substring(0, 500));
    throw new Error("Failed to parse campaign response from AI");
  }
}

// ============================================================
// HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "POST only" }), 
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { urls } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "urls[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[campaign-from-firecrawl] Processing URLs:", urls);

    let combined = "";
    for (const u of urls) {
      const url = u.startsWith("http") ? u : `https://${u}`;
      console.log("[campaign-from-firecrawl] Scraping:", url);
      combined += await firecrawl(url);
      combined += "\n\n";
    }

    const language = detectLanguage(combined);
    const services = normalizeServices(combined);
    
    console.log("[campaign-from-firecrawl] Detected language:", language);
    console.log("[campaign-from-firecrawl] Detected services:", services);

    const campaign = await generateCampaign(combined, services, language);

    console.log("[campaign-from-firecrawl] Generated", campaign.length, "days");

    return new Response(
      JSON.stringify({
        success: true,
        language,
        services,
        days: campaign.length,
        campaign,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[campaign-from-firecrawl] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
