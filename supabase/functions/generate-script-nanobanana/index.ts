import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NanoBanana Pro via CometAPI - optimized for French copywriting
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
    } = await req.json();

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

    console.log("Generating script for:", projectName, "type:", scriptType, "duration:", duration);

    // Calculate optimal word count based on duration
    // Average speaking rate: ~2.5 words per second
    const wordsPerSecond = 2.5;
    const targetWords = Math.round(duration * wordsPerSecond);
    const minWords = Math.max(10, targetWords - 10);
    const maxWords = targetWords + 15;

    // AGGRESSIVE ADS TEMPLATE - Ultra short sentences with timestamps
    const generateAggressiveAdTemplate = (dur: number): string => {
      if (dur <= 10) {
        return `[0–1s] Phrase choc (max 4 mots)
[1–3s] Accusation directe
[3–5s] Solution (nom produit)
[5–7s] Résultat chiffré
[7–${dur}s] CTA brutal`;
      } else if (dur <= 20) {
        return `[0–1s] Phrase choc (max 4 mots)
[1–3s] Accusation directe
[3–5s] Cause claire
[5–7s] Conséquence business
[7–9s] Rupture / ordre
[9–12s] Solution (nom du produit)
[12–14s] Actions automatisées (liste courte)
[14–16s] Résultat chiffré
[16–18s] Émotion / soulagement
[18–${dur}s] CTA brutal`;
      } else {
        return `[0–2s] Phrase choc violente
[2–5s] Accusation directe
[5–8s] Développement problème
[8–12s] Conséquence business
[12–15s] Rupture / solution
[15–20s] Fonctionnalités clés
[20–25s] Résultats chiffrés
[25–28s] Émotion / témoignage
[28–${dur}s] CTA brutal`;
      }
    };

    // Generate timing segments based on duration (for non-ads)
    const generateTimingTemplate = (dur: number): string => {
      if (dur <= 5) {
        return `[0-${dur}s] Hook + Message complet`;
      } else if (dur <= 10) {
        return `[0-2s] Hook accrocheur
[2-${Math.floor(dur * 0.6)}s] Problème ou bénéfice
[${Math.floor(dur * 0.6)}-${dur}s] Solution + CTA`;
      } else if (dur <= 20) {
        return `[0-3s] Hook accrocheur (question ou stat choc)
[3-7s] Problème identifié (douleur du client)
[7-13s] Solution présentée (ton produit/service)
[13-17s] Bénéfice concret (chiffres, résultats)
[17-${dur}s] Call-to-action (invitation à agir)`;
      } else {
        return `[0-3s] Hook viral (question choc ou stat)
[3-8s] Contexte et problème
[8-15s] Solution détaillée
[15-22s] Preuves et bénéfices
[22-${dur}s] Call-to-action émotionnel`;
      }
    };

    // Duration-based instructions
    const getDurationInstructions = (dur: number): string => {
      const timingTemplate = generateTimingTemplate(dur);
      
      if (dur <= 5) {
        return `⚠️ DURÉE : ${dur} secondes = ${minWords}-${maxWords} mots
STRUCTURE OBLIGATOIRE :
${timingTemplate}`;
      } else if (dur <= 10) {
        return `⚠️ DURÉE : ${dur} secondes = ${minWords}-${maxWords} mots
STRUCTURE OBLIGATOIRE (avec timestamps) :
${timingTemplate}`;
      } else if (dur <= 20) {
        return `⚠️ DURÉE : ${dur} secondes = ${minWords}-${maxWords} mots
STRUCTURE OBLIGATOIRE (avec timestamps précis) :
${timingTemplate}

Chaque segment DOIT contenir 1-2 phrases. Le script final doit couvrir TOUS les segments.`;
      } else {
        return `⚠️ DURÉE : ${dur} secondes = ${minWords}-${maxWords} mots
STRUCTURE OBLIGATOIRE (avec timestamps) :
${timingTemplate}

Chaque segment DOIT être développé. Storytelling complet.`;
      }
    };

    // Script type specific instructions
    const scriptTypePrompts: Record<string, string> = {
      reel: `Format : Reel/TikTok (vertical)
${getDurationInstructions(duration)}`,
      story: `Format : Story Instagram
${getDurationInstructions(Math.min(duration, 15))}`,
      ad: `Format : Publicité PAYANTE (Meta / TikTok Ads)

${generateAggressiveAdTemplate(duration)}

RÈGLES ABSOLUES ADS :
- Chaque segment = 1 phrase MAX
- Chaque phrase = 2 à 6 mots MAX (JAMAIS plus de 7 mots)
- Phrases TRÈS courtes, percutantes
- Ton direct, presque brutal
- Aucune phrase explicative longue
- Impact > politesse
- ZÉRO mot de liaison inutile

EXEMPLE DE SCRIPT ADS PARFAIT :
[0–1s] Tu perds de l'argent.
[1–3s] Tous les jours.
[3–5s] À cause de Google.
[5–7s] Avis sans réponse.
[7–9s] Les clients partent.
[9–12s] Starlinko agit pour toi.
[12–14s] Avis. Posts. Questions.
[14–16s] 30 % de temps gagné.
[16–18s] Moins de pression.
[18–20s] Starlinko. Réagis.`,
      testimonial: `Format : Témoignage authentique
${getDurationInstructions(duration)}
- Ton humain et crédible`,
    };

    // Ads-specific system prompt rules
    const adsRules = scriptType === "ad" ? `

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

    const systemPrompt = `Tu es un copywriter professionnel francophone spécialisé en scripts vidéo viraux.

⚠️ RÈGLE #1 LA PLUS IMPORTANTE - LONGUEUR DU SCRIPT :
Le script DOIT contenir entre ${minWords} et ${maxWords} mots pour une durée de ${duration} secondes.
Un script trop court = vidéo ratée. COMPTE TES MOTS avant de répondre !
${adsRules}
RÈGLES DE STYLE :
• Langue : français parfait de France (pas belge, pas québécois)
• ZÉRO faute d'orthographe ou de grammaire
• ZÉRO mot anglais (pas de "tips", "boost", "game-changer", etc.)
• ZÉRO emoji
• ZÉRO phrase générique ("Découvrez", "N'attendez plus", "solution innovante")
• ZÉRO jargon marketing vide ("révolutionnaire", "unique", "incroyable")
${scenarioContext}
${scriptTypePrompts[scriptType] || scriptTypePrompts.reel}

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

RAPPEL FINAL : Chaque script DOIT faire ${minWords}-${maxWords} mots pour ${duration} secondes de vidéo !${scriptType === "ad" ? "\n⚠️ FORMAT ADS : Timestamps obligatoires + phrases de 2-6 mots MAX !" : ""}`;

    const userPrompt = `Génère 5 scripts différents pour ce projet :

PROJET : ${projectName || "Non spécifié"}
DESCRIPTION : ${projectDescription || "Non spécifiée"}
${projectUrl ? `SITE WEB : ${projectUrl}` : ""}
${scrapedContent ? `CONTENU DU SITE (extrait) :\n${scrapedContent.substring(0, 800)}` : ""}
${productName ? `PRODUIT/SERVICE : ${productName}` : ""}

Réponds UNIQUEMENT avec un JSON valide :
{
  "scripts": [
    {
      "id": "1",
      "title": "Titre court (max 40 caractères)",
      "content": "Le script complet",
      "angle": "probleme|benefice|emotion|preuve|urgence"
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
            // Extract sentences (split by timestamp lines or punctuation)
            const lines = text.split(/\n/).filter(Boolean);
            for (const line of lines) {
              // Remove timestamp prefix
              const cleanLine = line.replace(/^\[\d+[–-]\d+s\]\s*/, "").trim();
              if (cleanLine) {
                const words = cleanLine.split(/\s+/).filter(Boolean);
                // Allow up to 8 words (a bit of tolerance)
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
          scripts = scriptType === "ad" 
            ? generateAdsFallbackScripts(projectName, productName)
            : generateFallbackScripts(projectName, projectDescription);
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      scripts = generateFallbackScripts(projectName, projectDescription);
    }

    console.log("Scripts generated successfully:", scripts.length);

    return new Response(
      JSON.stringify({ 
        scripts,
        model: "nanobanana-pro",
        quality: "premium"
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

// Fallback scripts in perfect French
function generateFallbackScripts(projectName?: string, description?: string): Array<{ id: string; title: string; content: string; angle: string }> {
  const name = projectName || "notre solution";
  return [
    {
      id: "1",
      title: "Le problème que tu connais",
      content: `Tu perds du temps sur des tâches qui ne rapportent rien ? ${name} automatise ce qui t'ennuie pour que tu puisses te concentrer sur l'essentiel.`,
      angle: "probleme",
    },
    {
      id: "2",
      title: "Le résultat concret",
      content: `Moins de stress. Plus de résultats. Voilà ce que nos clients constatent après 30 jours avec ${name}.`,
      angle: "benefice",
    },
    {
      id: "3",
      title: "Le constat qui fait mal",
      content: `80% des entreprises perdent des clients faute de réactivité. ${name} répond à ta place, 24h/24.`,
      angle: "preuve",
    },
    {
      id: "4",
      title: "La question qui pique",
      content: `Combien de clients as-tu perdus ce mois-ci sans le savoir ? ${name} te donne les réponses.`,
      angle: "emotion",
    },
    {
      id: "5",
      title: "L'action immédiate",
      content: `Une semaine. C'est tout ce qu'il te faut pour voir la différence avec ${name}. Prêt à essayer ?`,
      angle: "urgence",
    },
  ];
}

// ADS-specific fallback scripts with timestamps
function generateAdsFallbackScripts(projectName?: string, productName?: string): Array<{ id: string; title: string; content: string; angle: string }> {
  const name = productName || projectName || "notre solution";
  return [
    {
      id: "1",
      title: "Choc direct",
      content: `[0–1s] Tu perds de l'argent.
[1–3s] Chaque jour.
[3–5s] Sans le savoir.
[5–7s] Clients ignorés.
[7–9s] Avis sans réponse.
[9–12s] ${name} agit pour toi.
[12–14s] Réponses. Posts. Automatique.
[14–16s] 30% de temps gagné.
[16–18s] Zéro stress.
[18–20s] ${name}. Maintenant.`,
      angle: "probleme",
    },
    {
      id: "2",
      title: "Accusation brutale",
      content: `[0–1s] Tu négliges tes clients.
[1–3s] Pas exprès.
[3–5s] Mais ils partent.
[5–7s] Vers tes concurrents.
[7–9s] Stop.
[9–12s] ${name} répond à ta place.
[12–14s] 24h/24. 7j/7.
[14–16s] Clients fidélisés.
[16–18s] CA en hausse.
[18–20s] Teste ${name}.`,
      angle: "urgence",
    },
    {
      id: "3",
      title: "Résultat chiffré",
      content: `[0–1s] 3h par semaine.
[1–3s] Perdues.
[3–5s] À répondre aux avis.
[5–7s] Pour rien.
[7–9s] ${name} automatise tout.
[9–12s] Avis. Posts. Questions.
[12–14s] En 2 clics.
[14–16s] 40% productivité.
[16–18s] Résultats garantis.
[18–20s] Essaie ${name}.`,
      angle: "preuve",
    },
    {
      id: "4",
      title: "Émotion pure",
      content: `[0–1s] Tu es épuisé.
[1–3s] Trop de tâches.
[3–5s] Pas assez de temps.
[5–7s] Stress constant.
[7–9s] Respire.
[9–12s] ${name} gère pour toi.
[12–14s] Automatique. Simple.
[14–16s] Retrouve ton calme.
[16–18s] Focus sur l'essentiel.
[18–20s] ${name}. Libère-toi.`,
      angle: "emotion",
    },
    {
      id: "5",
      title: "Ordre direct",
      content: `[0–1s] Arrête.
[1–3s] Tu fais ça mal.
[3–5s] Google te pénalise.
[5–7s] Avis ignorés.
[7–9s] Visibilité en chute.
[9–12s] ${name} corrige tout.
[12–14s] IA intelligente.
[14–16s] Résultats immédiats.
[16–18s] Top Google Maps.
[18–20s] Active ${name}.`,
      angle: "benefice",
    },
  ];
}
