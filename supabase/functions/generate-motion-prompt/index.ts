import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generates a camera/motion direction prompt to animate a brand image into
// an image-to-video clip (Higgsfield DoP/Seedance/Kling). Mirrors the
// generate-motion-script function's simple single-call OpenRouter setup.
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
      marketingContext,
      detectedLanguage = "en",
      imageUrl,
      task = "motion",
    } = await req.json();

    console.log("[generate-motion-prompt] Project:", projectName, "| Lang:", detectedLanguage, "| Task:", task, "| Image:", Boolean(imageUrl));

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    let brandContext = "";
    if (projectName) brandContext += `Brand/Project: ${projectName}\n`;
    if (projectDescription) brandContext += `Description: ${projectDescription}\n`;
    if (projectUrl) brandContext += `Website: ${projectUrl}\n`;
    if (marketingContext?.tagline) brandContext += `Tagline: ${marketingContext.tagline}\n`;
    if (marketingContext?.uniqueSellingPoints?.length) {
      brandContext += `Key Points: ${marketingContext.uniqueSellingPoints.join(", ")}\n`;
    }
    if (scrapedContent) brandContext += `\nWebsite Content:\n${scrapedContent.slice(0, 2000)}\n`;

    const motionSystemPrompt = `You are a motion direction specialist for AI image-to-video generation. You write short prompts describing how an EXISTING still brand photo should animate — camera movement, subject motion, atmosphere — never what the image looks like.

CRITICAL RULES:
1. Output ONLY the motion prompt text - no titles, no formatting, no quotes around it
2. Describe CAMERA movement (push-in, pan, orbit, slow zoom, parallax, handheld drift) and/or SUBJECT motion (fabric moving, steam rising, hair moving, liquid pouring, light shifting)
3. Stay grounded in what could realistically already be in a product/brand photo — no new objects, no scene changes
4. Mention pacing and mood (slow and cinematic, energetic, subtle)
5. Do NOT describe static composition, lighting, or colors — only the movement to apply
6. Keep it to 1-2 flowing sentences, ready to paste directly into a video generator
7. Language: ${detectedLanguage.toUpperCase()} ONLY (except brand names)${imageUrl ? "\n8. An image of the actual product is attached — ground the motion in what is really visible in it" : ""}`;

    const negativeSystemPrompt = `You write NEGATIVE PROMPTS (exclusion lists) for AI image generation.

CRITICAL RULES:
1. Output ONLY a single comma-separated list of things to avoid — no titles, no sentences, no quotes
2. Between 8 and 16 short items in English
3. Always include generic quality exclusions (watermark, text artifacts, blurry, distorted proportions, extra limbs, low resolution, jpeg artifacts)
4. Add brand/product specific exclusions based on the context (and the attached image if present): wrong logo, altered packaging, competitor branding, unrealistic materials, etc.
5. No explanations, no numbering`;

    const motionUserPrompt = `Generate a motion/camera-direction prompt to animate a brand image for this project into a short image-to-video clip.

BRAND CONTEXT:
${brandContext || `Project: ${projectName || "this brand"}`}

Output ONLY the motion prompt text, nothing else.`;

    const negativeUserPrompt = `Generate a negative prompt (exclusion list) for AI product image generation for this brand.

BRAND CONTEXT:
${brandContext || `Project: ${projectName || "this brand"}`}

Output ONLY the comma-separated exclusion list, nothing else.`;

    const isNegative = task === "negative";
    const systemPrompt = isNegative ? negativeSystemPrompt : motionSystemPrompt;
    const textPrompt = isNegative ? negativeUserPrompt : motionUserPrompt;

    const userContent = imageUrl
      ? [
          { type: "text", text: textPrompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ]
      : textPrompt;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });


    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("[generate-motion-prompt] OpenRouter API error:", status, errorText.slice(0, 200));

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${status}`);
    }

    const aiResult = await response.json();
    const prompt = aiResult.choices?.[0]?.message?.content?.trim();

    if (!prompt) {
      throw new Error("No motion prompt generated");
    }

    return new Response(
      JSON.stringify({ success: true, prompt, language: detectedLanguage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-motion-prompt] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Motion prompt generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
