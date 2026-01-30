import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// ============================================================
// SERVICE/FEATURE EXTRACTION - Extracts product names, features, services
// ============================================================

function extractServicesFromMarkdown(markdown: string): string[] {
  const services: Set<string> = new Set();
  
  // Common noise words to filter out
  const noiseWords = new Set([
    "home", "about", "contact", "sign in", "sign up", "login", "register", 
    "get started", "learn more", "try now", "try free", "start", "watch",
    "read more", "see more", "view", "click", "here", "now", "free",
    "pricing", "blog", "faq", "features", "resources", "company", "legal",
    "privacy", "terms", "support", "help", "demo", "month", "year", "day",
    "limited", "time", "off", "save", "popular", "new", "pro", "premium",
    "basic", "starter", "business", "enterprise", "agency", "creator",
    "plan", "plans", "choose", "current", "upgrade", "subscribe",
  ]);

  // 1. Extract from markdown headers (## or ### followed by product/service names)
  const headerMatches = markdown.match(/^#{1,3}\s*(.{3,40})$/gm) || [];
  for (const match of headerMatches) {
    const cleanedHeader = match.replace(/^#+\s*/, "").trim();
    // Filter out navigation/generic headers
    if (cleanedHeader.length >= 3 && 
        cleanedHeader.length <= 40 && 
        !noiseWords.has(cleanedHeader.toLowerCase()) &&
        !/^\d/.test(cleanedHeader) &&
        !cleanedHeader.includes("http") &&
        !/^(step|simple|everything|ready|loved|trusted)/i.test(cleanedHeader)) {
      services.add(cleanedHeader);
    }
  }

  // 2. Extract from bold text patterns (common for feature names)
  const boldMatches = markdown.match(/\*\*([^*]{3,35})\*\*/g) || [];
  for (const match of boldMatches) {
    const cleaned = match.replace(/\*\*/g, "").trim();
    if (cleaned.length >= 3 && 
        cleaned.length <= 35 && 
        !noiseWords.has(cleaned.toLowerCase()) &&
        !/^\d/.test(cleaned) &&
        !cleaned.includes("@") &&
        !/^(join|start|get|try|learn|read|see|view|click)/i.test(cleaned)) {
      services.add(cleaned);
    }
  }

  // 3. Look for common feature list patterns
  const featurePatterns = [
    /(?:AI|Smart|Auto|Premium|Pro)\s+\w+(?:\s+\w+)?/gi,  // AI Videos, Smart Images, etc.
    /\w+(?:Motion|Studio|Generator|Creator|Builder|Manager)/gi, // ClipMotion, etc.
    /(?:Video|Image|Content|Social|Brand)\s+\w+/gi, // Video Generation, etc.
  ];
  
  for (const pattern of featurePatterns) {
    const matches = markdown.match(pattern) || [];
    for (const match of matches) {
      const cleaned = match.trim();
      if (cleaned.length >= 4 && 
          cleaned.length <= 30 && 
          !noiseWords.has(cleaned.toLowerCase())) {
        services.add(cleaned);
      }
    }
  }

  // 4. Look for product cards pattern (FLAGSHIP, NEW, etc. followed by name)
  const cardPatterns = markdown.match(/(?:FLAGSHIP|NEW|PREMIUM|AI SMART|POPULAR)\s*\n+\s*([^\n]{3,30})/gi) || [];
  for (const match of cardPatterns) {
    const lines = match.split("\n").filter(l => l.trim());
    if (lines.length >= 2) {
      const productName = lines[1].trim();
      if (productName.length >= 3 && productName.length <= 30) {
        services.add(productName);
      }
    }
  }

  // Clean and deduplicate
  const cleanedServices = Array.from(services)
    .map(s => s.replace(/[#*_]/g, "").trim())
    .filter(s => s.length >= 3 && s.length <= 35)
    .filter(s => !noiseWords.has(s.toLowerCase()))
    .slice(0, 12); // Max 12 suggestions

  return cleanedServices;
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

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("[scrape-project-url] Scraping URL:", formattedUrl);

    // Try scraping with latest Firecrawl v1 API
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

    // If all attempts failed, return error
    if (!data) {
      console.error("[scrape-project-url] All attempts failed:", lastError);
      return new Response(
        JSON.stringify({ success: false, error: lastError || "Failed to scrape URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[scrape-project-url] Scrape successful");

    // Access data correctly from Firecrawl v1 response (nested in data.data)
    const responseData = data.data || data;
    const markdown = responseData?.markdown || "";
    const metadata = responseData?.metadata || {};
    const branding = responseData?.branding || null;

    // Combine all text content for language detection
    const textForDetection = [
      metadata?.title || "",
      metadata?.description || "",
      markdown.substring(0, 2000) || "",
    ].join(" ");

    const detectedLanguage = detectLanguage(textForDetection, formattedUrl);
    console.log("[scrape-project-url] Detected language:", detectedLanguage);

    // Extract services/features from markdown content
    const extractedServices = extractServicesFromMarkdown(markdown);
    console.log("[scrape-project-url] Extracted services:", extractedServices);

    // Extract branding assets with fallbacks
    const logoUrl = branding?.images?.logo || branding?.logo || null;
    const colors = branding?.colors || null;
    const favicon = branding?.images?.favicon || null;

    console.log("[scrape-project-url] Branding - Logo:", logoUrl, "Colors:", colors ? "found" : "none");

    // Extract relevant info for project context
    const scrapedData = {
      success: true,
      title: metadata?.title || "",
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
