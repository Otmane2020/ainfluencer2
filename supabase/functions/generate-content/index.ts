import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Valid content types
const VALID_TYPES = ["text", "image", "both"] as const;
type ContentType = typeof VALID_TYPES[number];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type, detectedLanguage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // FIX 1: Strict type validation
    if (!prompt || !VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid request. 'prompt' is required and 'type' must be text | image | both" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Language-specific system prompts
    const languageInstructions: Record<string, string> = {
      en: "You are an expert social media content creator. Create engaging, viral, and authentic posts for Instagram and Facebook. Use emojis strategically. Include relevant hashtags at the end. The tone should be inspiring, motivating, and accessible. Limit text to 200 words maximum.",
      fr: "Tu es un expert en création de contenu pour les réseaux sociaux. Crée des posts engageants, viraux et authentiques pour Instagram et Facebook. Utilise des emojis de manière stratégique. Inclus des hashtags pertinents à la fin. Le ton doit être inspirant, motivant et accessible. Limite le texte à 200 mots maximum.",
      es: "Eres un experto en creación de contenido para redes sociales. Crea publicaciones atractivas, virales y auténticas para Instagram y Facebook. Usa emojis estratégicamente. Incluye hashtags relevantes al final. El tono debe ser inspirador, motivador y accesible. Limita el texto a 200 palabras máximo.",
      de: "Du bist ein Experte für Social-Media-Content-Erstellung. Erstelle ansprechende, virale und authentische Posts für Instagram und Facebook. Verwende Emojis strategisch. Füge relevante Hashtags am Ende hinzu. Der Ton sollte inspirierend, motivierend und zugänglich sein. Begrenze den Text auf maximal 200 Wörter.",
      it: "Sei un esperto di creazione di contenuti per i social media. Crea post coinvolgenti, virali e autentici per Instagram e Facebook. Usa emoji in modo strategico. Includi hashtag pertinenti alla fine. Il tono deve essere ispiratore, motivante e accessibile. Limita il testo a massimo 200 parole.",
      pt: "Você é um especialista em criação de conteúdo para redes sociais. Crie posts envolventes, virais e autênticos para Instagram e Facebook. Use emojis estrategicamente. Inclua hashtags relevantes no final. O tom deve ser inspirador, motivador e acessível. Limite o texto a no máximo 200 palavras.",
    };

    const languageNames: Record<string, string> = {
      en: "English",
      fr: "French", 
      es: "Spanish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
    };

    const language = detectedLanguage || "en";
    const languageName = languageNames[language] || "English";
    const systemPrompt = languageInstructions[language] || languageInstructions.en;

    console.log("Generating content for prompt:", prompt.slice(0, 100), "type:", type, "language:", language);

    // Generate text content
    let generatedText = "";
    if (type === "text" || type === "both") {
      const textResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // FIX 3: Use stable model instead of preview
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              // FIX 2: Stronger language lock in user prompt
              content: `Create a viral post about: ${prompt}.
IMPORTANT: Write ONLY in ${languageName}. Do not use any other language.`,
            },
          ],
        }),
      });

      if (!textResponse.ok) {
        const status = textResponse.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`Text generation failed: ${status}`);
      }

      const textData = await textResponse.json();
      generatedText = textData.choices?.[0]?.message?.content || "";
      console.log("Generated text:", generatedText.substring(0, 100) + "...");
    }

    // Generate image if requested
    let imageUrl = "";
    if (type === "image" || type === "both") {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              // FIX 4: Social-first optimized image prompt
              content: `Create a high-impact, scroll-stopping social media image about: ${prompt}.

STYLE REQUIREMENTS:
- Ultra high quality, modern Instagram aesthetic
- Strong focal point with clean composition
- High contrast, vibrant colors
- Influencer-style photography or premium digital art
- No text unless naturally integrated
- No watermark, no logo

FORMAT:
- Square 1:1 aspect ratio
- Optimized for Instagram feed
- Professional quality, attention-grabbing`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!imageResponse.ok) {
        const status = imageResponse.status;
        console.error("Image generation failed:", status);
        // Continue without image if generation fails
      } else {
        const imageData = await imageResponse.json();
        const images = imageData.choices?.[0]?.message?.images;
        if (images && images.length > 0) {
          const rawUrl = images[0].image_url?.url || "";
          
          // FIX 5: Don't return base64 directly - it can break frontend
          if (rawUrl && !rawUrl.startsWith("data:image")) {
            imageUrl = rawUrl;
          } else if (rawUrl.startsWith("data:image")) {
            // Base64 returned - for now we skip, cron can handle upload later
            console.log("Image returned as base64, skipping direct return");
            imageUrl = "";
          }
          
          console.log("Image generated successfully");
        }
      }
    }

    // FIX 6: Better fallback text with proper CTA
    const fallbackText = `✨ ${prompt}

🔥 Follow for more content!
#inspiration #socialmedia #contentcreator #viral #trending`;

    // FIX 7: Return mode and language for frontend clarity
    return new Response(
      JSON.stringify({
        mode: type,
        language,
        text: generatedText || fallbackText,
        imageUrl: imageUrl || undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
