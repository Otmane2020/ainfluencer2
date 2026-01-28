import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// NanoBanana Pro via CometAPI - multilingual support
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
      scriptType = "reel", // reel, story, ad, testimonial
      duration = 10, // Video duration in seconds
      // Scenario parameters for contextual script generation
      sectorId,
      styleId,
      toneId,
      // Language parameter - CRITICAL for multilingual support
      detectedLanguage,
    } = await req.json();

    // Determine output language
    const language = detectedLanguage || "en";
    const langConfig = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en;
    
    console.log("Generating script for:", projectName, "type:", scriptType, "duration:", duration, "language:", language);

    // ============================================
    // SCENARIO SYSTEM (synced with suggest-content)
    // ============================================
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

    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    if (!COMETAPI_API_KEY) {
      throw new Error("COMETAPI_API_KEY is not configured");
    }

    // Calculate optimal word count based on duration
    // Average speaking rate: ~2.5 words per second
    const wordsPerSecond = 2.5;
    const targetWords = Math.round(duration * wordsPerSecond);
    const minWords = Math.max(10, targetWords - 10);
    const maxWords = targetWords + 15;

    // Script type specific instructions (language-agnostic structure)
    const scriptTypePrompts: Record<string, string> = {
      reel: `Format: Reel/TikTok (vertical)
Duration: ${duration} seconds = ${minWords}-${maxWords} words`,
      story: `Format: Instagram Story
Duration: ${Math.min(duration, 15)} seconds`,
      ad: `Format: Paid Ad (Meta / TikTok Ads)
Each line MUST start with a timestamp [0-1s], [1-3s], etc.
Each phrase = 2 to 6 words MAX. NEVER more than 7 words per phrase!
Brutal, direct tone, no fluff.`,
      testimonial: `Format: Authentic testimonial
Duration: ${duration} seconds
- Human and credible tone`,
    };

    const systemPrompt = `${langConfig.system}

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

    const userPrompt = `Generate 5 different scripts for this project:

PROJECT: ${projectName || "Not specified"}
DESCRIPTION: ${projectDescription || "Not specified"}
${projectUrl ? `WEBSITE: ${projectUrl}` : ""}
${scrapedContent ? `WEBSITE CONTENT (excerpt):\n${scrapedContent.substring(0, 800)}` : ""}
${productName ? `PRODUCT/SERVICE: ${productName}` : ""}

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

    const response = await fetch("https://api.cometapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // NanoBanana routing via CometAPI
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4, // Lower for consistent quality
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CometAPI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`CometAPI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("NanoBanana response received, parsing...");

    // Parse JSON response
    let scripts;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        scripts = parsed.scripts || parsed.suggestions || [];

        // Quality validation
        scripts = scripts.filter((s: { content?: string }) => {
          const text = s.content?.trim() || "";
          
          // Length check (more permissive for ads with timestamps)
          const textWithoutTimestamps = text.replace(/\[\d+[–-]\d+s\]/g, "").trim();
          if (textWithoutTimestamps.length < 30 || textWithoutTimestamps.length > 800) return false;
          
          // For ADS: Check sentence length (max 7 words per sentence)
          if (scriptType === "ad") {
            const lines = text.split(/\n/).filter(Boolean);
            for (const line of lines) {
              const cleanLine = line.replace(/^\[\d+[–-]\d+s\]\s*/, "").trim();
              if (cleanLine) {
                const words = cleanLine.split(/\s+/).filter(Boolean);
                if (words.length > 8) {
                  console.log("ADS script rejected - line too long:", cleanLine, "words:", words.length);
                  return false;
                }
              }
            }
          }
          
          return true;
        });

        // Ensure we have at least some scripts
        if (scripts.length === 0) {
          console.warn("All scripts filtered, using fallbacks");
          scripts = generateFallbackScripts(projectName, productName, language);
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      scripts = generateFallbackScripts(projectName, projectDescription, language);
    }

    console.log("Scripts generated successfully:", scripts.length);

    return new Response(
      JSON.stringify({ 
        scripts,
        model: "nanobanana-pro",
        quality: "premium",
        language: language,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-script-nanobanana:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Multilingual fallback scripts
function generateFallbackScripts(projectName?: string, description?: string, language?: string): Array<{ id: string; title: string; content: string; angle: string }> {
  const name = projectName || (language === "fr" ? "notre solution" : language === "es" ? "nuestra solución" : language === "de" ? "unsere Lösung" : "our solution");
  
  // Return language-appropriate fallbacks
  if (language === "fr") {
    return [
      { id: "1", title: "Le problème que tu connais", content: `Tu perds du temps sur des tâches qui ne rapportent rien ? ${name} automatise ce qui t'ennuie pour que tu puisses te concentrer sur l'essentiel.`, angle: "probleme" },
      { id: "2", title: "Le résultat concret", content: `Moins de stress. Plus de résultats. Voilà ce que nos clients constatent après 30 jours avec ${name}.`, angle: "benefice" },
      { id: "3", title: "Le constat qui fait mal", content: `80% des entreprises perdent des clients faute de réactivité. ${name} répond à ta place, 24h/24.`, angle: "preuve" },
    ];
  } else if (language === "es") {
    return [
      { id: "1", title: "El problema que conoces", content: `¿Pierdes tiempo en tareas que no aportan nada? ${name} automatiza lo aburrido para que puedas concentrarte en lo esencial.`, angle: "problem" },
      { id: "2", title: "El resultado concreto", content: `Menos estrés. Más resultados. Esto es lo que nuestros clientes ven después de 30 días con ${name}.`, angle: "benefit" },
      { id: "3", title: "La realidad que duele", content: `El 80% de las empresas pierden clientes por falta de respuesta. ${name} responde por ti, 24/7.`, angle: "proof" },
    ];
  } else if (language === "de") {
    return [
      { id: "1", title: "Das Problem das du kennst", content: `Verlierst du Zeit mit Aufgaben die nichts bringen? ${name} automatisiert das Langweilige, damit du dich auf das Wesentliche konzentrieren kannst.`, angle: "problem" },
      { id: "2", title: "Das konkrete Ergebnis", content: `Weniger Stress. Mehr Ergebnisse. Das sehen unsere Kunden nach 30 Tagen mit ${name}.`, angle: "benefit" },
      { id: "3", title: "Die harte Realität", content: `80% der Unternehmen verlieren Kunden wegen mangelnder Reaktion. ${name} antwortet für dich, 24/7.`, angle: "proof" },
    ];
  } else {
    // English default
    return [
      { id: "1", title: "The problem you know", content: `Wasting time on tasks that don't pay off? ${name} automates the boring stuff so you can focus on what matters.`, angle: "problem" },
      { id: "2", title: "The concrete result", content: `Less stress. More results. That's what our clients see after 30 days with ${name}.`, angle: "benefit" },
      { id: "3", title: "The hard truth", content: `80% of businesses lose clients due to slow response. ${name} responds for you, 24/7.`, angle: "proof" },
    ];
  }
}
