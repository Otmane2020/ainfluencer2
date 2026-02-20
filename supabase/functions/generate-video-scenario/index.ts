import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScenarioScene {
  timestamp: string;
  visual: string;
  voiceover: string;
}

interface GeneratedScenario {
  id: string;
  title: string;
  angle: "problem" | "benefit" | "emotion" | "proof" | "urgency";
  scenes: ScenarioScene[];
  fullScript: string;
  hashtags: string[];
  estimatedEngagement: "high" | "medium" | "low";
}

interface RequestBody {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  projectUrl?: string;
  scrapedContent?: string;
  sectorId?: string;
  styleId?: string;
  toneId?: string;
  scriptType: "short" | "ad" | "story" | "testimonial";
  duration: number;
  detectedLanguage?: string;
  logoUrl?: string;
  videoMode?: "standard" | "clipmotion";
  marketingContext?: any;
}

// Business sectors context
const SECTOR_CONTEXT: Record<string, string> = {
  restaurant: "Restaurant setting, food, dining experience, chef, customers",
  boutique: "Fashion boutique, elegant displays, shopping experience",
  "real-estate": "Property tour, modern home, real estate agent",
  medical: "Medical clinic, caring doctor, healthcare environment",
  hotel: "Luxury hotel, room reveal, spa, vacation vibes",
  fitness: "Gym environment, workout session, athletic performance",
  beauty: "Beauty salon, transformation, styling",
  auto: "Car dealership, vehicle showcase, automotive expertise",
  tech: "Tech office, product demo, innovation",
  education: "Learning environment, knowledge sharing",
  agency: "Professional agency, team collaboration",
  ecommerce: "Product unboxing, online shopping experience",
};

// Style context
const STYLE_CONTEXT: Record<string, string> = {
  testimonial: "Authentic customer speaking to camera, genuine emotion",
  "product-demo": "Product demonstration, hands-on showcase, features highlight",
  "before-after": "Dramatic transformation, split screen comparison",
  tutorial: "Step-by-step guide, educational content",
  "behind-scenes": "Behind the scenes, making-of, team at work",
  story: "Brand storytelling, company journey, mission",
  lifestyle: "Lifestyle content, aspirational visuals",
  ugc: "User-generated style, casual phone recording, authentic",
};

// Tone context
const TONE_CONTEXT: Record<string, string> = {
  urgent: "Fast-paced, urgency, FOMO, limited time",
  inspiring: "Inspirational, motivational, success story",
  reassuring: "Calm, trustworthy, reliable, peace of mind",
  dynamic: "High energy, fast cuts, exciting, trendy",
  professional: "Corporate, credibility, polished",
  playful: "Fun, colorful, humor, entertaining",
  luxurious: "Premium, elegant, high-end, sophisticated",
  authentic: "Raw, no filters, genuine, transparent",
};

// Detect language from content
function detectLanguage(content: string): string {
  if (!content) return "en";
  
  // Common French words/patterns
  const frenchPatterns = /\b(le|la|les|de|du|des|un|une|et|est|que|pour|avec|dans|sur|par|pas|plus|nous|vous|ils|elles|ce|cette|sont|ont|fait|peut|tout|bien|très|même|aussi|comme)\b/gi;
  // Common English words/patterns
  const englishPatterns = /\b(the|is|are|was|were|have|has|had|will|would|could|should|been|being|their|there|they|this|that|with|from|about|which|when|what|your|more|also|just|like|into|some|than)\b/gi;
  // Common Spanish words/patterns
  const spanishPatterns = /\b(el|la|los|las|de|del|un|una|que|en|es|por|con|para|su|sus|son|han|este|esta|como|más|pero|muy|también|todos|puede|hay|sin|sobre)\b/gi;
  // Common German words/patterns
  const germanPatterns = /\b(der|die|das|und|ist|von|mit|für|auf|sich|nicht|auch|als|ein|eine|dem|den|werden|nach|bei|haben|kann|sind|wird|aus|oder)\b/gi;

  const text = content.toLowerCase();
  
  const frenchMatches = (text.match(frenchPatterns) || []).length;
  const englishMatches = (text.match(englishPatterns) || []).length;
  const spanishMatches = (text.match(spanishPatterns) || []).length;
  const germanMatches = (text.match(germanPatterns) || []).length;

  const scores = [
    { lang: "fr", score: frenchMatches },
    { lang: "en", score: englishMatches },
    { lang: "es", score: spanishMatches },
    { lang: "de", score: germanMatches },
  ];

  scores.sort((a, b) => b.score - a.score);
  
  // Return detected language if confident (at least 5 matches)
  if (scores[0].score >= 5) {
    return scores[0].lang;
  }
  
  return "en"; // Default to English
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  fr: "OUTPUT ONLY IN FRENCH - No English words except brand names. Use natural, conversational French.",
  en: "OUTPUT ONLY IN ENGLISH - Use natural, conversational American English.",
  es: "OUTPUT ONLY IN SPANISH - No English words except brand names. Use natural, conversational Spanish.",
  de: "OUTPUT ONLY IN GERMAN - No English words except brand names. Use natural, conversational German.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      projectName,
      projectDescription,
      projectUrl,
      scrapedContent,
      sectorId,
      styleId,
      toneId,
      scriptType,
      duration,
      detectedLanguage,
      logoUrl,
      videoMode = "standard",
      marketingContext,
    } = body;

    // Detect language from scraped content or use provided
    const language = detectedLanguage || detectLanguage(scrapedContent || projectDescription || projectName);
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en;

    console.log("[generate-video-scenario] Request:", {
      projectName,
      scriptType,
      duration,
      sectorId,
      styleId,
      toneId,
      detectedLanguage: language,
      hasLogo: !!logoUrl,
      videoMode,
      hasMarketingContext: !!marketingContext,
    });

    // Build marketing context block for injection into prompt
    let marketingContextBlock = "";
    if (marketingContext && typeof marketingContext === "object") {
      const mc = marketingContext as any;
      const parts: string[] = [];
      
      if (mc.target_audience?.primary) {
        parts.push(`TARGET AUDIENCE: ${mc.target_audience.primary}`);
      }
      if (mc.target_audience?.pain_points?.length > 0) {
        parts.push(`PAIN POINTS to address: ${mc.target_audience.pain_points.join(", ")}`);
      }
      if (mc.target_audience?.desires?.length > 0) {
        parts.push(`DESIRES to fulfill: ${mc.target_audience.desires.join(", ")}`);
      }
      if (mc.brand_personality?.tone) {
        parts.push(`BRAND TONE: ${mc.brand_personality.tone}`);
      }
      if (mc.products_services?.length > 0) {
        const productsList = mc.products_services
          .slice(0, 5)
          .map((p: any) => `- ${p.name}: ${p.key_benefit}`)
          .join("\n");
        parts.push(`PRODUCTS/SERVICES TO SELL:\n${productsList}`);
      }
      if (mc.competitive_positioning) {
        parts.push(`UNIQUE SELLING POINT: ${mc.competitive_positioning}`);
      }
      
      if (parts.length > 0) {
        marketingContextBlock = `\n\n=== MARKETING CONTEXT (USE THIS TO SELL!) ===\n${parts.join("\n")}\n=== END MARKETING CONTEXT ===\n`;
      }
    }

    // Build context from scenario selections
    const sectorContext = sectorId ? SECTOR_CONTEXT[sectorId] || "" : "";
    const styleContext = styleId ? STYLE_CONTEXT[styleId] || "" : "";
    const toneContext = toneId ? TONE_CONTEXT[toneId] || "" : "";

    // Calculate word count based on duration (2.5 words/second)
    const targetWordCount = Math.round(duration * 2.5);
    const minWords = Math.round(targetWordCount * 0.85);
    const maxWords = Math.round(targetWordCount * 1.15);

    // Build rich project context
    const projectContext = `
PROJECT: ${projectName}
${projectDescription ? `DESCRIPTION: ${projectDescription}` : ""}
${projectUrl ? `WEBSITE: ${projectUrl}` : ""}
${logoUrl ? `BRAND LOGO: ${logoUrl} (Consider incorporating brand logo or branded elements in visual descriptions)` : ""}
${scrapedContent ? `\nWEBSITE CONTENT:\n${scrapedContent.slice(0, 2000)}` : ""}
    `.trim();

    // Build scenario context
    const scenarioContext = [sectorContext, styleContext, toneContext]
      .filter(Boolean)
      .join(". ");

    // Script type specific instructions
    const scriptTypeInstructions: Record<string, string> = {
      short: `Create a viral short-form video script. Hook in first 2 seconds. Fast pace. End with call-to-action.`,
      ad: `Create an AGGRESSIVE ad script with STRICT format:
- Each line MUST have timestamp: [0-1s], [1-3s], [3-5s], etc.
- Maximum 7-8 words per line
- NO marketing jargon
- Direct, punchy, scroll-stopping phrases
- Problem → Agitation → Solution flow`,
      story: `Create an emotional brand story. Focus on journey, values, human connection. Slower pace, deeper emotion.`,
      testimonial: `Create authentic customer testimonial script. Real-sounding language, specific details, genuine enthusiasm.`,
    };

    // ClipMotion-specific instructions
    const clipMotionInstructions = videoMode === "clipmotion" ? `

CLIPMOTION MODE - SOCIAL MEDIA VIRAL OPTIMIZATION:
- Generate SHORT, PUNCHY scenarios optimized for social media virality
- Hook in first 2 seconds (question, shocking stat, or bold statement)
- Maximum 5 scenes, 1-2 seconds each for fast-paced rhythm
- Include text overlay suggestions for each scene (animated typography)
- End with a call-to-action or engagement hook (comment, share, follow)
- Use trending formats: POV, quick tips, hot takes, behind-the-scenes
- Camera movements: zoom ins, pans, shake effects for energy
- Style: TikTok/Reels native aesthetic
- HIGH ENERGY throughout - never static or boring
` : "";

    const systemPrompt = `You are an expert multilingual video scriptwriter creating viral social media content that SELLS.

CRITICAL RULES:
1. ${languageInstruction}
2. Each scenario MUST have timestamped scenes matching the ${duration}s duration
3. Voiceover text MUST be between ${minWords}-${maxWords} words total
4. NO generic marketing clichés - be specific, authentic, relatable
5. Use conversational language that feels real
6. Each scene needs: [timestamp], visual description, voiceover text
7. Each scenario MUST reference a SPECIFIC product/service from this brand
8. Address a REAL pain point or desire of the target audience

💰 SELLING POWER (CRITICAL):
- Every scenario must make the viewer WANT to buy/use the product
- Show the BENEFIT, not just the feature
- Include a clear call-to-action in the final scene
- Hook must address a pain point or desire within 2 seconds
${marketingContextBlock}

${scriptTypeInstructions[scriptType] || scriptTypeInstructions.reel}
${clipMotionInstructions}

SCENARIO CONTEXT: ${scenarioContext || "General business video"}

Generate 3 distinct video scenarios with different angles (problem, benefit, emotion, proof, urgency).

RESPOND WITH VALID JSON ONLY:
{
  "scenarios": [
    {
      "id": "1",
      "title": "Short catchy title",
      "angle": "problem|benefit|emotion|proof|urgency",
      "scenes": [
        {
          "timestamp": "[0-2s]",
          "visual": "Description of what to show",
          "voiceover": "What the narrator says"
        }
      ],
      "fullScript": "Complete voiceover text concatenated",
      "hashtags": ["hashtag1", "hashtag2"],
      "estimatedEngagement": "high|medium|low"
    }
  ]
}`;

    const userMessage = `Create 3 video scenarios for this project:

${projectContext}

Video duration: ${duration} seconds
Script type: ${scriptType}
Target word count: ${minWords}-${maxWords} words`;

    // ── Robust JSON extraction helpers ──────────────────────────────────
    function repairAndParse(json: string): unknown {
      let braces = 0, brackets = 0;
      for (const char of json) {
        if (char === "{") braces++;
        if (char === "}") braces--;
        if (char === "[") brackets++;
        if (char === "]") brackets--;
      }
      let repaired = json
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      while (brackets > 0) { repaired += "]"; brackets--; }
      while (braces > 0) { repaired += "}"; braces--; }
      return JSON.parse(repaired);
    }

    function extractJsonFromResponse(raw: string): unknown {
      // 1. Direct parse
      try { return JSON.parse(raw); } catch { /* fall through */ }

      // 2. Strip markdown code fences (complete or incomplete)
      const stripped = raw
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      try { return JSON.parse(stripped); } catch { /* fall through */ }

      // 3. Find first { to last } 
      const start = stripped.indexOf("{");
      const end = stripped.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const slice = stripped.substring(start, end + 1);
        try { return JSON.parse(slice); } catch { /* fall through */ }
        try { return repairAndParse(slice); } catch { /* fall through */ }
      }

      // 4. Repair whatever we have
      if (start !== -1) {
        try { return repairAndParse(stripped.substring(start)); } catch { /* fall through */ }
      }

      throw new Error("Could not extract valid JSON from AI response");
    }
    // ────────────────────────────────────────────────────────────────────

    // Call OpenRouter API
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    console.log("[generate-video-scenario] Calling OpenRouter API (Gemini Flash)...");

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.45,
        max_tokens: 6000, // was 2000 — caused truncation on long scripts
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[generate-video-scenario] OpenRouter error:", errorText);
      throw new Error(`OpenRouter error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    console.log("[generate-video-scenario] Raw AI response:", rawContent?.substring(0, 500));

    if (!rawContent) {
      throw new Error("Empty AI response");
    }

    // Parse JSON — robust extraction + repair
    let scenarios: GeneratedScenario[];
    try {
      const parsed = extractJsonFromResponse(rawContent) as { scenarios?: GeneratedScenario[] };
      scenarios = parsed.scenarios || [];

      if (!Array.isArray(scenarios) || scenarios.length === 0) {
        throw new Error("No scenarios array in parsed response");
      }
    } catch (parseError) {
      console.error("[generate-video-scenario] JSON parse error:", parseError);
      console.error("[generate-video-scenario] Raw content:", rawContent);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate and clean scenarios
    const validatedScenarios = scenarios.map((scenario, idx) => ({
      id: scenario.id || String(idx + 1),
      title: scenario.title || `Scenario ${idx + 1}`,
      angle: scenario.angle || "benefit",
      scenes: Array.isArray(scenario.scenes) ? scenario.scenes : [],
      fullScript: scenario.fullScript || scenario.scenes?.map((s: ScenarioScene) => s.voiceover).join(" ") || "",
      hashtags: Array.isArray(scenario.hashtags) ? scenario.hashtags : [],
      estimatedEngagement: scenario.estimatedEngagement || "medium",
    }));

    console.log("[generate-video-scenario] Generated", validatedScenarios.length, "scenarios");

    return new Response(
      JSON.stringify({ scenarios: validatedScenarios }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate scenarios";
    console.error("[generate-video-scenario] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
