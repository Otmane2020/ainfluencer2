import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating content for prompt:", prompt, "type:", type);

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
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Tu es un expert en création de contenu pour les réseaux sociaux. 
Crée des posts engageants, viraux et authentiques pour Instagram et Facebook.
Utilise des emojis de manière stratégique.
Inclus des hashtags pertinents à la fin.
Le ton doit être inspirant, motivant et accessible.
Limite le texte à 200 mots maximum.`,
            },
            {
              role: "user",
              content: `Crée un post viral sur le thème suivant: ${prompt}`,
            },
          ],
        }),
      });

      if (!textResponse.ok) {
        const status = textResponse.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required" }),
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
              content: `Create a beautiful, professional, Instagram-worthy image for a social media post about: ${prompt}. 
The image should be vibrant, engaging, and suitable for an influencer account. 
Style: modern, aesthetic, high-quality photography or digital art.
Aspect ratio: square (1:1)`,
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
          imageUrl = images[0].image_url?.url || "";
          console.log("Image generated successfully");
        }
      }
    }

    return new Response(
      JSON.stringify({
        text: generatedText || `✨ ${prompt}\n\n#viral #trending #influencer`,
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
