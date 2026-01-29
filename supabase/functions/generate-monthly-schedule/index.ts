import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContentSuggestion {
  id: string;
  title: string;
  content: string;
  contentType: "video" | "image" | "text";
  estimatedEngagement: "high" | "medium" | "low";
  hashtags: string[];
}

// FIX 1: Robust JSON parsing utility
function safeParseJSON<T>(text: string): T | null {
  try {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) return null;
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

// Language-specific configurations with FIX 8: Multilingual default hashtags
const LANGUAGE_CONFIG: Record<string, { 
  systemIntro: string; 
  videoLabel: string; 
  imageLabel: string;
  generateLabel: string;
  fallbackVideoIdeas: { title: string; content: string }[];
  fallbackImageIdeas: { title: string; content: string }[];
  defaultHashtags: { video: string[]; image: string[] };
}> = {
  en: {
    systemIntro: "You are an expert in creating viral social media content.",
    videoLabel: "videos/reels",
    imageLabel: "image posts",
    generateLabel: "Generate",
    fallbackVideoIdeas: [
      { title: "Discover our story", content: "Share your brand's story and values authentically." },
      { title: "Behind the scenes", content: "Show what goes on behind the scenes of your business." },
      { title: "Quick tutorial", content: "Explain how to use your product or service in 60 seconds." },
      { title: "Video FAQ", content: "Answer the most frequently asked customer questions." },
      { title: "Customer testimonial", content: "Share a satisfied customer's experience." },
    ],
    fallbackImageIdeas: [
      { title: "Inspiring quote", content: "Share a motivational quote related to your industry." },
      { title: "Tip of the day", content: "Offer a practical tip to your audience." },
      { title: "Before/After", content: "Show a transformation or result." },
      { title: "Infographic", content: "Present interesting statistics or facts." },
      { title: "New release", content: "Announce a new offer or feature." },
    ],
    defaultHashtags: {
      video: ["viral", "reels", "content", "trending", "fyp"],
      image: ["instagram", "post", "inspiration", "tips", "inspo"],
    },
  },
  fr: {
    systemIntro: "Tu es un expert en création de contenu viral pour les réseaux sociaux.",
    videoLabel: "vidéos/reels",
    imageLabel: "posts images",
    generateLabel: "Génère",
    fallbackVideoIdeas: [
      { title: "Découvrez notre histoire", content: "Partagez l'histoire et les valeurs de votre marque de manière authentique." },
      { title: "Les coulisses", content: "Montrez l'envers du décor de votre activité." },
      { title: "Tutoriel rapide", content: "Expliquez comment utiliser votre produit ou service en 60 secondes." },
      { title: "FAQ en vidéo", content: "Répondez aux questions les plus fréquentes de vos clients." },
      { title: "Témoignage client", content: "Partagez l'expérience d'un client satisfait." },
    ],
    fallbackImageIdeas: [
      { title: "Citation inspirante", content: "Partagez une citation motivante en lien avec votre domaine." },
      { title: "Conseil du jour", content: "Proposez un conseil pratique à votre audience." },
      { title: "Avant/Après", content: "Montrez une transformation ou un résultat." },
      { title: "Infographie", content: "Présentez des statistiques ou des faits intéressants." },
      { title: "Nouveauté", content: "Annoncez une nouvelle offre ou fonctionnalité." },
    ],
    defaultHashtags: {
      video: ["viral", "reels", "contenu", "tendance", "fyp"],
      image: ["instagram", "publication", "inspiration", "conseils", "inspo"],
    },
  },
  es: {
    systemIntro: "Eres un experto en creación de contenido viral para redes sociales.",
    videoLabel: "videos/reels",
    imageLabel: "posts de imagen",
    generateLabel: "Genera",
    fallbackVideoIdeas: [
      { title: "Descubre nuestra historia", content: "Comparte la historia y valores de tu marca de forma auténtica." },
      { title: "Tras bastidores", content: "Muestra lo que hay detrás de tu negocio." },
      { title: "Tutorial rápido", content: "Explica cómo usar tu producto o servicio en 60 segundos." },
      { title: "FAQ en video", content: "Responde las preguntas más frecuentes de tus clientes." },
      { title: "Testimonio de cliente", content: "Comparte la experiencia de un cliente satisfecho." },
    ],
    fallbackImageIdeas: [
      { title: "Cita inspiradora", content: "Comparte una cita motivadora relacionada con tu industria." },
      { title: "Consejo del día", content: "Ofrece un consejo práctico a tu audiencia." },
      { title: "Antes/Después", content: "Muestra una transformación o resultado." },
      { title: "Infografía", content: "Presenta estadísticas o datos interesantes." },
      { title: "Novedad", content: "Anuncia una nueva oferta o función." },
    ],
    defaultHashtags: {
      video: ["viral", "reels", "contenido", "tendencia", "fyp"],
      image: ["instagram", "publicacion", "inspiracion", "consejos", "inspo"],
    },
  },
  de: {
    systemIntro: "Du bist ein Experte für die Erstellung von viralem Social-Media-Content.",
    videoLabel: "Videos/Reels",
    imageLabel: "Bild-Posts",
    generateLabel: "Erstelle",
    fallbackVideoIdeas: [
      { title: "Entdecke unsere Geschichte", content: "Teile authentisch die Geschichte und Werte deiner Marke." },
      { title: "Hinter den Kulissen", content: "Zeige, was hinter deinem Geschäft passiert." },
      { title: "Schnelles Tutorial", content: "Erkläre in 60 Sekunden, wie man dein Produkt oder Service nutzt." },
      { title: "Video-FAQ", content: "Beantworte die häufigsten Kundenfragen." },
      { title: "Kundenreferenz", content: "Teile die Erfahrung eines zufriedenen Kunden." },
    ],
    fallbackImageIdeas: [
      { title: "Inspirierendes Zitat", content: "Teile ein motivierendes Zitat aus deiner Branche." },
      { title: "Tipp des Tages", content: "Biete deinem Publikum einen praktischen Tipp." },
      { title: "Vorher/Nachher", content: "Zeige eine Transformation oder ein Ergebnis." },
      { title: "Infografik", content: "Präsentiere interessante Statistiken oder Fakten." },
      { title: "Neuheit", content: "Kündige ein neues Angebot oder Feature an." },
    ],
    defaultHashtags: {
      video: ["viral", "reels", "inhalt", "trend", "fyp"],
      image: ["instagram", "post", "inspiration", "tipps", "inspo"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, videosPerMonth = 4, imagesPerMonth = 12 } = await req.json();

    if (!projectId) {
      throw new Error("projectId is required");
    }

    // FIX 7: Rate limit / abuse protection
    const totalPosts = videosPerMonth + imagesPerMonth;
    if (totalPosts > 60) {
      return new Response(
        JSON.stringify({ error: "Monthly content limit exceeded (max 60 posts)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Get project language
    const language = project.detected_language || "en";
    const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;

    console.log("Generating monthly schedule for project:", project.name, "language:", language);

    // Get enabled platforms
    const platforms: string[] = [];
    if (project.instagram_enabled) platforms.push("instagram");
    if (project.facebook_enabled) platforms.push("facebook");
    if (project.linkedin_enabled) platforms.push("linkedin");
    if (project.tiktok_enabled) platforms.push("tiktok");

    // Generate content suggestions via AI
    const systemPrompt = `${langConfig.systemIntro}

Project context:
- Name: ${project.name}
- Description: ${project.description || "Not specified"}
- URL: ${project.url || "Not specified"}
- Platforms: ${platforms.join(", ")}

You must generate ${totalPosts} content ideas for a monthly schedule:
- ${videosPerMonth} ${langConfig.videoLabel}
- ${imagesPerMonth} ${langConfig.imageLabel}

For each post, generate:
1. A catchy title (max 60 characters)
2. Detailed content/script
3. Type: "video" or "image"
4. Engagement potential: "high", "medium" or "low"
5. 5-8 relevant hashtags (without #)

Distribute content types evenly across the month.
Ensure ideas are varied and engaging.

CRITICAL: Output ONLY in ${language.toUpperCase()}. No other language allowed!

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Title",
      "content": "Detailed content...",
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
          { role: "user", content: `${langConfig.generateLabel} ${totalPosts} viral content suggestions for this project. Write ONLY in ${language.toUpperCase()}.` },
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

    // FIX 1: Use robust JSON parsing
    let suggestions: ContentSuggestion[] = [];
    const parsed = safeParseJSON<{ suggestions: ContentSuggestion[] }>(content);

    if (!parsed || !Array.isArray(parsed.suggestions)) {
      console.warn("AI response parsing failed, using fallback suggestions");
      suggestions = generateFallbackSuggestions(project.name, videosPerMonth, imagesPerMonth, langConfig);
    } else {
      suggestions = parsed.suggestions;
    }

    // FIX 2: Validate suggestion count and fill if needed
    if (suggestions.length < totalPosts) {
      console.warn(`AI returned ${suggestions.length} suggestions, expected ${totalPosts}. Filling with fallback.`);
      const missing = totalPosts - suggestions.length;
      const missingVideos = Math.min(missing, Math.max(0, videosPerMonth - suggestions.filter(s => s.contentType === "video").length));
      const missingImages = missing - missingVideos;
      const fallback = generateFallbackSuggestions(project.name, missingVideos, missingImages, langConfig);
      suggestions.push(...fallback.slice(0, missing));
    }

    // Cap at requested total (in case AI returned more)
    suggestions = suggestions.slice(0, totalPosts);

    console.log(`Generated ${suggestions.length} content suggestions`);

    // Create scheduled posts for the next 30 days
    const now = new Date();
    const scheduledPosts = [];
    const postsPerDay = Math.ceil(suggestions.length / 30);
    
    // FIX 6: Add time variance to posting hours
    const baseHours = [10, 14, 18];
    
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const dayOffset = Math.floor(i / postsPerDay);
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + dayOffset + 1);
      
      // FIX 6: Set time with random minute variance (0-30 minutes)
      const randomMinutes = Math.floor(Math.random() * 30);
      scheduledDate.setHours(baseHours[i % 3], randomMinutes, 0, 0);

      scheduledPosts.push({
        project_id: projectId,
        user_id: project.user_id,
        content_type: suggestion.contentType,
        text_content: `${suggestion.title}\n\n${suggestion.content}\n\n${suggestion.hashtags.map(h => `#${h}`).join(" ")}`,
        // FIX 5: Store full AI context in ai_prompt
        ai_prompt: `${suggestion.title} — ${suggestion.content}`,
        // FIX 3: platforms is text[] in DB, Supabase handles it properly
        platforms: platforms,
        scheduled_for: scheduledDate.toISOString(),
        status: "draft",
        // Note: estimated_engagement could be stored if column exists
        // estimated_engagement: suggestion.estimatedEngagement,
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

    console.log(`Created ${insertedPosts?.length || 0} scheduled posts in ${language}`);

    return new Response(
      JSON.stringify({
        success: true,
        postsCreated: insertedPosts?.length || 0,
        message: `${insertedPosts?.length} posts scheduled for the next 30 days`,
        language: language,
        platforms,
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
  imagesCount: number,
  langConfig: typeof LANGUAGE_CONFIG["en"]
): ContentSuggestion[] {
  const suggestions: ContentSuggestion[] = [];
  const brandTag = projectName.toLowerCase().replace(/\s+/g, "");
  
  for (let i = 0; i < videosCount; i++) {
    const idea = langConfig.fallbackVideoIdeas[i % langConfig.fallbackVideoIdeas.length];
    suggestions.push({
      id: `video-${i + 1}`,
      title: idea.title,
      content: idea.content,
      contentType: "video",
      estimatedEngagement: i < 2 ? "high" : "medium",
      // FIX 8: Use multilingual default hashtags
      hashtags: [...langConfig.defaultHashtags.video, brandTag],
    });
  }

  for (let i = 0; i < imagesCount; i++) {
    const idea = langConfig.fallbackImageIdeas[i % langConfig.fallbackImageIdeas.length];
    suggestions.push({
      id: `image-${i + 1}`,
      title: idea.title,
      content: idea.content,
      contentType: "image",
      estimatedEngagement: i < 3 ? "high" : "medium",
      // FIX 8: Use multilingual default hashtags
      hashtags: [...langConfig.defaultHashtags.image, brandTag],
    });
  }

  return suggestions;
}
