import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentSuggestion {
  id: string;
  title: string;
  content: string;
  contentType: "video" | "image" | "text";
  estimatedEngagement: "high" | "medium" | "low";
  hashtags: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, videosPerMonth = 4, imagesPerMonth = 12 } = await req.json();

    if (!projectId) {
      throw new Error("projectId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      throw new Error("Project not found");
    }

    console.log("Generating monthly schedule for project:", project.name);

    // Get enabled platforms
    const platforms: string[] = [];
    if (project.instagram_enabled) platforms.push("instagram");
    if (project.facebook_enabled) platforms.push("facebook");
    if (project.linkedin_enabled) platforms.push("linkedin");
    if (project.tiktok_enabled) platforms.push("tiktok");

    const totalPosts = videosPerMonth + imagesPerMonth;

    // Generate content suggestions via AI
    const systemPrompt = `Tu es un expert en création de contenu viral pour les réseaux sociaux.

Contexte du projet:
- Nom: ${project.name}
- Description: ${project.description || "Non spécifiée"}
- URL: ${project.url || "Non spécifiée"}
- Plateformes: ${platforms.join(", ")}

Tu dois générer ${totalPosts} idées de contenu pour un planning mensuel:
- ${videosPerMonth} vidéos/reels
- ${imagesPerMonth} posts images

Pour chaque post, génère:
1. Un titre accrocheur (max 60 caractères)
2. Un contenu/script détaillé
3. Le type: "video" ou "image"
4. Le potentiel d'engagement: "high", "medium" ou "low"
5. 5-8 hashtags pertinents (sans le #)

Répartis les types de contenu de manière équilibrée sur le mois.
Assure-toi que les idées sont variées et engageantes.

Réponds UNIQUEMENT avec un JSON valide:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Titre",
      "content": "Contenu détaillé...",
      "contentType": "video",
      "estimatedEngagement": "high",
      "hashtags": ["tag1", "tag2"]
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
          { role: "user", content: `Génère ${totalPosts} suggestions de contenu viral pour ce projet.` },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse suggestions
    let suggestions: ContentSuggestion[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Generate fallback suggestions
      suggestions = generateFallbackSuggestions(project.name, videosPerMonth, imagesPerMonth);
    }

    console.log(`Generated ${suggestions.length} content suggestions`);

    // Create scheduled posts for the next 30 days
    const now = new Date();
    const scheduledPosts = [];
    const postsPerDay = Math.ceil(suggestions.length / 30);
    
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const dayOffset = Math.floor(i / postsPerDay);
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + dayOffset + 1);
      
      // Set time to optimal posting hours (10:00, 14:00, 18:00)
      const hours = [10, 14, 18];
      scheduledDate.setHours(hours[i % 3], 0, 0, 0);

      scheduledPosts.push({
        project_id: projectId,
        user_id: project.user_id,
        content_type: suggestion.contentType,
        text_content: `${suggestion.title}\n\n${suggestion.content}\n\n${suggestion.hashtags.map(h => `#${h}`).join(" ")}`,
        ai_prompt: suggestion.title,
        platforms: platforms,
        scheduled_for: scheduledDate.toISOString(),
        status: "draft",
      });
    }

    // Insert all scheduled posts
    const { data: insertedPosts, error: insertError } = await supabase
      .from("scheduled_posts")
      .insert(scheduledPosts)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create scheduled posts");
    }

    console.log(`Created ${insertedPosts?.length || 0} scheduled posts`);

    return new Response(
      JSON.stringify({
        success: true,
        postsCreated: insertedPosts?.length || 0,
        message: `${insertedPosts?.length} posts programmés pour les 30 prochains jours`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-monthly-schedule:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackSuggestions(
  projectName: string,
  videosCount: number,
  imagesCount: number
): ContentSuggestion[] {
  const suggestions: ContentSuggestion[] = [];
  
  const videoIdeas = [
    { title: "Découvrez notre histoire", content: "Partagez l'histoire et les valeurs de votre marque de manière authentique." },
    { title: "Les coulisses", content: "Montrez l'envers du décor de votre activité." },
    { title: "Tutoriel rapide", content: "Expliquez comment utiliser votre produit ou service en 60 secondes." },
    { title: "FAQ en vidéo", content: "Répondez aux questions les plus fréquentes de vos clients." },
    { title: "Témoignage client", content: "Partagez l'expérience d'un client satisfait." },
  ];

  const imageIdeas = [
    { title: "Citation inspirante", content: "Partagez une citation motivante en lien avec votre domaine." },
    { title: "Conseil du jour", content: "Proposez un conseil pratique à votre audience." },
    { title: "Avant/Après", content: "Montrez une transformation ou un résultat." },
    { title: "Infographie", content: "Présentez des statistiques ou des faits intéressants." },
    { title: "Nouveauté", content: "Annoncez une nouvelle offre ou fonctionnalité." },
  ];

  for (let i = 0; i < videosCount; i++) {
    const idea = videoIdeas[i % videoIdeas.length];
    suggestions.push({
      id: `video-${i + 1}`,
      title: idea.title,
      content: idea.content,
      contentType: "video",
      estimatedEngagement: i < 2 ? "high" : "medium",
      hashtags: ["viral", "video", projectName.toLowerCase().replace(/\s+/g, ""), "content", "reels"],
    });
  }

  for (let i = 0; i < imagesCount; i++) {
    const idea = imageIdeas[i % imageIdeas.length];
    suggestions.push({
      id: `image-${i + 1}`,
      title: idea.title,
      content: idea.content,
      contentType: "image",
      estimatedEngagement: i < 3 ? "high" : "medium",
      hashtags: ["instagram", "post", projectName.toLowerCase().replace(/\s+/g, ""), "tips", "inspo"],
    });
  }

  return suggestions;
}
