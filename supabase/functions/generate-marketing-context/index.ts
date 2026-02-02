import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Safe JSON parsing utility
function safeParseJSON<T>(text: string): T | null {
  try {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1) return null;
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

// Fetch branding from Firecrawl
async function fetchBrandingFromFirecrawl(url: string): Promise<{
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  fonts?: string[];
  colorScheme?: string;
} | null> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.log("[generate-marketing-context] Firecrawl API key not configured, skipping branding extraction");
    return null;
  }

  try {
    console.log("[generate-marketing-context] Fetching branding from:", url);
    
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["branding"],
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-marketing-context] Firecrawl error:", response.status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    console.log("[generate-marketing-context] Firecrawl branding response keys:", Object.keys(data));
    
    // Handle nested data structure
    const branding = data.data?.branding || data.branding;
    
    if (!branding) {
      console.log("[generate-marketing-context] No branding data found in response");
      return null;
    }

    console.log("[generate-marketing-context] Branding extracted:", {
      hasLogo: !!branding.logo || !!branding.images?.logo,
      hasColors: !!branding.colors,
      hasFonts: !!branding.fonts,
      colorScheme: branding.colorScheme,
    });

    return {
      logo: branding.logo || branding.images?.logo,
      colors: branding.colors,
      fonts: branding.fonts?.map((f: any) => f.family || f) || [],
      colorScheme: branding.colorScheme,
    };
  } catch (error) {
    console.error("[generate-marketing-context] Firecrawl branding error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectName, projectDescription, scrapedMarkdown, projectUrl } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    console.log("[generate-marketing-context] Analyzing:", projectName, "URL:", projectUrl);

    // Step 1: Fetch branding from Firecrawl if URL provided
    let branding: Awaited<ReturnType<typeof fetchBrandingFromFirecrawl>> = null;
    if (projectUrl) {
      branding = await fetchBrandingFromFirecrawl(projectUrl);
    }

    // Step 2: Build enhanced prompt with branding info
    const brandingContext = branding ? `
EXTRACTED BRANDING (from actual website):
- Logo URL: ${branding.logo || "Not found"}
- Primary Color: ${branding.colors?.primary || "Not found"}
- Secondary Color: ${branding.colors?.secondary || "Not found"}
- Accent Color: ${branding.colors?.accent || "Not found"}
- Background Color: ${branding.colors?.background || "Not found"}
- Color Scheme: ${branding.colorScheme || "Not detected"}
- Fonts: ${branding.fonts?.join(", ") || "Not detected"}
` : "";

    const systemPrompt = `You are an expert marketing strategist and brand analyst. Your task is to analyze website content and extract a comprehensive marketing context that can be used to generate highly targeted, on-brand content.

IMPORTANT: Extract REAL information from the provided content. DO NOT invent or assume details.
${branding ? "CRITICAL: Use the EXTRACTED BRANDING data provided - these are real values from the website!" : ""}

You must return a valid JSON object with this exact structure:
{
  "visual_identity": {
    "primary_color": "#hexcode (${branding?.colors?.primary ? `USE: ${branding.colors.primary}` : "extract from brand colors or infer from description"})",
    "secondary_colors": ["#hex1", "#hex2"],
    "aesthetic_style": "modern-minimal|bold-vibrant|luxurious-elegant|playful-fun|corporate-professional|organic-natural|tech-futuristic|vintage-retro",
    "logo_description": "Brief visual description of logo${branding?.logo ? ` (Logo found at: ${branding.logo})` : ""}",
    "logo_url": "${branding?.logo || "URL of logo if found"}",
    "mood": "professional|approachable|energetic|calm|premium|innovative|trustworthy|creative",
    "fonts": ${JSON.stringify(branding?.fonts || [])}
  },
  "brand_personality": {
    "tone": "professional|friendly-expert|casual-approachable|authoritative|playful|inspiring|urgent|luxurious",
    "values": ["value1", "value2", "value3"],
    "voice_keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "target_audience": {
    "primary": "Description of ideal customer",
    "demographics": "Age range, profession, interests",
    "pain_points": ["pain1", "pain2", "pain3"],
    "desires": ["desire1", "desire2", "desire3"]
  },
  "products_services": [
    {
      "name": "Product/Service name",
      "description": "Brief description",
      "key_benefit": "Main benefit for customers"
    }
  ],
  "competitive_positioning": "What makes this brand unique - their USP",
  "content_guidelines": {
    "banned_terms": ["overused marketing words to avoid"],
    "preferred_terms": ["brand-specific terms to use"],
    "visual_banned": ["visual clichés to avoid"],
    "visual_preferred": ["visual styles that match brand"]
  }
}

RULES:
1. Extract ALL products/services mentioned
2. Identify pain points from problem statements or testimonials
3. Infer brand tone from the writing style
4. Be specific - avoid generic marketing speak
5. If something is not mentioned, make an educated inference based on the industry
6. Return ONLY the JSON object, no explanations
7. ${branding?.colors?.primary ? `USE "${branding.colors.primary}" as primary_color - this is from the actual website!` : ""}
8. ${branding?.logo ? `Include logo_url: "${branding.logo}" - this is the real logo!` : ""}`;

    const userPrompt = `Analyze this business and create a complete marketing context:

BRAND NAME: ${projectName || "Unknown"}
WEBSITE URL: ${projectUrl || "Not provided"}
DESCRIPTION: ${projectDescription || "No description provided"}
${brandingContext}
WEBSITE CONTENT:
${scrapedMarkdown?.substring(0, 8000) || "No content provided - make reasonable inferences based on the brand name."}

Extract and structure the marketing context as specified. Focus on:
1. What does this business ACTUALLY sell?
2. Who are their REAL customers?
3. What problems do they solve?
4. What makes them different?
5. What's their brand personality?
${branding ? "6. USE the extracted branding colors and logo - they are REAL data!" : ""}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("[generate-marketing-context] AI error:", status, errorText.slice(0, 200));

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI error: ${status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("[generate-marketing-context] Parsing response...");

    const parsed = safeParseJSON<any>(content);

    if (!parsed) {
      console.error("[generate-marketing-context] Failed to parse:", content.slice(0, 500));
      throw new Error("Failed to parse AI response");
    }

    // Validate and ensure all required fields exist, preferring Firecrawl data
    const context = {
      visual_identity: {
        primary_color: branding?.colors?.primary || parsed.visual_identity?.primary_color || "#3B82F6",
        secondary_colors: [
          branding?.colors?.secondary,
          branding?.colors?.accent,
          ...(parsed.visual_identity?.secondary_colors || [])
        ].filter(Boolean).slice(0, 3),
        aesthetic_style: parsed.visual_identity?.aesthetic_style || "modern-minimal",
        logo_description: parsed.visual_identity?.logo_description || "",
        logo_url: branding?.logo || parsed.visual_identity?.logo_url || "",
        mood: parsed.visual_identity?.mood || "professional",
        fonts: branding?.fonts || parsed.visual_identity?.fonts || [],
        color_scheme: branding?.colorScheme || parsed.visual_identity?.color_scheme || "light",
      },
      brand_personality: {
        tone: parsed.brand_personality?.tone || "professional",
        values: parsed.brand_personality?.values || [],
        voice_keywords: parsed.brand_personality?.voice_keywords || [],
      },
      target_audience: {
        primary: parsed.target_audience?.primary || "",
        demographics: parsed.target_audience?.demographics || "",
        pain_points: parsed.target_audience?.pain_points || [],
        desires: parsed.target_audience?.desires || [],
      },
      products_services: parsed.products_services || [],
      competitive_positioning: parsed.competitive_positioning || "",
      content_guidelines: {
        banned_terms: parsed.content_guidelines?.banned_terms || [],
        preferred_terms: parsed.content_guidelines?.preferred_terms || [],
        visual_banned: parsed.content_guidelines?.visual_banned || [],
        visual_preferred: parsed.content_guidelines?.visual_preferred || [],
      },
    };

    console.log("[generate-marketing-context] Success!", {
      products: context.products_services.length,
      primaryColor: context.visual_identity.primary_color,
      hasLogo: !!context.visual_identity.logo_url,
      fonts: context.visual_identity.fonts.length,
    });

    return new Response(
      JSON.stringify({ context, branding_source: branding ? "firecrawl" : "ai_inferred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-marketing-context] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
