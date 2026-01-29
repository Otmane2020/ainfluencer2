import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// LANGUAGE DETECTION - Improved with contextual hints & TLD fallback
// ============================================================

// Contextual hints for more accurate detection (avoid FR/ES/PT confusion)
const LANG_HINTS: Record<string, string[]> = {
  fr: ["nous", "notre", "clients", "entreprise", "équipe", "bienvenue", "accueil", "société"],
  en: ["we", "our", "customers", "business", "team", "welcome", "company", "about us"],
  es: ["nuestro", "nuestra", "clientes", "empresa", "equipo", "bienvenido", "nosotros"],
  de: ["wir", "unsere", "kunden", "unternehmen", "willkommen", "über uns"],
  it: ["nostro", "nostra", "clienti", "azienda", "benvenuto", "chi siamo"],
  pt: ["nosso", "nossa", "clientes", "empresa", "equipe", "bem-vindo", "sobre nós"],
};

// TLD to language mapping for fallback
const TLD_LANG_MAP: Record<string, string> = {
  ".fr": "fr",
  ".es": "es",
  ".de": "de",
  ".it": "it",
  ".pt": "pt",
  ".br": "pt",
  ".mx": "es",
  ".ar": "es",
  ".be": "fr",
  ".ch": "de",
  ".at": "de",
};

function detectLanguage(content: string, url?: string): string {
  if (!content) {
    // If no content, try TLD fallback
    if (url) {
      for (const [tld, lang] of Object.entries(TLD_LANG_MAP)) {
        if (url.toLowerCase().includes(tld)) return lang;
      }
    }
    return "en";
  }
  
  // Common patterns for each language
  const frenchPatterns = /\b(le|la|les|de|du|des|un|une|et|est|que|pour|avec|dans|sur|par|pas|plus|nous|vous|ils|elles|ce|cette|sont|ont|fait|peut|tout|bien|très|même|aussi|comme)\b/gi;
  const englishPatterns = /\b(the|is|are|was|were|have|has|had|will|would|could|should|been|being|their|there|they|this|that|with|from|about|which|when|what|your|more|also|just|like|into|some|than)\b/gi;
  const spanishPatterns = /\b(el|la|los|las|de|del|un|una|que|en|es|por|con|para|su|sus|son|han|este|esta|como|más|pero|muy|también|todos|puede|hay|sin|sobre)\b/gi;
  const germanPatterns = /\b(der|die|das|und|ist|von|mit|für|auf|sich|nicht|auch|als|ein|eine|dem|den|werden|nach|bei|haben|kann|sind|wird|aus|oder)\b/gi;
  const italianPatterns = /\b(il|lo|la|le|di|del|un|una|che|in|è|per|con|sono|questa|questo|come|più|ma|anche|tutto|può|essere|fare|non|solo)\b/gi;
  const portuguesePatterns = /\b(o|a|os|as|de|do|da|um|uma|que|em|é|para|com|são|esta|este|como|mais|mas|também|pode|ter|fazer|não|só)\b/gi;

  const text = content.toLowerCase();
  
  const scores = [
    { lang: "fr", score: (text.match(frenchPatterns) || []).length },
    { lang: "en", score: (text.match(englishPatterns) || []).length },
    { lang: "es", score: (text.match(spanishPatterns) || []).length },
    { lang: "de", score: (text.match(germanPatterns) || []).length },
    { lang: "it", score: (text.match(italianPatterns) || []).length },
    { lang: "pt", score: (text.match(portuguesePatterns) || []).length },
  ];

  // Apply contextual hints bonus (avoids FR/ES/PT confusion)
  for (const langScore of scores) {
    const hints = LANG_HINTS[langScore.lang] || [];
    for (const hint of hints) {
      if (text.includes(hint)) {
        langScore.score += 3; // Strong contextual bonus
      }
    }
  }

  scores.sort((a, b) => b.score - a.score);
  
  // Debug logging only when enabled
  if (Deno.env.get("DEBUG_LANG") === "true") {
    console.log("[LANG] Detection scores:", scores);
  }
  
  // Return detected language if confident (at least 5 matches)
  if (scores[0].score >= 5) {
    return scores[0].lang;
  }
  
  // TLD fallback for short/empty content
  if (url) {
    for (const [tld, lang] of Object.entries(TLD_LANG_MAP)) {
      if (url.toLowerCase().includes(tld)) {
        console.log(`[LANG] Low confidence, using TLD fallback: ${lang}`);
        return lang;
      }
    }
  }
  
  return "en"; // Default to English
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "branding"],
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl API error:", data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error || `Request failed with status ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scrape successful");

    // Combine all text content for language detection
    const textForDetection = [
      data.data?.metadata?.title || "",
      data.data?.metadata?.description || "",
      data.data?.markdown?.substring(0, 2000) || "",
    ].join(" ");

    const detectedLanguage = detectLanguage(textForDetection, formattedUrl);
    console.log("[SCRAPE] Detected language:", detectedLanguage);

    // Extract relevant info for project context
    const scrapedData = {
      success: true,
      title: data.data?.metadata?.title || "",
      description: data.data?.metadata?.description || "",
      markdown: data.data?.markdown || "",
      branding: data.data?.branding || null,
      logo: data.data?.branding?.images?.logo || data.data?.branding?.logo || null,
      colors: data.data?.branding?.colors || null,
      detectedLanguage: detectedLanguage,
    };

    return new Response(
      JSON.stringify(scrapedData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error scraping:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to scrape";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
