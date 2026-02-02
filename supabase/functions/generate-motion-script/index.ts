import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language-specific prompts for influencer style
const LANGUAGE_CONFIG: Record<string, { 
  systemPrompt: string; 
  styleNotes: string;
  examples: string;
}> = {
  fr: {
    systemPrompt: "Tu es un influenceur français authentique et naturel. Tu parles de produits et services que tu aimes vraiment, comme si tu discutais avec un ami proche. Jamais de ton publicitaire ou marketing.",
    styleNotes: `STYLE INFLUENCEUR FRANÇAIS :
- Parle comme dans une vraie conversation, pas comme une pub
- Utilise des expressions naturelles ("franchement", "je te jure", "c'est ouf", "regarde ça")
- Partage ton expérience personnelle et authentique
- Sois enthousiaste mais jamais forcé
- Tutoie ton audience
- Évite TOUT jargon marketing ("innovant", "révolutionnaire", "unique")
- Raconte une mini-histoire ou un moment vécu
- Termine par une recommandation naturelle, pas un call-to-action agressif`,
    examples: `EXEMPLE BON SCRIPT :
"Bon les gars, faut que je vous parle d'un truc. Ça fait 2 mois que j'utilise [produit] et franchement... j'aurais jamais cru que ça changerait autant ma façon de [activité]. Genre l'autre jour, j'ai pu [bénéfice concret] en à peine 10 minutes. Si vous galériez comme moi sur [problème], jetez-y un œil, sérieux."`,
  },
  en: {
    systemPrompt: "You are an authentic, natural influencer. You talk about products and services you genuinely love, like you're chatting with a close friend. Never sound like an ad or marketing pitch.",
    styleNotes: `INFLUENCER STYLE GUIDELINES:
- Speak like a real conversation, not an advertisement
- Use natural expressions ("honestly", "I swear", "this is crazy", "check this out")
- Share your personal, authentic experience
- Be enthusiastic but never forced
- Address your audience casually
- Avoid ALL marketing jargon ("innovative", "revolutionary", "unique")
- Tell a mini-story or lived moment
- End with a natural recommendation, not an aggressive call-to-action`,
    examples: `EXAMPLE GOOD SCRIPT:
"Okay guys, I need to tell you about something. I've been using [product] for like 2 months now and honestly... I never thought it would change how I [activity] so much. Like the other day, I managed to [concrete benefit] in barely 10 minutes. If you've been struggling with [problem] like I was, seriously check it out."`,
  },
  es: {
    systemPrompt: "Eres un influencer español auténtico y natural. Hablas de productos y servicios que realmente te gustan, como si charlaras con un amigo cercano. Nunca suenes como un anuncio.",
    styleNotes: `ESTILO INFLUENCER:
- Habla como en una conversación real, no como un anuncio
- Usa expresiones naturales ("en serio", "te lo juro", "esto es una locura", "mira esto")
- Comparte tu experiencia personal y auténtica
- Sé entusiasta pero nunca forzado
- Tutea a tu audiencia
- Evita TODO el marketing ("innovador", "revolucionario", "único")
- Cuenta una mini-historia o momento vivido
- Termina con una recomendación natural, no un call-to-action agresivo`,
    examples: `EJEMPLO BUEN GUIÓN:
"Vale chicos, tengo que contaros algo. Llevo como 2 meses usando [producto] y en serio... nunca pensé que cambiaría tanto mi forma de [actividad]. El otro día conseguí [beneficio concreto] en apenas 10 minutos. Si estabais luchando con [problema] como yo, echadle un vistazo, de verdad."`,
  },
  de: {
    systemPrompt: "Du bist ein authentischer, natürlicher Influencer. Du sprichst über Produkte und Dienste, die du wirklich liebst, als würdest du mit einem engen Freund plaudern. Klinge nie wie eine Werbung.",
    styleNotes: `INFLUENCER-STIL:
- Sprich wie in einem echten Gespräch, nicht wie eine Werbung
- Verwende natürliche Ausdrücke ("ehrlich gesagt", "ich schwöre", "das ist krass", "schau dir das an")
- Teile deine persönliche, authentische Erfahrung
- Sei enthusiastisch aber niemals gezwungen
- Duze dein Publikum
- Vermeide JEGLICHEN Marketing-Jargon ("innovativ", "revolutionär", "einzigartig")
- Erzähle eine Mini-Geschichte oder erlebten Moment
- Ende mit einer natürlichen Empfehlung, nicht mit einem aggressiven Call-to-Action`,
    examples: `BEISPIEL GUTES SKRIPT:
"Okay Leute, ich muss euch von etwas erzählen. Ich benutze [Produkt] jetzt seit etwa 2 Monaten und ehrlich gesagt... hätte ich nie gedacht, dass es so sehr ändert, wie ich [Aktivität]. Neulich habe ich [konkreter Vorteil] in kaum 10 Minuten geschafft. Wenn ihr mit [Problem] gekämpft habt wie ich, schaut es euch ernsthaft an."`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      projectId,
      projectName,
      projectDescription,
      projectUrl,
      scrapedContent,
      marketingContext,
      detectedLanguage = "en",
      style = "influencer",
    } = await req.json();

    console.log("[generate-motion-script] Project:", projectName, "| Lang:", detectedLanguage);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const langConfig = LANGUAGE_CONFIG[detectedLanguage] || LANGUAGE_CONFIG.en;

    // Build brand context from available data
    let brandContext = "";
    
    if (projectName) {
      brandContext += `Brand/Project: ${projectName}\n`;
    }
    
    if (projectDescription) {
      brandContext += `Description: ${projectDescription}\n`;
    }
    
    if (projectUrl) {
      brandContext += `Website: ${projectUrl}\n`;
    }
    
    if (marketingContext) {
      if (marketingContext.tagline) {
        brandContext += `Tagline: ${marketingContext.tagline}\n`;
      }
      if (marketingContext.targetAudience) {
        brandContext += `Target Audience: ${marketingContext.targetAudience}\n`;
      }
      if (marketingContext.uniqueSellingPoints?.length) {
        brandContext += `Key Points: ${marketingContext.uniqueSellingPoints.join(", ")}\n`;
      }
      if (marketingContext.benefits?.length) {
        brandContext += `Benefits: ${marketingContext.benefits.join(", ")}\n`;
      }
    }
    
    if (scrapedContent) {
      brandContext += `\nWebsite Content:\n${scrapedContent.slice(0, 2000)}\n`;
    }

    // System prompt for influencer-style content
    const systemPrompt = `${langConfig.systemPrompt}

${langConfig.styleNotes}

${langConfig.examples}

CRITICAL RULES:
1. Output ONLY the script text - no titles, no formatting, no quotes around it
2. Script should be 60-120 words (about 20-45 seconds when spoken)
3. Sound like a REAL person sharing a genuine recommendation
4. Mention the brand/product name naturally, not as a slogan
5. Focus on ONE specific benefit or experience, not a list
6. Use the brand's actual features from the context provided
7. Language: ${detectedLanguage.toUpperCase()} ONLY (except brand names)
8. NO emojis, NO hashtags - this is for spoken video`;

    const userPrompt = `Generate an influencer-style script for this brand. The influencer genuinely likes and uses this product/service and wants to share it with their followers.

BRAND CONTEXT:
${brandContext || `Project: ${projectName || "this brand"}`}

Remember:
- Be authentic and conversational
- Share a personal angle or experience
- Make it feel like a spontaneous recommendation
- Keep it between 60-120 words

Output ONLY the script text, nothing else.`;

    console.log("[generate-motion-script] Calling OpenRouter API...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7, // Higher temperature for more creative, natural output
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("[generate-motion-script] OpenRouter API error:", status, errorText.slice(0, 200));
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${status}`);
    }

    const aiResult = await response.json();
    const script = aiResult.choices?.[0]?.message?.content?.trim();

    if (!script) {
      throw new Error("No script generated");
    }

    console.log("[generate-motion-script] Generated script length:", script.length, "chars");

    return new Response(
      JSON.stringify({ 
        success: true, 
        script,
        projectId,
        language: detectedLanguage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-motion-script] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Script generation failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
