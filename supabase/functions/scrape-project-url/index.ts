import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// LANGUAGE DETECTION - Improved with contextual hints & TLD fallback
// ============================================================

const LANG_HINTS: Record<string, string[]> = {
  fr: ["nous", "notre", "clients", "entreprise", "équipe", "bienvenue", "accueil", "société"],
  en: ["we", "our", "customers", "business", "team", "welcome", "company", "about us"],
  es: ["nuestro", "nuestra", "clientes", "empresa", "equipo", "bienvenido", "nosotros"],
  de: ["wir", "unsere", "kunden", "unternehmen", "willkommen", "über uns"],
  it: ["nostro", "nostra", "clienti", "azienda", "benvenuto", "chi siamo"],
  pt: ["nosso", "nossa", "clientes", "empresa", "equipe", "bem-vindo", "sobre nós"],
};

const TLD_LANG_MAP: Record<string, string> = {
  ".fr": "fr", ".es": "es", ".de": "de", ".it": "it", ".pt": "pt",
  ".br": "pt", ".mx": "es", ".ar": "es", ".be": "fr", ".ch": "de", ".at": "de",
};

function detectLanguage(content: string, url?: string): string {
  if (!content) {
    if (url) {
      for (const [tld, lang] of Object.entries(TLD_LANG_MAP)) {
        if (url.toLowerCase().includes(tld)) return lang;
      }
    }
    return "en";
  }
  
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

  for (const langScore of scores) {
    const hints = LANG_HINTS[langScore.lang] || [];
    for (const hint of hints) {
      if (text.includes(hint)) {
        langScore.score += 3;
      }
    }
  }

  scores.sort((a, b) => b.score - a.score);
  
  if (scores[0].score >= 5) {
    return scores[0].lang;
  }
  
  if (url) {
    for (const [tld, lang] of Object.entries(TLD_LANG_MAP)) {
      if (url.toLowerCase().includes(tld)) {
        console.log(`[LANG] Low confidence, using TLD fallback: ${lang}`);
        return lang;
      }
    }
  }
  
  return "en";
}

// ============================================================
// AI-POWERED SERVICE EXTRACTION - Calls extract-services-ai function
// ============================================================

async function extractServicesWithAI(markdown: string, url: string): Promise<string[]> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[scrape-project-url] Missing Supabase env vars for AI extraction");
      return [];
    }

    console.log("[scrape-project-url] Calling AI service extraction...");
    
    const response = await fetch(`${supabaseUrl}/functions/v1/extract-services-ai`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markdown, url }),
    });

    if (!response.ok) {
      console.error("[scrape-project-url] AI extraction failed:", response.status);
      return [];
    }

    const result = await response.json();
    console.log("[scrape-project-url] AI extraction result:", result);
    
    return result.services || [];
  } catch (error) {
    console.error("[scrape-project-url] AI extraction error:", error);
    return [];
  }
}

// ============================================================
// FALLBACK: Minimal heuristic extraction for navigation/footer
// ============================================================

function extractServicesFallback(markdown: string): string[] {
  const services: Set<string> = new Set();
  
  // Only look for explicit "Services" or "Products" sections
  const servicesSectionMatch = markdown.match(/(?:^|\n)#{1,3}\s*(?:Services|Products|Solutions|What We Offer|Our Services)\s*\n([\s\S]{0,500})/i);
  
  if (servicesSectionMatch) {
    const sectionContent = servicesSectionMatch[1];
    // Extract list items or sub-headers
    const items = sectionContent.match(/(?:^|\n)[-*]\s*(.{3,30})(?:\n|$)/g) || [];
    for (const item of items) {
      const cleaned = item.replace(/^[-*\n\s]+/, "").trim();
      if (cleaned.length >= 3 && cleaned.length <= 30) {
        services.add(cleaned);
      }
    }
  }
  
  return Array.from(services).slice(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("[scrape-project-url] Scraping URL:", formattedUrl);

    let data: any = null;
    let lastError: string | null = null;

    // Attempt 1: Standard scrape with main content + branding
    try {
      console.log("[scrape-project-url] Attempt 1: Standard scrape with branding");
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
          waitFor: 3000,
          timeout: 30000,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        data = result;
        console.log("[scrape-project-url] First attempt successful");
      } else {
        lastError = result.error || `Status ${response.status}`;
        console.log("[scrape-project-url] First attempt failed:", lastError);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
      console.log("[scrape-project-url] First attempt exception:", lastError);
    }

    // Attempt 2: Try without onlyMainContent if first failed
    if (!data) {
      try {
        console.log("[scrape-project-url] Attempt 2: Full page scrape");
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ["markdown"],
            onlyMainContent: false,
            waitFor: 5000,
            timeout: 45000,
          }),
        });

        const result = await response.json();
        if (response.ok && result.success) {
          data = result;
          console.log("[scrape-project-url] Second attempt successful");
        } else {
          lastError = result.error || `Status ${response.status}`;
          console.log("[scrape-project-url] Second attempt failed:", lastError);
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Network error";
        console.log("[scrape-project-url] Second attempt exception:", lastError);
      }
    }

    if (!data) {
      console.error("[scrape-project-url] All attempts failed:", lastError);
      return new Response(
        JSON.stringify({ success: false, error: lastError || "Failed to scrape URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[scrape-project-url] Scrape successful");

    const responseData = data.data || data;
    const markdown = responseData?.markdown || "";
    const metadata = responseData?.metadata || {};
    const branding = responseData?.branding || null;

    const textForDetection = [
      metadata?.title || "",
      metadata?.description || "",
      markdown.substring(0, 2000) || "",
    ].join(" ");

    const detectedLanguage = detectLanguage(textForDetection, formattedUrl);
    console.log("[scrape-project-url] Detected language:", detectedLanguage);

    // AI-powered service extraction (primary method)
    let extractedServices = await extractServicesWithAI(markdown, formattedUrl);
    
    // Fallback to minimal heuristic if AI returns empty
    if (extractedServices.length === 0) {
      console.log("[scrape-project-url] AI returned empty, trying fallback...");
      extractedServices = extractServicesFallback(markdown);
    }
    
    console.log("[scrape-project-url] Final extracted services:", extractedServices);

    const logoUrl = branding?.images?.logo || branding?.logo || null;
    const colors = branding?.colors || null;
    const favicon = branding?.images?.favicon || null;

    console.log("[scrape-project-url] Branding - Logo:", logoUrl, "Colors:", colors ? "found" : "none");

    const rawTitle = metadata?.title || "";
    const cleanBrandName = rawTitle
      .split(/\s*[–—|\-:•]\s*/)[0]
      .trim()
      .substring(0, 50);

    console.log("[scrape-project-url] Clean brand name:", cleanBrandName, "from:", rawTitle);

    const scrapedData = {
      success: true,
      title: cleanBrandName || rawTitle,
      fullTitle: rawTitle,
      description: metadata?.description || "",
      markdown: markdown,
      branding: branding,
      logo: logoUrl,
      favicon: favicon,
      colors: colors,
      detectedLanguage: detectedLanguage,
      services: extractedServices,
      sourceURL: metadata?.sourceURL || formattedUrl,
      statusCode: metadata?.statusCode || 200,
    };

    return new Response(
      JSON.stringify(scrapedData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[scrape-project-url] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
