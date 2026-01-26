import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating content for project:", projectName, "type:", contentType);

    // Different prompts based on content type
    let systemPrompt: string;

    if (contentType === "script") {
      // ULTRA-STRICT PROMPT for video scripts
      systemPrompt = `Tu es un copywriter professionnel spécialisé en scripts vidéo viraux.

LANGUE OBLIGATOIRE : Français parfait (France métropolitaine).
INTERDICTIONS ABSOLUES :
- Aucune faute d'orthographe
- Aucune faute de grammaire  
- Aucun mot anglais
- Aucun emoji
- Aucune phrase générique type "Découvrez notre solution"
- Aucun jargon marketing creux ("innovant", "révolutionnaire", "unique")

CONTEXTE DU PROJET :
Nom : ${projectName || "Non spécifié"}
Description : ${projectDescription || "Non spécifiée"}
${projectUrl ? `Site web : ${projectUrl}` : ""}
${scrapedContent ? `Contenu du site :\n${scrapedContent.substring(0, 1500)}` : ""}
${productName ? `Produit/Service ciblé : ${productName}` : ""}
${productCategory ? `Type de contenu : ${productCategory}` : ""}

CONTRAINTES DU SCRIPT :
- 2 à 4 phrases maximum (40-120 mots)
- Ton naturel, humain, moderne
- Accroche percutante dès la première phrase
- Bénéfice client clair
- Appel à l'action implicite ou explicite
- Adapté au format vertical (Reels/TikTok/Shorts)

STYLE ATTENDU (exemples) :
✅ "Tu perds des clients à cause des avis sans réponse ? Avec [Marque], chaque avis reçoit une réponse pro automatiquement. Résultat : plus de confiance, plus de clients."
✅ "3 secondes. C'est le temps pour convaincre un visiteur de rester sur ton site. [Marque] optimise chaque pixel pour maximiser tes conversions."
❌ "Découvrez notre solution innovante qui révolutionne le marché..."

Tu dois générer 5 scripts différents, variés en angle et en ton.

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide, sans markdown ni explication :
{
  "suggestions": [
    {
      "id": "1",
      "title": "Titre court (max 50 car)",
      "content": "Le script complet en français parfait",
      "contentType": "video",
      "estimatedEngagement": "high",
      "hashtags": ["mot1", "mot2", "mot3"]
    }
  ]
}`;
    } else {
      // Standard prompt for general content suggestions
      systemPrompt = `Tu es un expert en création de contenu pour les réseaux sociaux.

LANGUE : Français parfait uniquement. Pas d'anglicismes, pas de fautes.

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
          { 
            role: "user", 
            content: contentType === "script" 
              ? "Génère 5 scripts vidéo courts et percutants pour ce projet."
              : "Génère 5 suggestions de contenu pour ce projet."
          },
        ],
        temperature: 0.7, // Slightly lower for more consistent quality
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
        
        // Quality filter: validate each suggestion
        suggestions = suggestions.filter((s: any) => {
          const text = s.content?.trim() || "";
          
          // Reject empty or too short content
          if (text.length < 30) return false;
          
          // Reject content with too many English words (simple heuristic)
          const englishPatterns = /\b(discover|our|solution|innovative|the|and|with|for|your|this|that|is|are|you|we)\b/gi;
          const englishMatches = text.match(englishPatterns) || [];
          if (englishMatches.length > 3) return false;
          
          // Reject generic marketing phrases
          const genericPhrases = [
            "découvrez notre",
            "solution innovante",
            "révolutionnaire",
            "unique en son genre",
            "n'attendez plus",
          ];
          const lowerText = text.toLowerCase();
          if (genericPhrases.some(phrase => lowerText.includes(phrase))) return false;
          
          return true;
        });

        // If all were filtered out, use cleaned versions
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
          estimatedEngagement: "high",
          hashtags: ["authenticite", "marque", "histoire"],
        },
        {
          id: "2", 
          title: "Le problème que vous connaissez",
          content: `Vous perdez du temps sur des tâches répétitives ? ${projectName || "Cette solution"} automatise l'essentiel pour que vous puissiez vous concentrer sur ce qui compte vraiment.`,
          contentType: "video",
          estimatedEngagement: "high",
          hashtags: ["productivite", "automatisation", "efficacite"],
        },
        {
          id: "3",
          title: "Résultat concret",
          content: `Moins de stress. Plus de résultats. Voilà ce que nos clients disent après 30 jours avec ${projectName || "nous"}.`,
          contentType: "video",
          estimatedEngagement: "medium",
          hashtags: ["resultats", "temoignage", "confiance"],
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
