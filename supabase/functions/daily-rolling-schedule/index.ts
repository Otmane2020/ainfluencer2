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

// Language-specific prompt templates
const LANGUAGE_PROMPTS: Record<string, { system: string; generate: string; fallbackTitle: string; fallbackContent: string }> = {
  en: {
    system: `You are an expert in creating viral social media content.`,
    generate: `Generate a ${"{contentType}"} content idea for the date ${"{date}"}.`,
    fallbackTitle: `Content for ${"{date}"}`,
    fallbackContent: `${"{contentType}"} idea for ${"{projectName}"}`,
  },
  fr: {
    system: `Tu es un expert en création de contenu viral pour les réseaux sociaux.`,
    generate: `Génère une idée de contenu ${"{contentType}"} pour la date du ${"{date}"}.`,
    fallbackTitle: `Contenu du ${"{date}"}`,
    fallbackContent: `Idée de contenu ${"{contentType}"} pour ${"{projectName}"}`,
  },
  es: {
    system: `Eres un experto en creación de contenido viral para redes sociales.`,
    generate: `Genera una idea de contenido ${"{contentType}"} para la fecha ${"{date}"}.`,
    fallbackTitle: `Contenido del ${"{date}"}`,
    fallbackContent: `Idea de contenido ${"{contentType}"} para ${"{projectName}"}`,
  },
  de: {
    system: `Du bist ein Experte für die Erstellung von viralem Social-Media-Content.`,
    generate: `Erstelle eine ${"{contentType}"}-Content-Idee für das Datum ${"{date}"}.`,
    fallbackTitle: `Inhalt für ${"{date}"}`,
    fallbackContent: `${"{contentType}"}-Idee für ${"{projectName}"}`,
  },
  it: {
    system: `Sei un esperto nella creazione di contenuti virali per i social media.`,
    generate: `Genera un'idea di contenuto ${"{contentType}"} per la data ${"{date}"}.`,
    fallbackTitle: `Contenuto del ${"{date}"}`,
    fallbackContent: `Idea di contenuto ${"{contentType}"} per ${"{projectName}"}`,
  },
  pt: {
    system: `Você é um especialista em criação de conteúdo viral para redes sociais.`,
    generate: `Gere uma ideia de conteúdo ${"{contentType}"} para a data ${"{date}"}.`,
    fallbackTitle: `Conteúdo de ${"{date}"}`,
    fallbackContent: `Ideia de conteúdo ${"{contentType}"} para ${"{projectName}"}`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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
      console.log(`Processing project: ${project.name} (language: ${project.detected_language || "en"})`);

      // Get project language
      const language = project.detected_language || "en";
      const langPrompts = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.en;

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
      const contentTypeLabel = contentType === "video" ? (language === "fr" ? "vidéo" : "video") : (language === "fr" ? "image/post" : "image/post");

      // Format date based on language
      const dateLocale = language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : language === "de" ? "de-DE" : language === "it" ? "it-IT" : language === "pt" ? "pt-BR" : "en-US";
      const formattedDate = targetDate.toLocaleDateString(dateLocale);

      // Build language-specific system prompt
      const systemPrompt = `${langPrompts.system}

Project context:
- Name: ${project.name}
- Description: ${project.description || "Not specified"}
- URL: ${project.url || "Not specified"}
- Platforms: ${platforms.join(", ")}
- Content type requested: ${contentTypeLabel}

Generate ONE ${contentTypeLabel} content idea for this project.

The idea must be:
1. Original and engaging
2. Adapted to social media
3. Related to the project's activity

CRITICAL: Output ONLY in ${language.toUpperCase()}. No other language allowed!

Respond ONLY with valid JSON:
{
  "title": "Catchy title (max 60 characters)",
  "content": "Detailed content description...",
  "contentType": "${contentType}",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: langPrompts.generate.replace("{contentType}", contentTypeLabel).replace("{date}", formattedDate) },
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
            title: langPrompts.fallbackTitle.replace("{date}", formattedDate),
            content: langPrompts.fallbackContent.replace("{contentType}", contentTypeLabel).replace("{projectName}", project.name),
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
        console.log(`Created post for ${project.name} on ${targetDate.toISOString()} in ${language}`);
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
        message: `${totalPostsCreated} new posts created for D+30`,
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
