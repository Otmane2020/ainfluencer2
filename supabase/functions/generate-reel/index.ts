import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATE REEL: Image + Background Music (NO video generation)
// Uses Lovable AI Gemini for image + royalty-free music tracks
// Output: Static image with 10s background music = Instagram Reel
// ============================================================

interface ReelRequest {
  prompt: string;           // Image description prompt
  format?: "reel" | "story" | "landscape";
  brandName?: string;
  musicCategory?: "upbeat" | "chill" | "dramatic" | "corporate" | "inspiring";
  duration?: number;        // 10 seconds default for reels
}

// Audio bank - royalty-free 30-second tracks (trimmed to 10s on client)
const AUDIO_TRACKS = {
  upbeat: [
    "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3",
  ],
  chill: [
    "https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
  ],
  dramatic: [
    "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-epic-orchestra-transition-2290.mp3",
  ],
  corporate: [
    "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
  ],
  inspiring: [
    "https://assets.mixkit.co/music/preview/mixkit-spirit-of-the-explorer-723.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-837.mp3",
  ],
};

function getRandomTrack(category: keyof typeof AUDIO_TRACKS): string {
  const tracks = AUDIO_TRACKS[category] || AUDIO_TRACKS.upbeat;
  return tracks[Math.floor(Math.random() * tracks.length)];
}

// Generate image using Lovable AI (Gemini Pro for high quality)
async function generateImage(
  prompt: string, 
  format: string,
  brandName?: string
): Promise<{ imageUrl: string | null; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!LOVABLE_API_KEY) {
    return { imageUrl: null, error: "LOVABLE_API_KEY not configured" };
  }

  try {
    // Build PREMIUM enhanced prompt for attractive social media visuals
    const brandContext = brandName ? `for ${brandName} (mobile application), ` : "";
    
    // Core visual style for high-impact social media content
    const visualStyle = `
STYLE: Ultra-premium advertising photography, magazine-quality, award-winning commercial design.
COMPOSITION: Bold dynamic layout with strong focal point, rule of thirds, leading lines.
LIGHTING: Professional studio lighting with dramatic highlights and soft shadows, golden hour warmth.
COLORS: Rich vibrant colors, high contrast, eye-catching gradients, premium color grading.
QUALITY: 8K ultra-sharp, photorealistic, crisp details, professional retouching.
TEXT OVERLAY: Include bold motivational keywords or call-to-action text directly on the image in modern sans-serif font (white or contrasting color with subtle shadow for readability). Add engaging text like "Download Now", "Try Free", "Join Us" or key feature benefits.
MOBILE APP CONTEXT: Show mobile app interface mockups, smartphone screens, app icons, or people using mobile devices when relevant.
`;

    let enhancedPrompt = `Create a stunning, scroll-stopping social media visual: ${prompt}. ${brandContext}${visualStyle}`;
    
    // Add format context for social media
    if (format === "reel" || format === "story") {
      enhancedPrompt += `
FORMAT: Vertical portrait 9:16 aspect ratio, optimized for Instagram Reels and Stories.
LAYOUT: Full bleed design, content centered for mobile viewing, text in safe zones.
IMPACT: Maximum visual impact for 3-second attention grab, bold and unmissable.
MOBILE-FIRST: Show smartphone mockups or mobile UI when showcasing app features.`;
    } else {
      enhancedPrompt += `
FORMAT: Horizontal landscape 16:9 aspect ratio, optimized for YouTube and Facebook.
LAYOUT: Cinematic widescreen composition, professional advertising look.`;
    }

    console.log("[REEL] Generating image with Lovable AI (Gemini)...");
    console.log("[REEL] Prompt:", enhancedPrompt.slice(0, 150));
    
    // Use Gemini Pro Image for higher quality output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("[REEL] Lovable AI error:", status, errorText.slice(0, 200));
      
      if (status === 429) {
        return { imageUrl: null, error: "Rate limit exceeded. Please try again later." };
      }
      if (status === 402) {
        return { imageUrl: null, error: "Credits required. Please add credits." };
      }
      return { imageUrl: null, error: `Image generation failed: ${status}` };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("[REEL] No image in Lovable AI response");
      return { imageUrl: null, error: "No image generated" };
    }

    // Upload to Supabase storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `images/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[REEL] Image upload error:", uploadError);
      // Return base64 as fallback
      return { imageUrl: imageData };
    }

    const { data: publicUrlData } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    console.log("[REEL] Image generated and uploaded:", publicUrlData.publicUrl);
    return { imageUrl: publicUrlData.publicUrl };
  } catch (error) {
    console.error("[REEL] Image generation exception:", error);
    return { imageUrl: null, error: String(error) };
  }
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      format = "reel",
      brandName,
      musicCategory = "upbeat",
      duration = 10,
    }: ReelRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== GENERATE REEL (Image + Music) ===");
    console.log("Prompt:", prompt.slice(0, 100));
    console.log("Format:", format, "| Music:", musicCategory, "| Duration:", duration, "s");

    // Step 1: Generate image with Lovable AI (Gemini - cheap/free)
    const imageResult = await generateImage(prompt, format, brandName);
    if (!imageResult.imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: imageResult.error, step: "image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get background music from audio bank (royalty-free)
    const musicUrl = getRandomTrack(musicCategory as keyof typeof AUDIO_TRACKS);

    console.log("[REEL] Pipeline complete!");
    console.log("  Image:", imageResult.imageUrl);
    console.log("  Music:", musicUrl);
    console.log("  Duration:", duration, "s");

    // Return image + music URLs - client will combine them for posting
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageResult.imageUrl,
        musicUrl,
        duration,
        format,
        musicCategory,
        message: `Reel assets ready! Static image with ${musicCategory} background music (${duration}s). Upload as Instagram Reel.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[REEL] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
