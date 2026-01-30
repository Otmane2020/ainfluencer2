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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectName, scrapedMarkdown } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("[generate-marketing-context] Analyzing:", projectName);

    const systemPrompt = `You are an expert marketing strategist and brand analyst. Your task is to analyze website content and extract a comprehensive marketing context that can be used to generate highly targeted, on-brand content.

IMPORTANT: Extract REAL information from the provided content. DO NOT invent or assume details.

You must return a valid JSON object with this exact structure:
{
  "visual_identity": {
    "primary_color": "#hexcode (extract from brand colors or infer from description)",
    "secondary_colors": ["#hex1", "#hex2"],
    "aesthetic_style": "modern-minimal|bold-vibrant|luxurious-elegant|playful-fun|corporate-professional|organic-natural|tech-futuristic|vintage-retro",
    "logo_description": "Brief visual description of logo if mentioned",
    "mood": "professional|approachable|energetic|calm|premium|innovative|trustworthy|creative"
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
6. Return ONLY the JSON object, no explanations`;

    const userPrompt = `Analyze this business and create a complete marketing context:

BRAND NAME: ${projectName || "Unknown"}

WEBSITE CONTENT:
${scrapedMarkdown?.substring(0, 8000) || "No content provided - make reasonable inferences based on the brand name."}

Extract and structure the marketing context as specified. Focus on:
1. What does this business ACTUALLY sell?
2. Who are their REAL customers?
3. What problems do they solve?
4. What makes them different?
5. What's their brand personality?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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

    // Validate and ensure all required fields exist
    const context = {
      visual_identity: {
        primary_color: parsed.visual_identity?.primary_color || "#3B82F6",
        secondary_colors: parsed.visual_identity?.secondary_colors || [],
        aesthetic_style: parsed.visual_identity?.aesthetic_style || "modern-minimal",
        logo_description: parsed.visual_identity?.logo_description || "",
        mood: parsed.visual_identity?.mood || "professional",
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

    console.log("[generate-marketing-context] Success! Products found:", context.products_services.length);

    return new Response(
      JSON.stringify({ context }),
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
