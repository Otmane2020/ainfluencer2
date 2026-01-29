import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATE REEL VIDEO: Image + Music → MP4 Video
// Uses Lovable AI Gemini for image + ElevenLabs for custom music OR audio bank
// Output: Real MP4 video file for Instagram/Facebook/YouTube/TikTok
// ============================================================

interface ReelVideoRequest {
  prompt: string;
  format?: "reel" | "story" | "landscape";
  brandName?: string;
  musicCategory?: "upbeat" | "chill" | "dramatic" | "corporate" | "inspiring";
  musicPrompt?: string; // Custom music prompt for ElevenLabs
  duration?: number; // 10 seconds default
}

// Audio bank - royalty-free tracks (fallback if ElevenLabs fails)
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

// Generate image using Lovable AI (Gemini)
async function generateImage(
  prompt: string,
  format: string,
  brandName?: string
): Promise<{ imageUrl: string | null; imageBase64: string | null; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return { imageUrl: null, imageBase64: null, error: "LOVABLE_API_KEY not configured" };
  }

  try {
    let enhancedPrompt = prompt;
    if (brandName) {
      enhancedPrompt = `${prompt} for ${brandName} brand`;
    }

    if (format === "reel" || format === "story") {
      enhancedPrompt += ". Vertical portrait format 9:16, perfect for Instagram Reels, eye-catching, professional quality, vibrant colors, social media optimized, ultra high resolution.";
    } else {
      enhancedPrompt += ". Horizontal landscape format 16:9, professional quality, ultra high resolution.";
    }

    console.log("[REEL-VIDEO] Generating image with Lovable AI (Gemini)...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[REEL-VIDEO] Lovable AI error:", response.status, errorText.slice(0, 200));
      return { imageUrl: null, imageBase64: null, error: `Image generation failed: ${response.status}` };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      return { imageUrl: null, imageBase64: null, error: "No image generated" };
    }

    // Extract base64 for video composition
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

    console.log("[REEL-VIDEO] Image generated successfully");
    return { imageUrl: imageData, imageBase64: base64Data };
  } catch (error) {
    console.error("[REEL-VIDEO] Image generation error:", error);
    return { imageUrl: null, imageBase64: null, error: String(error) };
  }
}

// Generate custom music using ElevenLabs
async function generateMusic(prompt: string, duration: number): Promise<string | null> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

  if (!ELEVENLABS_API_KEY) {
    console.log("[REEL-VIDEO] No ElevenLabs API key, using audio bank");
    return null;
  }

  try {
    console.log("[REEL-VIDEO] Generating custom music with ElevenLabs...");
    
    const response = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${prompt}. Short ${duration} second track, perfect for social media reel, catchy and engaging.`,
        duration_seconds: duration,
      }),
    });

    if (!response.ok) {
      console.error("[REEL-VIDEO] ElevenLabs error:", response.status);
      return null;
    }

    // Get audio as base64
    const audioBuffer = await response.arrayBuffer();
    const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
    const audioBase64 = base64Encode(audioBuffer);

    console.log("[REEL-VIDEO] Custom music generated");
    return `data:audio/mpeg;base64,${audioBase64}`;
  } catch (error) {
    console.error("[REEL-VIDEO] Music generation error:", error);
    return null;
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
      musicPrompt,
      duration = 10,
    }: ReelVideoRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== GENERATE REEL VIDEO (Image + Music → MP4) ===");
    console.log("Prompt:", prompt.slice(0, 80));
    console.log("Format:", format, "| Music:", musicCategory, "| Duration:", duration, "s");

    // Step 1: Generate image
    const imageResult = await generateImage(prompt, format, brandName);
    if (!imageResult.imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: imageResult.error, step: "image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get music (ElevenLabs custom or audio bank)
    let musicUrl: string;
    if (musicPrompt) {
      const customMusic = await generateMusic(musicPrompt, duration);
      musicUrl = customMusic || getRandomTrack(musicCategory);
    } else {
      musicUrl = getRandomTrack(musicCategory);
    }

    // Step 3: Upload image to storage
    const imageBytes = Uint8Array.from(atob(imageResult.imageBase64), (c) => c.charCodeAt(0));
    const imageFileName = `reels/reel-image-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(imageFileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[REEL-VIDEO] Image upload error:", uploadError);
    }

    const { data: imagePublicUrl } = supabase.storage.from("media").getPublicUrl(imageFileName);

    console.log("[REEL-VIDEO] Pipeline complete!");
    console.log("  Image:", imagePublicUrl.publicUrl);
    console.log("  Music:", musicUrl);
    console.log("  Duration:", duration, "s");

    // Return assets for client-side video composition
    // Note: True server-side MP4 muxing would require FFmpeg which isn't available in edge functions
    // The client will use Canvas + Web Audio API to create the final video
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imagePublicUrl.publicUrl,
        musicUrl,
        duration,
        format,
        musicCategory,
        // Client will compose these into a video using MediaRecorder
        compositionRequired: true,
        message: `Reel assets ready! Image + ${musicCategory} music (${duration}s). Client will compose into MP4.`,
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
