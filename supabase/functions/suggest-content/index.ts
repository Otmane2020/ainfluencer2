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
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating content suggestions for project:", projectName);

    const systemPrompt = `Tu es un expert en création de contenu viral pour les réseaux sociaux (Instagram, Facebook, LinkedIn, TikTok).
    
Tu dois générer 5 idées de contenu créatives et engageantes basées sur le contexte suivant:
- Nom du projet: ${projectName || "Non spécifié"}
- Description: ${projectDescription || "Non spécifiée"}
- URL: ${projectUrl || "Non spécifiée"}
${scrapedContent ? `- Contenu du site:\n${scrapedContent}` : ""}

Pour chaque suggestion, fournis:
1. Un titre accrocheur (max 60 caractères)
2. Un contenu/script détaillé adapté aux réseaux sociaux
3. Le type de contenu recommandé: "video", "image" ou "text"
4. Le potentiel d'engagement estimé: "high", "medium" ou "low"
5. 5-8 hashtags pertinents (sans le #)

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Titre accrocheur",
      "content": "Contenu détaillé du post ou script vidéo...",
      "contentType": "video",
      "estimatedEngagement": "high",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
    }
  ]
}`;

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
            content: "Génère 5 suggestions de contenu viral pour ce projet." 
          },
        ],
        temperature: 0.8,
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
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Fallback suggestions
      suggestions = [
        {
          id: "1",
          title: "Découvrez notre histoire",
          content: "Partagez l'histoire et les valeurs de votre marque de manière authentique.",
          contentType: "video",
          estimatedEngagement: "high",
          hashtags: ["storytelling", "brand", "authentic"],
        },
        {
          id: "2", 
          title: "Conseils d'expert",
          content: "Partagez des conseils pratiques dans votre domaine d'expertise.",
          contentType: "image",
          estimatedEngagement: "medium",
          hashtags: ["tips", "expert", "advice"],
        },
        {
          id: "3",
          title: "Les coulisses",
          content: "Montrez l'envers du décor de votre activité.",
          contentType: "video",
          estimatedEngagement: "high",
          hashtags: ["behindthescenes", "authentic", "team"],
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
