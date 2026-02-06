import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  validateAndBuildContext, 
  logContextValidation,
  type MarketingContext,
  type GenerationGuardInput 
} from "../_shared/generation-context-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Language instructions for multilingual support
const LANGUAGE_INSTRUCTIONS: Record<string, { system: string; rules: string; tone: string; fallback: string }> = {
  en: {
    system: "You are a professional English copywriter specialized in viral video scripts.",
    rules: `STYLE RULES:
• Language: perfect American English
• ZERO spelling or grammar mistakes
• ZERO emojis
• ZERO generic phrases ("Discover", "Don't wait", "innovative solution")
• ZERO empty marketing jargon ("revolutionary", "unique", "incredible")`,
    tone: `EXPECTED TONE:
- Natural, like talking to a friend
- Direct and no-nonsense
- Concrete with examples and numbers if possible
- Emotional but credible`,
    fallback: "our solution",
  },
  fr: {
    system: "Tu es un copywriter professionnel francophone spécialisé en scripts vidéo viraux.",
    rules: `RÈGLES DE STYLE :
• Langue : français parfait de France (pas belge, pas québécois)
• ZÉRO faute d'orthographe ou de grammaire
• ZÉRO mot anglais (pas de "tips", "boost", "game-changer", etc.)
• ZÉRO emoji
• ZÉRO phrase générique ("Découvrez", "N'attendez plus", "solution innovante")
• ZÉRO jargon marketing vide ("révolutionnaire", "unique", "incroyable")`,
    tone: `TON ATTENDU :
- Naturel, comme si tu parlais à un ami
- Direct et sans blabla
- Concret avec des exemples chiffrés si possible
- Émotionnel mais crédible`,
    fallback: "notre solution",
  },
  es: {
    system: "Eres un copywriter profesional especializado en guiones de video virales en español.",
    rules: `REGLAS DE ESTILO:
• Idioma: español perfecto (España o Latinoamérica neutro)
• CERO errores de ortografía o gramática
• CERO palabras en inglés (excepto marcas)
• CERO emojis
• CERO frases genéricas ("Descubre", "No esperes más", "solución innovadora")
• CERO jerga de marketing vacía ("revolucionario", "único", "increíble")`,
    tone: `TONO ESPERADO:
- Natural, como si hablaras con un amigo
- Directo y sin rodeos
- Concreto con ejemplos y números si es posible
- Emocional pero creíble`,
    fallback: "nuestra solución",
  },
  de: {
    system: "Du bist ein professioneller deutschsprachiger Copywriter, spezialisiert auf virale Videoskripte.",
    rules: `STILREGELN:
• Sprache: perfektes Hochdeutsch
• NULL Rechtschreib- oder Grammatikfehler
• NULL englische Wörter (außer Markennamen)
• NULL Emojis
• NULL generische Phrasen ("Entdecken Sie", "Warten Sie nicht", "innovative Lösung")
• NULL leeres Marketing-Jargon ("revolutionär", "einzigartig", "unglaublich")`,
    tone: `ERWARTETER TON:
- Natürlich, wie ein Gespräch mit einem Freund
- Direkt und ohne Umschweife
- Konkret mit Beispielen und Zahlen wenn möglich
- Emotional aber glaubwürdig`,
    fallback: "unsere Lösung",
  },
  it: {
    system: "Sei un copywriter professionista italiano specializzato in script video virali.",
    rules: `REGOLE DI STILE:
• Lingua: italiano perfetto
• ZERO errori di ortografia o grammatica
• ZERO parole inglesi (tranne nomi di brand)
• ZERO emoji
• ZERO frasi generiche ("Scopri", "Non aspettare", "soluzione innovativa")
• ZERO gergo marketing vuoto ("rivoluzionario", "unico", "incredibile")`,
    tone: `TONO ATTESO:
- Naturale, come parlare con un amico
- Diretto e senza fronzoli
- Concreto con esempi e numeri se possibile
- Emotivo ma credibile`,
    fallback: "la nostra soluzione",
  },
  pt: {
    system: "Você é um copywriter profissional especializado em roteiros de vídeo virais em português.",
    rules: `REGRAS DE ESTILO:
• Idioma: português perfeito (Brasil ou Portugal)
• ZERO erros de ortografia ou gramática
• ZERO palavras em inglês (exceto marcas)
• ZERO emojis
• ZERO frases genéricas ("Descubra", "Não espere", "solução inovadora")
• ZERO jargão de marketing vazio ("revolucionário", "único", "incrível")`,
    tone: `TOM ESPERADO:
- Natural, como se estivesse falando com um amigo
- Direto e sem rodeios
- Concreto com exemplos e números se possível
- Emocional mas credível`,
    fallback: "nossa solução",
  },
};

// Scenario system
interface Sector { id: string; name: string; visualContext: string; }
interface VideoStyle { id: string; name: string; visualInstructions: string; }
interface EmotionalTone { id: string; name: string; atmosphereNotes: string; }

const BUSINESS_SECTORS: Sector[] = [
  { id: "restaurant", name: "Restaurant", visualContext: "busy restaurant kitchen, food preparation, satisfied diners, chef at work" },
  { id: "boutique", name: "Boutique", visualContext: "elegant retail space, product displays, shopping experience, customer service" },
  { id: "real-estate", name: "Real Estate", visualContext: "property tours, modern interiors, house keys handover, happy homeowners" },
  { id: "medical", name: "Doctor/Clinic", visualContext: "clean medical office, patient consultation, modern healthcare equipment, trust" },
  { id: "hotel", name: "Hotel", visualContext: "luxury lobby, comfortable rooms, hospitality service, guest experience" },
  { id: "fitness", name: "Fitness/Gym", visualContext: "modern gym equipment, workout sessions, transformation results, motivation" },
  { id: "beauty", name: "Beauty Salon", visualContext: "relaxing spa environment, beauty treatments, before/after transformations" },
  { id: "auto", name: "Auto/Garage", visualContext: "car dealership or garage, vehicle showcase, automotive expertise, professional car care" },
  { id: "tech", name: "Tech/Startup", visualContext: "sleek interfaces, productivity gains, dashboard analytics, digital transformation" },
  { id: "education", name: "Education", visualContext: "learning environment, student success, knowledge sharing, courses" },
  { id: "agency", name: "Agency", visualContext: "creative workspace, campaign results, team collaboration, growth charts" },
  { id: "ecommerce", name: "E-commerce", visualContext: "product unboxing, fast delivery, happy customers, shopping cart" },
];

const VIDEO_STYLES: VideoStyle[] = [
  { id: "testimonial", name: "Testimonial", visualInstructions: "authentic customer speaking directly to camera, genuine emotion, real results shared" },
  { id: "product-demo", name: "Product Demo", visualInstructions: "clear product showcase, step-by-step usage, feature highlights, smooth transitions" },
  { id: "before-after", name: "Before/After", visualInstructions: "dramatic split screen or transition, clear transformation, compelling comparison" },
  { id: "tutorial", name: "Tutorial", visualInstructions: "educational step-by-step, clear instructions, helpful tips, easy to follow" },
  { id: "behind-scenes", name: "Behind the Scenes", visualInstructions: "raw smartphone footage, authentic handheld feel, relatable creator, casual setting" },
  { id: "story", name: "Brand Story", visualInstructions: "brand storytelling, company journey, founder story, mission and values" },
  { id: "lifestyle", name: "Lifestyle", visualInstructions: "lifestyle content, aspirational visuals, product in daily life, aesthetic scenes" },
  { id: "ugc", name: "UGC Style", visualInstructions: "user-generated content style, casual phone recording, authentic and raw, relatable content" },
];

const EMOTIONAL_TONES: EmotionalTone[] = [
  { id: "urgent", name: "Urgent", atmosphereNotes: "fast tempo, bold text overlays, countdown feeling, don't miss out energy" },
  { id: "inspiring", name: "Inspiring", atmosphereNotes: "uplifting music vibe, success stories, motivational, aspirational visuals" },
  { id: "reassuring", name: "Reassuring", atmosphereNotes: "calm and confident, trust-building, professional yet warm, reliable feeling" },
  { id: "dynamic", name: "Dynamic", atmosphereNotes: "high energy, action-packed, exciting transitions, vibrant colors" },
  { id: "professional", name: "Professional", atmosphereNotes: "corporate polish, clean aesthetics, authoritative, business-focused" },
  { id: "playful", name: "Playful", atmosphereNotes: "fun and light, humor elements, bright colors, entertaining" },
  { id: "luxurious", name: "Luxurious", atmosphereNotes: "premium feel, elegant details, sophisticated, exclusive atmosphere" },
  { id: "authentic", name: "Authentic", atmosphereNotes: "raw and real, unfiltered moments, genuine connections, behind-the-scenes" },
];

// Safe JSON parsing
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

// Multilingual fallback scripts
function generateFallbackScripts(projectName?: string, description?: string, language?: string): Array<{ id: string; title: string; content: string; angle: string }> {
  const name = projectName || (language === "fr" ? "notre solution" : language === "es" ? "nuestra solución" : language === "de" ? "unsere Lösung" : "our solution");
  
  if (language === "fr") {
    return [
      { id: "1", title: "Le problème que tu connais", content: `Tu perds du temps sur des tâches qui ne rapportent rien ? ${name} automatise ce qui t'ennuie pour que tu puisses te concentrer sur l'essentiel.`, angle: "probleme" },
      { id: "2", title: "Le résultat concret", content: `Moins de stress. Plus de résultats. Voilà ce que nos clients constatent après 30 jours avec ${name}.`, angle: "benefice" },
      { id: "3", title: "Le constat qui fait mal", content: `80% des entreprises perdent des clients faute de réactivité. ${name} répond à ta place, 24h/24.`, angle: "preuve" },
    ];
  } else if (language === "es") {
    return [
      { id: "1", title: "El problema que conoces", content: `¿Pierdes tiempo en tareas que no generan ingresos? ${name} automatiza lo que te aburre para que puedas enfocarte en lo esencial.`, angle: "problema" },
      { id: "2", title: "El resultado concreto", content: `Menos estrés. Más resultados. Esto es lo que nuestros clientes experimentan después de 30 días con ${name}.`, angle: "beneficio" },
      { id: "3", title: "La realidad que duele", content: `80% de las empresas pierden clientes por falta de respuesta rápida. ${name} responde por ti, 24/7.`, angle: "prueba" },
    ];
  } else if (language === "de") {
    return [
      { id: "1", title: "Das Problem, das du kennst", content: `Verschwendest du Zeit mit Aufgaben, die nichts einbringen? ${name} automatisiert das Langweilige, damit du dich auf das Wesentliche konzentrieren kannst.`, angle: "problem" },
      { id: "2", title: "Das konkrete Ergebnis", content: `Weniger Stress. Mehr Ergebnisse. Das erleben unsere Kunden nach 30 Tagen mit ${name}.`, angle: "vorteil" },
      { id: "3", title: "Die schmerzhafte Erkenntnis", content: `80% der Unternehmen verlieren Kunden wegen mangelnder Reaktionsgeschwindigkeit. ${name} antwortet für dich, rund um die Uhr.`, angle: "beweis" },
    ];
  }
  
  // Default English
  return [
    { id: "1", title: "The problem you know", content: `Wasting time on tasks that don't generate revenue? ${name} automates the boring stuff so you can focus on what matters.`, angle: "problem" },
    { id: "2", title: "The concrete result", content: `Less stress. More results. That's what our customers experience after 30 days with ${name}.`, angle: "benefit" },
    { id: "3", title: "The painful reality", content: `80% of businesses lose customers due to slow response times. ${name} responds for you, 24/7.`, angle: "proof" },
  ];
}

// Main handler - Using Lovable AI (Gemini)
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      projectName,
      projectDescription,
      projectUrl,
      scrapedContent,
      productName,
      scriptType = "reel",
      duration = 10,
      sectorId,
      styleId,
      toneId,
      detectedLanguage,
      marketingContext, // NEW: Accept marketing context
    } = await req.json();

    // Validate script type
    if (!["reel", "story", "ad", "testimonial"].includes(scriptType)) {
      return new Response(
        JSON.stringify({ error: "Invalid scriptType. Must be: reel, story, ad, testimonial" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const language = detectedLanguage || "en";
    const langConfig = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en;
    
    console.log("[generate-script] Project:", projectName, "| Type:", scriptType, "| Duration:", duration, "s | Lang:", language);

    // Build scenario context
    const buildScenarioContext = (): string => {
      const parts: string[] = [];
      const sector = BUSINESS_SECTORS.find(s => s.id === sectorId);
      const style = VIDEO_STYLES.find(s => s.id === styleId);
      const tone = EMOTIONAL_TONES.find(t => t.id === toneId);

      if (sector || style || tone) {
        parts.push("\n--- SCENARIO CONTEXT ---");
        if (sector) {
          parts.push(`BUSINESS SECTOR: ${sector.name}`);
          parts.push(`Visual elements: ${sector.visualContext}`);
        }
        if (style) {
          parts.push(`VIDEO STYLE: ${style.name}`);
          parts.push(`Production direction: ${style.visualInstructions}`);
        }
        if (tone) {
          parts.push(`EMOTIONAL TONE: ${tone.name}`);
          parts.push(`Atmosphere: ${tone.atmosphereNotes}`);
        }
        parts.push("--- END SCENARIO ---\n");
      }
      return parts.join("\n");
    };

    const scenarioContext = buildScenarioContext();

    // ============================================
    // GENERATION CONTEXT GUARD - Build enhanced context
    // ============================================
    const guardInput: GenerationGuardInput = {
      projectName: projectName,
      projectDescription: projectDescription,
      projectUrl: projectUrl,
      detectedLanguage: language,
      marketingContext: marketingContext as MarketingContext || null,
      scrapedMarkdown: scrapedContent,
      generationPrompt: `Script for ${productName || projectName || "brand"}`,
      generationType: "script",
    };
    
    const contextGuard = validateAndBuildContext(guardInput);
    logContextValidation(contextGuard, "ScriptGeneration");
    
    // Use brand context in prompts
    const brandContextBlock = contextGuard.brandContext;
    console.log(`[Script] Context Score: ${contextGuard.contextScore}/100`);

    // ============================================
    // USE OPENROUTER API (Gemini) for script generation
    // ============================================
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Calculate optimal word count based on duration (~2.5 words/second)
    const wordsPerSecond = 2.5;
    const targetWords = Math.round(duration * wordsPerSecond);
    const minWords = Math.max(10, targetWords - 10);
    const maxWords = targetWords + 15;

    // Script type specific instructions
    const scriptTypePrompts: Record<string, string> = {
      reel: `Format: Reel/TikTok (vertical 9:16)
Duration: ${duration} seconds = ${minWords}-${maxWords} words
Hook in first 2 seconds. Fast pace. End with call-to-action.`,
      story: `Format: Instagram Story
Duration: ${Math.min(duration, 15)} seconds
Casual, intimate tone. Quick, punchy delivery.`,
      ad: `Format: Paid Ad (Meta / TikTok Ads)
Each line MUST start with a timestamp [0-1s], [1-3s], etc.
Each phrase = 2 to 6 words MAX. NEVER more than 7 words per phrase!
Brutal, direct tone, no fluff. Problem → Agitation → Solution flow.`,
      testimonial: `Format: Authentic testimonial
Duration: ${duration} seconds
Human and credible tone. Specific details and real results.`,
    };

    // Build system prompt with brand context
    const systemPrompt = `${langConfig.system}

${brandContextBlock}

⚠️ RULE #1 MOST IMPORTANT - SCRIPT LENGTH:
The script MUST contain between ${minWords} and ${maxWords} words for a ${duration} second duration.
A script too short = failed video. COUNT YOUR WORDS before responding!

⚠️ RULE #2 - LANGUAGE:
OUTPUT ONLY IN ${language.toUpperCase()}. NO other languages except brand names!

${langConfig.rules}
${scenarioContext}
${scriptTypePrompts[scriptType] || scriptTypePrompts.reel}

${langConfig.tone}

FINAL REMINDER: Each script MUST be ${minWords}-${maxWords} words for ${duration} seconds of video!`;

    const userPrompt = `Generate 5 different scripts for this project.
${productName ? `Focus on promoting: ${productName}` : ""}

Respond ONLY with valid JSON:
{
  "scripts": [
    {
      "id": "1",
      "title": "Short title (max 40 characters)",
      "content": "The complete script",
      "angle": "problem|benefit|emotion|proof|urgency"
    }
  ]
}`;

    // Call OpenRouter API
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
        temperature: 0.35,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("[generate-script] Lovable AI error:", status, errorText.slice(0, 200));
      
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
      
      throw new Error(`Lovable AI error: ${status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("[generate-script] Response received, parsing...");

    // Parse JSON response with safe parser
    let scripts;
    try {
      const parsed = safeParseJSON<{ scripts: any[] }>(content);
      if (parsed?.scripts && Array.isArray(parsed.scripts)) {
        scripts = parsed.scripts;
      } else {
        throw new Error("Invalid scripts structure");
      }
    } catch (parseError) {
      console.warn("[generate-script] JSON parse failed, using fallback scripts");
      scripts = generateFallbackScripts(projectName, projectDescription, language);
    }

    // Validate and clean scripts
    scripts = scripts.map((s: any, i: number) => ({
      id: s.id || String(i + 1),
      title: s.title || `Script ${i + 1}`,
      content: s.content || "",
      angle: s.angle || "benefit",
    })).filter((s: any) => s.content && s.content.length > 10);

    if (scripts.length === 0) {
      console.warn("[generate-script] No valid scripts, using fallback");
      scripts = generateFallbackScripts(projectName, projectDescription, language);
    }

    console.log(`[generate-script] Returning ${scripts.length} scripts`);

    return new Response(
      JSON.stringify({ scripts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-script] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Script generation failed",
        scripts: generateFallbackScripts(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});