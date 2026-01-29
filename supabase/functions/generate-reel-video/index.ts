import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATE REEL VIDEO – FULL MP4 EXPORT
// Image: Gemini Pro | Audio: Free Bank | Video: CometAPI
// Format: 9:16 Reel (1080×1920) | Duration: 5-15s
// ============================================================

interface ReelVideoRequest {
  prompt: string;
  brandName?: string;
  duration?: number;
  musicCategory?: "upbeat" | "chill" | "dramatic" | "corporate" | "inspiring";
}

// ============================================================
// FREE MUSIC BANK (Mixkit – No API, No Limit, No Cost)
// ============================================================

const AUDIO_TRACKS: Record<string, string[]> = {
  upbeat: [
    "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3",
  ],
  chill: [
    "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3",
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
// IMAGE GENERATION – Gemini Pro
// ============================================================

async function generateImage(prompt: string, brandName?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
`.trim();

  console.log("[REEL] Generating image with Gemini...");

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
    console.error("[REEL] Gemini error:", status);
    if (status === 429) throw new Error("Rate limit exceeded");
    if (status === 402) throw new Error("Credits required");
    throw new Error(`Image generation failed: ${status}`);
  }

  const data = await response.json();

  // Parse base64 from multiple response formats
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
    console.error("[REEL] No image in response");
    throw new Error("No image generated");
  }

  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
  console.log("[REEL] Image generated successfully");

  return base64Data;
}

// ============================================================
// VIDEO GENERATION – CometAPI (MP4 Export)
// ============================================================

async function generateVideoMP4(imageUrl: string, musicUrl: string, duration: number): Promise<string> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) throw new Error("COMETAPI_API_KEY not configured");

  console.log("[REEL] Generating MP4 with CometAPI...");

  const response = await fetch("https://api.cometapi.com/v1/video/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COMETAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input_image: imageUrl,
      audio_url: musicUrl,
      duration,
      aspect_ratio: "9:16",
      output_format: "mp4",
      motion: "subtle",
      style: "reel",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[REEL] CometAPI error:", response.status, errorText);
    throw new Error(`CometAPI video generation failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data?.video_url) {
    console.error("[REEL] No video URL in CometAPI response");
    throw new Error("No MP4 returned by CometAPI");
  }

  console.log("[REEL] MP4 generated successfully");
  return data.video_url;
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

    const duration = Math.min(Math.max(body.duration ?? 8, 5), 15);
    const musicCategory = body.musicCategory ?? "upbeat";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== GENERATE REEL VIDEO (FULL MP4) ===");
    console.log("Prompt:", body.prompt.slice(0, 80));
    console.log("Duration:", duration, "s | Music:", musicCategory);

    // Step 1: Generate image
    const imageBase64 = await generateImage(body.prompt, body.brandName);

    // Step 2: Upload image to storage
    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const imagePath = `reels/image-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(imagePath, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[REEL] Image upload error:", uploadError);
      throw new Error("Image upload failed");
    }

    const { data: imagePublicUrl } = supabase.storage.from("media").getPublicUrl(imagePath);

    // Step 3: Get music from free bank
    const musicUrl = getRandomTrack(musicCategory);

    // Step 4: Generate MP4 via CometAPI
    const videoTempUrl = await generateVideoMP4(imagePublicUrl.publicUrl, musicUrl, duration);

    // Step 5: Download and store video in Supabase
    const videoResponse = await fetch(videoTempUrl);
    if (!videoResponse.ok) {
      throw new Error("Failed to download generated video");
    }
    const videoBuffer = await videoResponse.arrayBuffer();

    const videoPath = `reels/video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
    const { error: videoUploadError } = await supabase.storage
      .from("media")
      .upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true });

    if (videoUploadError) {
      console.error("[REEL] Video upload error:", videoUploadError);
      throw new Error("Video upload failed");
    }

    const { data: videoPublicUrl } = supabase.storage.from("media").getPublicUrl(videoPath);

    console.log("[REEL] Complete!");
    console.log("  Image:", imagePublicUrl.publicUrl);
    console.log("  Video:", videoPublicUrl.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        format: "reel",
        aspectRatio: "9:16",
        resolution: "1080x1920",
        duration,
        imageUrl: imagePublicUrl.publicUrl,
        videoUrl: videoPublicUrl.publicUrl,
        musicCategory,
        status: "VIDEO_READY",
        message: `Reel MP4 exported successfully (9:16, ${duration}s)`,
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
