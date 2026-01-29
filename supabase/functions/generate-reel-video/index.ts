import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATE REEL VIDEO - FIXED VERSION
// Format: REEL ONLY (9:16) - Mobile First - Starlinko Ready
// Duration: 5-15 seconds strict
// Output: Assets ready for external video API (Banana/Fal/Replicate)
// ============================================================

interface ReelVideoRequest {
  prompt: string;
  brandName?: string;
  duration?: number; // 5-15 seconds
  musicCategory?: "upbeat" | "chill" | "dramatic" | "corporate" | "inspiring";
  musicPrompt?: string;
}

// Audio bank - fallback ALWAYS works
const AUDIO_TRACKS: Record<string, string[]> = {
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

function getRandomTrack(category: string): string {
  const tracks = AUDIO_TRACKS[category] || AUDIO_TRACKS.upbeat;
  return tracks[Math.floor(Math.random() * tracks.length)];
}

// ============================================================
// IMAGE GENERATION - Gemini with CORRECT base64 parsing
// ============================================================

async function generateImage(
  prompt: string,
  brandName?: string
): Promise<{ imageBase64: string; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return { imageBase64: "", error: "LOVABLE_API_KEY not configured" };
  }

  try {
    // Mobile-first prompt for Starlinko (mobile application)
    const finalPrompt = `
Create a stunning vertical Reel image for Starlinko mobile app:

${prompt}
${brandName ? `Brand: ${brandName}` : ""}

CRITICAL REQUIREMENTS:
- Format: 9:16 vertical portrait (1080×1920)
- Starlinko is a MOBILE APPLICATION for social media content
- Ultra-premium advertising photography, 8K quality
- Bold, large text overlay readable on mobile
- High contrast, vibrant colors
- Clean background, professional studio lighting
- Instagram/TikTok Reel style
- Mobile-safe zones respected (avoid top 150px and bottom 200px)
- Include motivational CTA text: "Download Now", "Try Free", "Get Started"
`.trim();

    console.log("[REEL-VIDEO] Generating image with Gemini...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: finalPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[REEL-VIDEO] Gemini error:", response.status, errorText.slice(0, 200));
      
      if (response.status === 429) {
        return { imageBase64: "", error: "Rate limit exceeded. Please try again later." };
      }
      if (response.status === 402) {
        return { imageBase64: "", error: "Credits required. Please add credits." };
      }
      return { imageBase64: "", error: `Image generation failed: ${response.status}` };
    }

    const data = await response.json();
    
    // Method 1: Check for images array (standard format)
    let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Method 2: Check for content array with image type
    if (!imageData) {
      const imagePart = data.choices?.[0]?.message?.content?.find?.(
        (c: { type: string; image_base64?: string }) => c.type === "image"
      );
      if (imagePart?.image_base64) {
        imageData = `data:image/png;base64,${imagePart.image_base64}`;
      }
    }

    // Method 3: Check if content itself is base64
    if (!imageData && typeof data.choices?.[0]?.message?.content === "string") {
      const content = data.choices[0].message.content;
      if (content.startsWith("data:image")) {
        imageData = content;
      }
    }

    if (!imageData) {
      console.error("[REEL-VIDEO] No image in response:", JSON.stringify(data).slice(0, 500));
      return { imageBase64: "", error: "No image generated by AI" };
    }

    // Extract base64 from data URL
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    
    console.log("[REEL-VIDEO] Image generated successfully");
    return { imageBase64: base64Data };

  } catch (error) {
    console.error("[REEL-VIDEO] Image generation error:", error);
    return { imageBase64: "", error: String(error) };
  }
}

// ============================================================
// MUSIC GENERATION - ElevenLabs OPTIONAL (fallback guaranteed)
// ============================================================

async function generateMusic(prompt: string, duration: number): Promise<string | null> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

  if (!ELEVENLABS_API_KEY) {
    console.log("[REEL-VIDEO] No ElevenLabs API key, using audio bank fallback");
    return null;
  }

  try {
    console.log("[REEL-VIDEO] Attempting ElevenLabs music generation...");
    
    const response = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${prompt}. ${duration} second track, perfect for social media reel, catchy and engaging.`,
        duration_seconds: duration,
      }),
    });

    if (!response.ok) {
      console.log("[REEL-VIDEO] ElevenLabs failed, using fallback:", response.status);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    const audioBase64 = base64Encode(audioBuffer);

    console.log("[REEL-VIDEO] Custom music generated successfully");
    return `data:audio/mpeg;base64,${audioBase64}`;
    
  } catch (error) {
    console.log("[REEL-VIDEO] ElevenLabs error, using fallback:", error);
    return null;
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ReelVideoRequest = await req.json();

    if (!body.prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Force Reel format (9:16 only) and safe duration (5-15s)
    const safeDuration = Math.min(Math.max(body.duration ?? 10, 5), 15);
    const musicCategory = body.musicCategory ?? "upbeat";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== GENERATE REEL VIDEO (FIXED VERSION) ===");
    console.log("Prompt:", body.prompt.slice(0, 100));
    console.log("Brand:", body.brandName || "none");
    console.log("Duration:", safeDuration, "s | Music:", musicCategory);

    // Step 1: Generate image with Gemini (base64)
    const imageResult = await generateImage(body.prompt, body.brandName);
    
    if (!imageResult.imageBase64) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: imageResult.error || "Image generation failed",
          step: "image" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upload image to Supabase storage
    const imageBytes = Uint8Array.from(atob(imageResult.imageBase64), (c) => c.charCodeAt(0));
    const imagePath = `reels/reel-image-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(imagePath, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[REEL-VIDEO] Image upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to upload image", step: "upload" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: imagePublicUrl } = supabase.storage.from("media").getPublicUrl(imagePath);

    // Step 3: Get music (ElevenLabs optional + fallback guaranteed)
    let musicUrl = getRandomTrack(musicCategory);
    
    if (body.musicPrompt) {
      const customMusic = await generateMusic(body.musicPrompt, safeDuration);
      if (customMusic) {
        musicUrl = customMusic;
      }
    }

    console.log("[REEL-VIDEO] Pipeline complete!");
    console.log("  Image:", imagePublicUrl.publicUrl);
    console.log("  Music:", musicUrl.startsWith("data:") ? "Custom (base64)" : musicUrl);
    console.log("  Duration:", safeDuration, "s");

    // Return assets ready for external video API
    return new Response(
      JSON.stringify({
        success: true,
        format: "reel",
        aspectRatio: "9:16",
        resolution: "1080x1920",
        duration: safeDuration,
        imageUrl: imagePublicUrl.publicUrl,
        musicUrl,
        musicCategory,
        // Clear indication that MP4 composition requires external API
        videoGeneration: "external_api_required",
        nextStep: "send_to_video_api",
        recommendedApis: ["Banana", "Fal.ai", "Replicate", "CometAPI"],
        message: `Reel assets ready (9:16, ${safeDuration}s). Send to video API for MP4 composition.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[REEL-VIDEO] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
