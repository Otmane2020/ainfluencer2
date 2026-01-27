import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// SCENARIO SYSTEM (synced with generate-script-nanobanana)
// ============================================

interface Sector {
  id: string;
  name: string;
  emoji: string;
  visualContext: string;
}

interface VideoStyle {
  id: string;
  name: string;
  emoji: string;
  visualInstructions: string;
}

interface EmotionalTone {
  id: string;
  name: string;
  emoji: string;
  atmosphereNotes: string;
}

const BUSINESS_SECTORS: Sector[] = [
  { id: "restaurant", name: "Restaurant", emoji: "🍽️", visualContext: "busy restaurant kitchen, food preparation, satisfied diners, chef at work" },
  { id: "boutique", name: "Boutique", emoji: "🛍️", visualContext: "elegant retail space, product displays, shopping experience, customer service" },
  { id: "real_estate", name: "Real Estate", emoji: "🏠", visualContext: "property tours, modern interiors, house keys handover, happy homeowners" },
  { id: "doctor", name: "Medical/Doctor", emoji: "👨‍⚕️", visualContext: "clean medical office, patient consultation, modern healthcare equipment, trust" },
  { id: "hotel", name: "Hotel", emoji: "🏨", visualContext: "luxury lobby, comfortable rooms, hospitality service, guest experience" },
  { id: "fitness", name: "Fitness/Gym", emoji: "💪", visualContext: "modern gym equipment, workout sessions, transformation results, motivation" },
  { id: "beauty", name: "Beauty/Spa", emoji: "💅", visualContext: "relaxing spa environment, beauty treatments, before/after transformations" },
  { id: "tech", name: "Tech/SaaS", emoji: "💻", visualContext: "sleek interfaces, productivity gains, dashboard analytics, digital transformation" },
  { id: "education", name: "Education", emoji: "📚", visualContext: "learning environment, student success, knowledge sharing, courses" },
  { id: "ecommerce", name: "E-commerce", emoji: "📦", visualContext: "product unboxing, fast delivery, happy customers, shopping cart" },
  { id: "agency", name: "Marketing Agency", emoji: "📈", visualContext: "creative workspace, campaign results, team collaboration, growth charts" },
  { id: "artisan", name: "Artisan/Craft", emoji: "🔨", visualContext: "handmade process, craftsmanship details, authentic work, quality materials" },
];

const VIDEO_STYLES: VideoStyle[] = [
  { id: "testimonial", name: "Testimonial", emoji: "🗣️", visualInstructions: "authentic customer speaking directly to camera, genuine emotion, real results shared" },
  { id: "demo", name: "Product Demo", emoji: "📱", visualInstructions: "clear product showcase, step-by-step usage, feature highlights, smooth transitions" },
  { id: "before_after", name: "Before/After", emoji: "🔄", visualInstructions: "dramatic split screen or transition, clear transformation, compelling comparison" },
  { id: "tutorial", name: "Tutorial", emoji: "📖", visualInstructions: "educational step-by-step, clear instructions, helpful tips, easy to follow" },
  { id: "ugc", name: "UGC Style", emoji: "📲", visualInstructions: "raw smartphone footage, authentic handheld feel, relatable creator, casual setting" },
  { id: "cinematic", name: "Cinematic", emoji: "🎬", visualInstructions: "high production value, dramatic lighting, professional color grading, epic feel" },
  { id: "talking_head", name: "Talking Head", emoji: "🎤", visualInstructions: "direct to camera speech, engaging presenter, professional background, confident delivery" },
  { id: "montage", name: "Dynamic Montage", emoji: "⚡", visualInstructions: "fast-paced cuts, energetic rhythm, multiple scenes, visual storytelling" },
];

const EMOTIONAL_TONES: EmotionalTone[] = [
  { id: "urgent", name: "Urgent", emoji: "🔥", atmosphereNotes: "fast tempo, bold text overlays, countdown feeling, don't miss out energy" },
  { id: "inspiring", name: "Inspiring", emoji: "✨", atmosphereNotes: "uplifting music vibe, success stories, motivational, aspirational visuals" },
  { id: "reassuring", name: "Reassuring", emoji: "🤝", atmosphereNotes: "calm and confident, trust-building, professional yet warm, reliable feeling" },
  { id: "dynamic", name: "Dynamic", emoji: "⚡", atmosphereNotes: "high energy, action-packed, exciting transitions, vibrant colors" },
  { id: "professional", name: "Professional", emoji: "💼", atmosphereNotes: "corporate polish, clean aesthetics, authoritative, business-focused" },
  { id: "playful", name: "Playful", emoji: "🎉", atmosphereNotes: "fun and light, humor elements, bright colors, entertaining" },
  { id: "luxurious", name: "Luxurious", emoji: "👑", atmosphereNotes: "premium feel, elegant details, sophisticated, exclusive atmosphere" },
  { id: "authentic", name: "Authentic", emoji: "💚", atmosphereNotes: "raw and real, unfiltered moments, genuine connections, behind-the-scenes" },
];

function buildScenarioPrompt(sectorId?: string, styleId?: string, toneId?: string): string {
  const parts: string[] = [];
  
  const sector = BUSINESS_SECTORS.find(s => s.id === sectorId);
  const style = VIDEO_STYLES.find(s => s.id === styleId);
  const tone = EMOTIONAL_TONES.find(t => t.id === toneId);
  
  if (sector || style || tone) {
    parts.push("\n\n--- CONTEXTE VISUEL / SCÉNARIO ---");
    
    if (sector) {
      parts.push(`SECTEUR D'ACTIVITÉ : ${sector.name}`);
      parts.push(`Éléments visuels recommandés : ${sector.visualContext}`);
    }
    
    if (style) {
      parts.push(`STYLE VIDÉO : ${style.name}`);
      parts.push(`Instructions de réalisation : ${style.visualInstructions}`);
    }
    
    if (tone) {
      parts.push(`TON ÉMOTIONNEL : ${tone.name}`);
      parts.push(`Atmosphère : ${tone.atmosphereNotes}`);
    }
    
    parts.push("--- FIN DU CONTEXTE VISUEL ---\n\n");
  }
  
  return parts.join("\n");
}

// ============================================
// MAIN EDGE FUNCTION
// ============================================

serve(async (req) => {
  // Handle CORS preflight
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
      contentType, // "script" for video scripts, "suggestions" for general content
      productName,
      productCategory,
      // NEW: Scenario parameters (synced with VideoGenerator)
      sectorId,
      styleId,
      toneId,
      scriptType, // reel, story, ad, testimonial
      duration, // Video duration in seconds
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating content for project:", projectName, "type:", contentType, "scenario:", { sectorId, styleId, toneId });

    // Build scenario context
    const scenarioContext = buildScenarioPrompt(sectorId, styleId, toneId);

    // Different prompts based on content type
    let systemPrompt: string;
    let userMessage: string;

    if (contentType === "image_prompt") {
      // ============================================
      // IMAGE PROMPT GENERATION (distinct from video!)
      // ============================================
      const sector = BUSINESS_SECTORS.find(s => s.id === sectorId);
      const style = VIDEO_STYLES.find(s => s.id === styleId);
      const tone = EMOTIONAL_TONES.find(t => t.id === toneId);

      systemPrompt = `You are an expert AI image prompt engineer. Generate a detailed, visual prompt for AI image generation.

CRITICAL RULES:
• Output is a VISUAL DESCRIPTION for an IMAGE, NOT a video script
• NO dialogue, NO voiceover, NO timestamps, NO motion descriptions
• Focus on: composition, colors, lighting, subjects, style, mood
• Be specific about visual elements: "a warm-lit coffee shop with exposed brick walls" not "a nice cafe"
• Include style cues: "professional photography", "minimalist design", "editorial style"

CONTEXT:
- Project: ${projectName || "General"}
- Description: ${projectDescription || "Not specified"}
${projectUrl ? `- Website: ${projectUrl}` : ""}
${scrapedContent ? `- Website content:\n${scrapedContent.substring(0, 1000)}` : ""}
${sector ? `- Business sector: ${sector.name} - Visual elements: ${sector.visualContext}` : ""}
${style ? `- Visual style: ${style.name} - ${style.visualInstructions}` : ""}
${tone ? `- Mood/Tone: ${tone.name} - ${tone.atmosphereNotes}` : ""}
${productName ? `- Product tier: ${productName}` : ""}

PROMPT STRUCTURE:
1. Main subject and setting
2. Lighting and color palette
3. Composition and framing
4. Style and mood keywords
5. Quality enhancers (e.g., "ultra high resolution, professional quality")

EXAMPLE GOOD PROMPTS:
✅ "Modern minimalist coffee shop interior, warm ambient lighting, exposed brick walls, wooden tables with green plants, morning sunlight streaming through large windows, cozy atmosphere, professional interior photography, shallow depth of field"
✅ "Professional headshot of a confident business woman in her 40s, neutral gray background, soft studio lighting, warm smile, corporate attire, high-end portrait photography, sharp focus on eyes"
✅ "Luxury skincare product flatlay, marble surface, gold accents, soft diffused lighting, elegant minimalist composition, premium beauty photography, soft pastel colors"

EXAMPLE BAD PROMPTS (DO NOT DO THIS):
❌ "Découvrez notre café avec une ambiance chaleureuse..." (this is marketing copy, not a visual prompt)
❌ "[0-3s] The camera pans across..." (this is a video script)
❌ "A nice restaurant that serves good food" (too vague)

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Short descriptive title",
      "content": "The detailed image generation prompt in English",
      "contentType": "image",
      "estimatedEngagement": "high"
    }
  ]
}`;

      userMessage = "Generate 5 distinct AI image prompts for this project. Each should describe a different visual concept or angle.";

    } else if (contentType === "script") {
      // Calculate word count based on duration (same logic as generate-script-nanobanana)
      const dur = duration || 10;
      const wordsPerSecond = 2.5;
      const targetWords = Math.round(dur * wordsPerSecond);
      const minWords = Math.max(10, targetWords - 10);
      const maxWords = targetWords + 15;

      // ADS-specific aggressive template
      const isAdsScript = scriptType === "ad";
      const adsInstructions = isAdsScript ? `
🔥 FORMAT OBLIGATOIRE POUR LES ADS :
Chaque ligne DOIT commencer par un timestamp [0–1s], [1–3s], etc.
Chaque phrase = 2 à 6 mots MAX. JAMAIS plus de 7 mots par phrase !
Ton brutal, direct, sans fioritures.

EXEMPLE EXACT À SUIVRE :
[0–1s] Tu perds de l'argent.
[1–3s] Tous les jours.
[3–5s] À cause de Google.
[5–7s] Avis sans réponse.
[7–9s] Les clients partent.
` : "";

      // ULTRA-STRICT PROMPT for video scripts (synced with generate-script-nanobanana)
      systemPrompt = `Tu es un copywriter professionnel francophone spécialisé en scripts vidéo viraux.

⚠️ RÈGLE #1 LA PLUS IMPORTANTE - LONGUEUR DU SCRIPT :
Le script DOIT contenir entre ${minWords} et ${maxWords} mots pour une durée de ${dur} secondes.
Un script trop court = vidéo ratée. COMPTE TES MOTS avant de répondre !
${adsInstructions}
RÈGLES DE STYLE :
• Langue : français parfait de France (pas belge, pas québécois)
• ZÉRO faute d'orthographe ou de grammaire
• ZÉRO mot anglais (pas de "tips", "boost", "game-changer", etc.)
• ZÉRO emoji
• ZÉRO phrase générique ("Découvrez", "N'attendez plus", "solution innovante")
• ZÉRO jargon marketing vide ("révolutionnaire", "unique", "incroyable")
${scenarioContext}
CONTEXTE DU PROJET :
Nom : ${projectName || "Non spécifié"}
Description : ${projectDescription || "Non spécifiée"}
${projectUrl ? `Site web : ${projectUrl}` : ""}
${scrapedContent ? `Contenu du site :\n${scrapedContent.substring(0, 1500)}` : ""}
${productName ? `Produit/Service ciblé : ${productName}` : ""}
${productCategory ? `Type de contenu : ${productCategory}` : ""}

TON ATTENDU :
- Naturel, comme si tu parlais à un ami
- Direct et sans blabla
- Concret avec des exemples chiffrés si possible
- Émotionnel mais crédible

EXEMPLES DE BON STYLE (à adapter selon la durée) :
✅ "Tu perds 3h par semaine à répondre aux mêmes questions ? Cette automatisation fait le travail pendant que tu dors."
✅ "Un client mécontent coûte 5 fois plus cher qu'un client fidélisé. Voilà pourquoi j'ai créé ça."
✅ "J'ai testé 12 outils avant de trouver celui-ci. Résultat : 40% de temps gagné."

EXEMPLES DE MAUVAIS STYLE :
❌ "Découvrez notre solution innovante qui révolutionne votre quotidien..."
❌ "N'attendez plus pour booster votre business !"
❌ "Cette méthode unique va transformer votre vie..."

Tu dois générer 5 scripts différents, variés en angle et en ton.

RAPPEL FINAL : Chaque script DOIT faire ${minWords}-${maxWords} mots pour ${dur} secondes de vidéo !${isAdsScript ? "\n⚠️ FORMAT ADS : Timestamps obligatoires + phrases de 2-6 mots MAX !" : ""}

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide, sans markdown ni explication :
{
  "suggestions": [
    {
      "id": "1",
      "title": "Titre court (max 50 car)",
      "content": "Le script complet en français parfait",
      "contentType": "video",
      "angle": "probleme|benefice|emotion|preuve|urgence",
      "estimatedEngagement": "high",
      "hashtags": ["mot1", "mot2", "mot3"]
    }
  ]
}`;

      userMessage = "Génère 5 scripts vidéo courts et percutants pour ce projet.";

    } else {
      // Standard prompt for general content suggestions
      systemPrompt = `Tu es un expert en création de contenu pour les réseaux sociaux.

LANGUE : Français parfait uniquement. Pas d'anglicismes, pas de fautes.
${scenarioContext}
CONTEXTE :
- Projet : ${projectName || "Non spécifié"}
- Description : ${projectDescription || "Non spécifiée"}
${projectUrl ? `- URL : ${projectUrl}` : ""}
${scrapedContent ? `- Contenu du site :\n${scrapedContent.substring(0, 1500)}` : ""}

OBJECTIF : Générer 5 idées de contenu créatives et engageantes.

Pour chaque suggestion :
1. Titre accrocheur (max 60 caractères)
2. Contenu/script détaillé en français impeccable
3. Type : "video", "image" ou "text"
4. Potentiel d'engagement : "high", "medium" ou "low"
5. 5-8 hashtags pertinents (sans le #)

Réponds UNIQUEMENT avec un JSON valide :
{
  "suggestions": [
    {
      "id": "1",
      "title": "Titre",
      "content": "Contenu détaillé...",
      "contentType": "video",
      "estimatedEngagement": "high",
      "hashtags": ["hashtag1", "hashtag2"]
    }
  ]
}`;

      userMessage = "Génère 5 suggestions de contenu pour ce projet.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: contentType === "image_prompt" ? 0.7 : 0.4, // Higher creativity for images
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the AI response
    let suggestions;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || parsed;
        
        // Quality filter: validate each suggestion (same logic as nanobanana)
        suggestions = suggestions.filter((s: { content?: string }) => {
          const text = s.content?.trim() || "";
          
          // Length check (more permissive for ads with timestamps)
          const textWithoutTimestamps = text.replace(/\[\d+[–-]\d+s\]/g, "").trim();
          if (textWithoutTimestamps.length < 30 || textWithoutTimestamps.length > 800) return false;
          
          // English words check (strict)
          const englishWords = /\b(discover|our|solution|innovative|boost|game-changer|tips|hack|amazing|incredible|unique|transform|revolutionary)\b/gi;
          if ((text.match(englishWords) || []).length > 0) return false;
          
          // Generic French marketing phrases check
          const genericPhrases = [
            "découvrez notre",
            "n'attendez plus",
            "solution innovante",
            "révolutionnaire",
            "unique en son genre",
            "va changer votre vie",
            "ne manquez pas",
          ];
          const lowerText = text.toLowerCase();
          if (genericPhrases.some(phrase => lowerText.includes(phrase))) return false;
          
          // For ADS: Check sentence length (max 7 words per sentence)
          if (scriptType === "ad") {
            const lines = text.split(/\n/).filter(Boolean);
            for (const line of lines) {
              const cleanLine = line.replace(/^\[\d+[–-]\d+s\]\s*/, "").trim();
              if (cleanLine) {
                const words = cleanLine.split(/\s+/).filter(Boolean);
                if (words.length > 8) {
                  console.log("ADS script rejected - line too long:", cleanLine);
                  return false;
                }
              }
            }
          }
          
          return true;
        });

        // If all were filtered out, use fallbacks
        if (suggestions.length === 0) {
          throw new Error("All suggestions filtered for quality");
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Fallback suggestions in perfect French
      suggestions = [
        {
          id: "1",
          title: "L'histoire derrière la marque",
          content: `${projectName || "Notre marque"} est née d'une conviction simple : faire mieux, pas plus. Chaque détail compte. Chaque client aussi.`,
          contentType: "video",
          angle: "emotion",
          estimatedEngagement: "high",
          hashtags: ["authenticite", "marque", "histoire"],
        },
        {
          id: "2", 
          title: "Le problème que vous connaissez",
          content: `Vous perdez du temps sur des tâches répétitives ? ${projectName || "Cette solution"} automatise l'essentiel pour que vous puissiez vous concentrer sur ce qui compte vraiment.`,
          contentType: "video",
          angle: "probleme",
          estimatedEngagement: "high",
          hashtags: ["productivite", "automatisation", "efficacite"],
        },
        {
          id: "3",
          title: "Résultat concret",
          content: `Moins de stress. Plus de résultats. Voilà ce que nos clients disent après 30 jours avec ${projectName || "nous"}.`,
          contentType: "video",
          angle: "benefice",
          estimatedEngagement: "medium",
          hashtags: ["resultats", "temoignage", "confiance"],
        },
        {
          id: "4",
          title: "La question qui pique",
          content: `Combien de clients as-tu perdus ce mois-ci sans le savoir ? ${projectName || "Notre solution"} te donne les réponses.`,
          contentType: "video",
          angle: "emotion",
          estimatedEngagement: "high",
          hashtags: ["clients", "analyse", "performance"],
        },
        {
          id: "5",
          title: "L'action immédiate",
          content: `Une semaine. C'est tout ce qu'il te faut pour voir la différence avec ${projectName || "notre solution"}. Prêt à essayer ?`,
          contentType: "video",
          angle: "urgence",
          estimatedEngagement: "high",
          hashtags: ["action", "defi", "transformation"],
        },
      ];
    }

    console.log("Suggestions generated successfully:", suggestions.length);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in suggest-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
