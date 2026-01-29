import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATE REEL VIDEO - UNIFIED PRO VERSION
// Format: REEL ONLY (9:16) - Mobile First - Starlinko Ready
// Duration: 5-15 seconds
// Image: Gemini Pro (high quality)
// Audio: ElevenLabs (optional) + Audio Bank (fallback)
// Output: Assets ready for external video API
// ============================================================

interface ReelVideoRequest {
  prompt: string;
  brandName?: string;
  duration?: number;
  musicCategory?: "upbeat" | "chill" | "dramatic" | "corporate" | "inspiring";
  musicPrompt?: string;
}

// Audio bank - guaranteed fallback
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
// IMAGE GENERATION - Gemini Pro (High Quality)
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
    const finalPrompt = `
Create a stunning vertical Reel image (9:16, 1080×1920):

${prompt}
${brandName ? `Brand: ${brandName}` : ""}

REQUIREMENTS:
- Format: 9:16 vertical portrait (1080×1920)
- Ultra-premium advertising photography, 8K quality
- Bold, large text overlay readable on mobile
- High contrast, vibrant colors
- Professional studio lighting
- Instagram/TikTok Reel style
- Mobile-safe zones (avoid top 150px and bottom 200px)
- Include CTA text: "Download Now", "Try Free", or "Get Started"
`.trim();

    console.log("[REEL-VIDEO] Generating PRO image with Gemini...");

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
      const status = response.status;
      console.error("[REEL-VIDEO] Gemini error:", status);
      
      if (status === 429) return { imageBase64: "", error: "Rate limit exceeded" };
      if (status === 402) return { imageBase64: "", error: "Credits required" };
      return { imageBase64: "", error: `Image generation failed: ${status}` };
    }

    const data = await response.json();
    
    // Parse base64 from multiple possible response formats
    let imageData: string | null = null;

    // Format 1: images array
    if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
      imageData = data.choices[0].message.images[0].image_url.url;
    }
    
    // Format 2: content array with image type
    if (!imageData && Array.isArray(data.choices?.[0]?.message?.content)) {
      const imagePart = data.choices[0].message.content.find(
        (c: { type: string; image_base64?: string }) => c.type === "image"
      );
      if (imagePart?.image_base64) {
        imageData = `data:image/png;base64,${imagePart.image_base64}`;
      }
    }

    // Format 3: direct base64 string
    if (!imageData && typeof data.choices?.[0]?.message?.content === "string") {
      const content = data.choices[0].message.content;
      if (content.startsWith("data:image")) {
        imageData = content;
      }
    }

    if (!imageData) {
      console.error("[REEL-VIDEO] No image in response");
      return { imageBase64: "", error: "No image generated" };
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    console.log("[REEL-VIDEO] Image generated successfully");
    
    return { imageBase64: base64Data };

  } catch (error) {
    console.error("[REEL-VIDEO] Image error:", error);
    return { imageBase64: "", error: String(error) };
  }
}

// ============================================================
// MUSIC GENERATION - ElevenLabs (Optional)
// ============================================================

async function generateMusic(prompt: string, duration: number): Promise<string | null> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

  if (!ELEVENLABS_API_KEY) {
    console.log("[REEL-VIDEO] No ElevenLabs key, using audio bank");
    return null;
  }

  try {
    console.log("[REEL-VIDEO] Generating custom music...");
    
    const response = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${prompt}. ${duration} second track for social media reel.`,
        duration_seconds: duration,
      }),
    });

    if (!response.ok) {
      console.log("[REEL-VIDEO] ElevenLabs failed, using fallback");
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    
    console.log("[REEL-VIDEO] Custom music generated");
    return `data:audio/mpeg;base64,${base64Encode(audioBuffer)}`;
    
  } catch (error) {
    console.log("[REEL-VIDEO] Music error, using fallback:", error);
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

    // Enforce Reel specs: 9:16, 5-15s
    const duration = Math.min(Math.max(body.duration ?? 10, 5), 15);
    const musicCategory = body.musicCategory ?? "upbeat";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== GENERATE REEL VIDEO (PRO) ===");
    console.log("Prompt:", body.prompt.slice(0, 80));
    console.log("Duration:", duration, "s | Music:", musicCategory);

    // Step 1: Generate PRO image
    const imageResult = await generateImage(body.prompt, body.brandName);
    
    if (!imageResult.imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: imageResult.error, step: "image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upload to storage
    const imageBytes = Uint8Array.from(atob(imageResult.imageBase64), (c) => c.charCodeAt(0));
    const imagePath = `reels/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(imagePath, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[REEL-VIDEO] Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: "Image upload failed", step: "upload" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: imagePublicUrl } = supabase.storage.from("media").getPublicUrl(imagePath);

    // Step 3: Get music (ElevenLabs optional, fallback guaranteed)
    let musicUrl = getRandomTrack(musicCategory);
    
    if (body.musicPrompt) {
      const customMusic = await generateMusic(body.musicPrompt, duration);
      if (customMusic) musicUrl = customMusic;
    }

    console.log("[REEL-VIDEO] Complete!");
    console.log("  Image:", imagePublicUrl.publicUrl);
    console.log("  Music:", musicUrl.startsWith("data:") ? "Custom" : "Bank");

    // Return assets ready for video composition
    return new Response(
      JSON.stringify({
        success: true,
        format: "reel",
        aspectRatio: "9:16",
        resolution: "1080x1920",
        duration,
        imageUrl: imagePublicUrl.publicUrl,
        musicUrl,
        musicCategory,
        videoReady: false,
        nextStep: "compose_video",
        message: `Reel assets ready (9:16, ${duration}s). Use video API for MP4 export.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[REEL-VIDEO] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
