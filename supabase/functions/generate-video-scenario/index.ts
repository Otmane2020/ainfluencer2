import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  scriptType: "reel" | "ad" | "story" | "testimonial";
  duration: number;
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
    } = body;

    console.log("[generate-video-scenario] Request:", {
      projectName,
      scriptType,
      duration,
      sectorId,
      styleId,
      toneId,
    });

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
${scrapedContent ? `\nWEBSITE CONTENT:\n${scrapedContent.slice(0, 2000)}` : ""}
    `.trim();

    // Build scenario context
    const scenarioContext = [sectorContext, styleContext, toneContext]
      .filter(Boolean)
      .join(". ");

    // Script type specific instructions
    const scriptTypeInstructions: Record<string, string> = {
      reel: `Create a viral short-form video script. Hook in first 2 seconds. Fast pace. End with call-to-action.`,
      ad: `Create an AGGRESSIVE ad script with STRICT format:
- Each line MUST have timestamp: [0-1s], [1-3s], [3-5s], etc.
- Maximum 7-8 words per line
- NO marketing jargon (no "découvrez", "solution", "innovant")
- Direct, punchy, scroll-stopping phrases
- Problem → Agitation → Solution flow`,
      story: `Create an emotional brand story. Focus on journey, values, human connection. Slower pace, deeper emotion.`,
      testimonial: `Create authentic customer testimonial script. Real-sounding language, specific details, genuine enthusiasm.`,
    };

    const systemPrompt = `You are an expert French video scriptwriter creating viral social media content.

CRITICAL RULES:
1. OUTPUT ONLY IN FRENCH - No English words except brand names
2. Each scenario MUST have timestamped scenes matching the ${duration}s duration
3. Voiceover text MUST be between ${minWords}-${maxWords} words total
4. NO generic marketing phrases: "découvrez", "n'attendez plus", "solution innovante", "révolutionnaire"
5. Use conversational, authentic language that feels real and relatable
6. Each scene needs: [timestamp], visual description, voiceover text

${scriptTypeInstructions[scriptType] || scriptTypeInstructions.reel}

SCENARIO CONTEXT: ${scenarioContext || "General business video"}

Generate 3 distinct video scenarios with different angles (problem, benefit, emotion, proof, urgency).

RESPOND WITH VALID JSON ONLY:
{
  "scenarios": [
    {
      "id": "1",
      "title": "Short catchy title in French",
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

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Missing LOVABLE_API_KEY");
    }

    console.log("[generate-video-scenario] Calling Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[generate-video-scenario] AI error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    console.log("[generate-video-scenario] Raw AI response:", rawContent?.substring(0, 500));

    if (!rawContent) {
      throw new Error("Empty AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let scenarios: GeneratedScenario[];
    try {
      let jsonStr = rawContent;
      
      // Remove markdown code blocks if present
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      scenarios = parsed.scenarios;

      if (!Array.isArray(scenarios) || scenarios.length === 0) {
        throw new Error("No scenarios in response");
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
