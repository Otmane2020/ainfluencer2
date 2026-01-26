import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentSuggestion {
  title: string;
  content: string;
  contentType: "video" | "image";
  hashtags: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting daily rolling schedule generation...");

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*");

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      throw new Error("Failed to fetch projects");
    }

    if (!projects || projects.length === 0) {
      console.log("No projects found, skipping...");
      return new Response(
        JSON.stringify({ success: true, message: "No projects to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalPostsCreated = 0;

    for (const project of projects) {
      console.log(`Processing project: ${project.name}`);

      // Calculate the target date (30 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);
      targetDate.setHours(10, 0, 0, 0); // Set to 10:00 AM

      // Check if a post already exists for this date and project
      const startOfTargetDay = new Date(targetDate);
      startOfTargetDay.setHours(0, 0, 0, 0);
      const endOfTargetDay = new Date(targetDate);
      endOfTargetDay.setHours(23, 59, 59, 999);

      const { data: existingPosts } = await supabase
        .from("scheduled_posts")
        .select("id")
        .eq("project_id", project.id)
        .gte("scheduled_for", startOfTargetDay.toISOString())
        .lte("scheduled_for", endOfTargetDay.toISOString());

      if (existingPosts && existingPosts.length > 0) {
        console.log(`Post already exists for ${project.name} on ${targetDate.toDateString()}, skipping...`);
        continue;
      }

      // Get enabled platforms
      const platforms: string[] = [];
      if (project.instagram_enabled) platforms.push("instagram");
      if (project.facebook_enabled) platforms.push("facebook");
      if (project.linkedin_enabled) platforms.push("linkedin");
      if (project.tiktok_enabled) platforms.push("tiktok");

      // Determine content type based on day of week (alternate video/image)
      const dayOfMonth = targetDate.getDate();
      const contentType = dayOfMonth % 3 === 0 ? "video" : "image";

      // Generate content suggestion via AI
      const systemPrompt = `Tu es un expert en création de contenu viral pour les réseaux sociaux.

Contexte du projet:
- Nom: ${project.name}
- Description: ${project.description || "Non spécifiée"}
- URL: ${project.url || "Non spécifiée"}
- Plateformes: ${platforms.join(", ")}
- Type de contenu demandé: ${contentType}

Génère UNE SEULE idée de contenu ${contentType === "video" ? "vidéo/reel" : "image/post"} pour ce projet.

L'idée doit être:
1. Originale et engageante
2. Adaptée aux réseaux sociaux
3. En lien avec l'activité du projet

Réponds UNIQUEMENT avec un JSON valide:
{
  "title": "Titre accrocheur (max 60 caractères)",
  "content": "Description détaillée du contenu...",
  "contentType": "${contentType}",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

      try {
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
              { role: "user", content: `Génère une idée de contenu ${contentType} pour la date du ${targetDate.toLocaleDateString('fr-FR')}.` },
            ],
            temperature: 0.9,
          }),
        });

        if (!response.ok) {
          console.error(`AI error for project ${project.name}:`, await response.text());
          continue;
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content;

        if (!content) {
          console.error(`No AI content for project ${project.name}`);
          continue;
        }

        // Parse suggestion
        let suggestion: ContentSuggestion;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            suggestion = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } catch {
          // Fallback suggestion
          suggestion = {
            title: `Contenu du ${targetDate.toLocaleDateString('fr-FR')}`,
            content: `Idée de contenu ${contentType} pour ${project.name}`,
            contentType: contentType as "video" | "image",
            hashtags: ["viral", "content", project.name.toLowerCase().replace(/\s+/g, "")],
          };
        }

        // Choose optimal posting time
        const hours = [10, 14, 18];
        const selectedHour = hours[dayOfMonth % 3];
        targetDate.setHours(selectedHour, 0, 0, 0);

        // Create the scheduled post
        const { error: insertError } = await supabase
          .from("scheduled_posts")
          .insert({
            project_id: project.id,
            user_id: project.user_id,
            content_type: suggestion.contentType,
            text_content: `${suggestion.title}\n\n${suggestion.content}\n\n${suggestion.hashtags.map(h => `#${h}`).join(" ")}`,
            ai_prompt: suggestion.title,
            platforms: platforms,
            scheduled_for: targetDate.toISOString(),
            status: "draft",
          });

        if (insertError) {
          console.error(`Insert error for project ${project.name}:`, insertError);
          continue;
        }

        totalPostsCreated++;
        console.log(`Created post for ${project.name} on ${targetDate.toISOString()}`);
      } catch (error) {
        console.error(`Error processing project ${project.name}:`, error);
        continue;
      }
    }

    console.log(`Daily rolling schedule complete. Created ${totalPostsCreated} posts.`);

    return new Response(
      JSON.stringify({
        success: true,
        postsCreated: totalPostsCreated,
        message: `${totalPostsCreated} nouveaux posts créés pour J+30`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in daily-rolling-schedule:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
