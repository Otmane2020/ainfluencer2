import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATE REEL: Mobile-First Image + Music → Social Reel
// Starlinko is a MOBILE APPLICATION for social media content
// Output: 9:16 vertical image with bold text + royalty-free music
// ============================================================

interface ReelRequest {
  prompt: string;
  format?: "reel" | "story" | "landscape";
  brandName?: string;
  musicCategory?: "upbeat" | "chill" | "dramatic" | "corporate" | "inspiring";
  duration?: number;
}

// Audio bank - royalty-free tracks
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
    // MOBILE-FIRST PROMPT ENGINEERING FOR STARLINKO APP
    // Starlinko is a mobile application - all content must be mobile-optimized
    const brandContext = brandName ? `for ${brandName} (mobile application), ` : "";
    
    // Ultra-premium mobile-first visual style
    const visualStyle = `
CRITICAL REQUIREMENTS:
- FORMAT: Strictly 9:16 vertical portrait (1080×1920)
- This is for Starlinko, a MOBILE APPLICATION for social media content management
- Design must be optimized for MOBILE VIEWING on Instagram, TikTok, Facebook Reels

VISUAL STYLE:
- Ultra-premium advertising photography, magazine-quality, award-winning commercial design
- Bold dynamic layout with strong focal point, mobile-safe zones respected
- Professional studio lighting with dramatic highlights and soft shadows
- Rich vibrant colors, high contrast, eye-catching gradients
- 8K ultra-sharp, photorealistic, crisp details, professional retouching

MANDATORY TEXT OVERLAY:
- Include BOLD, LARGE text overlay directly on the image
- Use modern sans-serif font (white or contrasting color with shadow)
- Text must be READABLE on mobile screens (large typography)
- Include motivational hook or CTA: "Download Now", "Try Free", "Join Today", "Get Started", etc.
- Add 1-2 key benefit keywords as text overlay

MOBILE APP CONTEXT:
- Show mobile app interface mockups when relevant
- Smartphone screens, app icons, people using mobile devices
- Modern tech aesthetic with clean mobile UI elements

DO NOT:
- Use small text that's unreadable on mobile
- Create landscape or square formats
- Add complex details that get lost on small screens
- Use dull colors or low contrast
`;

    let enhancedPrompt = `Create a stunning, scroll-stopping mobile social media Reel image: ${prompt}. ${brandContext}${visualStyle}`;
    
    // Add format-specific constraints
    if (format === "reel" || format === "story") {
      enhancedPrompt += `
REEL FORMAT (9:16):
- Full bleed vertical design, 1080×1920 resolution
- Content centered for mobile viewing
- Strong hook visual in center for first 2-second attention grab
- Text overlays in safe zones (avoid top 150px and bottom 200px)
- Maximum visual impact for social media feed scrolling`;
    } else {
      enhancedPrompt += `
LANDSCAPE FORMAT (16:9):
- Horizontal widescreen composition
- Cinematic look for YouTube/Facebook`;
    }

    console.log("[REEL] Generating mobile-first image with Lovable AI...");
    console.log("[REEL] Brand:", brandName || "none");
    
    // Use Gemini Pro Image for highest quality
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
        return { imageUrl: null, error: "Rate limit exceeded. Please try again in a moment." };
      }
      if (status === 402) {
        return { imageUrl: null, error: "Credits required. Please add credits to continue." };
      }
      return { imageUrl: null, error: `Image generation failed: ${status}` };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("[REEL] No image in response:", JSON.stringify(data).slice(0, 300));
      return { imageUrl: null, error: "No image generated by AI" };
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

    console.log("=== GENERATE REEL (Mobile-First Image + Music) ===");
    console.log("Prompt:", prompt.slice(0, 100));
    console.log("Format:", format, "| Music:", musicCategory, "| Duration:", duration, "s");
    console.log("Brand:", brandName || "none");

    // Step 1: Generate image with Lovable AI (Gemini Pro)
    const imageResult = await generateImage(prompt, format, brandName);
    if (!imageResult.imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: imageResult.error, step: "image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get background music from audio bank
    const musicUrl = getRandomTrack(musicCategory as keyof typeof AUDIO_TRACKS);

    console.log("[REEL] Pipeline complete!");
    console.log("  Image:", imageResult.imageUrl);
    console.log("  Music:", musicUrl);
    console.log("  Duration:", duration, "s");

    // Return image + music URLs for client-side reel composition
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageResult.imageUrl,
        musicUrl,
        duration,
        format,
        musicCategory,
        message: `Reel ready! Mobile-optimized 9:16 image with ${musicCategory} background music (${duration}s).`,
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
