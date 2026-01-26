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
    } = await req.json();

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

    // Duration-based instructions
    const getDurationInstructions = (dur: number): string => {
      if (dur <= 5) {
        return `DURÉE : ${dur} secondes (~${targetWords} mots)
- 1 phrase MAXIMUM (ultra-concis)
- Hook immédiat, pas de contexte
- Impact maximal en minimum de mots`;
      } else if (dur <= 10) {
        return `DURÉE : ${dur} secondes (~${targetWords} mots)
- 2-3 phrases maximum
- Hook puissant + bénéfice clair
- Rythme rapide et percutant`;
      } else if (dur <= 20) {
        return `DURÉE : ${dur} secondes (~${targetWords} mots)
- 3-5 phrases
- Hook → Problème → Solution → Bénéfice
- Temps pour développer l'argument`;
      } else {
        return `DURÉE : ${dur} secondes (~${targetWords} mots)
- 5-8 phrases
- Narration complète : contexte, problème, solution, preuve, appel à l'action
- Ton storytelling, exemples concrets`;
      }
    };

    // Script type specific instructions
    const scriptTypePrompts: Record<string, string> = {
      reel: `Format : Reel/TikTok (vertical)
${getDurationInstructions(duration)}`,
      story: `Format : Story Instagram
${getDurationInstructions(Math.min(duration, 15))}`,
      ad: `Format : Publicité
${getDurationInstructions(duration)}
- Accroche émotionnelle + urgence`,
      testimonial: `Format : Témoignage authentique
${getDurationInstructions(duration)}
- Ton humain et crédible`,
    };

    const systemPrompt = `Tu es un copywriter professionnel francophone spécialisé en scripts vidéo viraux.

RÈGLES ABSOLUES :
• Langue : français parfait de France (pas belge, pas québécois)
• ZÉRO faute d'orthographe ou de grammaire
• ZÉRO mot anglais (pas de "tips", "boost", "game-changer", etc.)
• ZÉRO emoji
• ZÉRO phrase générique ("Découvrez", "N'attendez plus", "solution innovante")
• ZÉRO jargon marketing vide ("révolutionnaire", "unique", "incroyable")

${scriptTypePrompts[scriptType] || scriptTypePrompts.reel}

TON ATTENDU :
- Naturel, comme si tu parlais à un ami
- Direct et sans blabla
- Concret avec des exemples chiffrés si possible
- Émotionnel mais crédible

EXEMPLES DE BON STYLE :
✅ "Tu perds 3h par semaine à répondre aux mêmes questions ? Cette automatisation fait le travail pendant que tu dors."
✅ "Un client mécontent coûte 5 fois plus cher qu'un client fidélisé. Voilà pourquoi j'ai créé ça."
✅ "J'ai testé 12 outils avant de trouver celui-ci. Résultat : 40% de temps gagné."

EXEMPLES DE MAUVAIS STYLE :
❌ "Découvrez notre solution innovante qui révolutionne votre quotidien..."
❌ "N'attendez plus pour booster votre business !"
❌ "Cette méthode unique va transformer votre vie..."`;

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
          
          // Length check
          if (text.length < 30 || text.length > 500) return false;
          
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
          
          return true;
        });

        // Ensure we have at least some scripts
        if (scripts.length === 0) {
          console.warn("All scripts filtered, using fallbacks");
          scripts = generateFallbackScripts(projectName, projectDescription);
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
