import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// CORS – Simplified for mobile/WebView compatibility
// ============================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// ============================================================
// GENERATE REEL VIDEO – FULL MP4 EXPORT (PROD-SAFE)
// Image: Gemini 2.5 Flash | Audio: Free Bank | Video: CometAPI
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
// IMAGE GENERATION – Gemini 2.5 Flash (PROD STABLE)
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

  console.log("[REEL] Generating image with Gemini 2.5 Flash...");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: finalPrompt }],
      modalities: ["image"],
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
  const message = data?.choices?.[0]?.message;

  // Secure parsing: only accept image_base64 from content array
  const imagePart = Array.isArray(message?.content)
    ? message.content.find((c: { type: string; image_base64?: string }) => 
        c.type === "image" && c.image_base64
      )
    : null;

  if (!imagePart?.image_base64) {
    console.error("[REEL] No image in Gemini response");
    throw new Error("No image returned by Gemini");
  }

  console.log("[REEL] Image generated successfully");
  return imagePart.image_base64;
}

// ============================================================
// COMET API POLLING (for async video generation)
// ============================================================

async function waitForCometVideo(jobId: string): Promise<string> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) throw new Error("COMETAPI_API_KEY not configured");

  const STATUS_URL = `https://api.cometapi.com/v1/video/status/${jobId}`;
  const MAX_ATTEMPTS = 30;  // ~60s max
  const DELAY_MS = 2000;

  console.log(`[REEL] Polling CometAPI job: ${jobId}`);

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const res = await fetch(STATUS_URL, {
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Comet status check failed (${res.status})`);
    }

    const data = await res.json();
    console.log(`[REEL] Poll ${i + 1}/${MAX_ATTEMPTS}: status=${data.status}`);

    if (data.status === "completed" && data.video_url) {
      console.log("[REEL] Video ready!");
      return data.video_url;
    }

    if (data.status === "failed") {
      throw new Error("CometAPI video generation failed");
    }

    // Still processing, wait before next poll
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  throw new Error("CometAPI video generation timeout");
}

// ============================================================
// VIDEO GENERATION – CometAPI (async-safe)
// ============================================================

async function generateVideoMP4(
  imageUrl: string,
  musicUrl: string,
  duration: number
): Promise<string> {
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

  // Handle instant response
  if (data.video_url) {
    console.log("[REEL] Instant video URL received");
    return data.video_url;
  }

  // Handle async response (needs polling)
  if (data.job_id) {
    console.log("[REEL] Async job started, polling...");
    return await waitForCometVideo(data.job_id);
  }

  throw new Error("Invalid CometAPI response: no video_url or job_id");
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

    console.log("=== GENERATE REEL VIDEO (PROD-SAFE MP4) ===");
    console.log("Prompt:", body.prompt.slice(0, 80));
    console.log("Duration:", duration, "s | Music:", musicCategory);

    // Step 1: Generate image with Gemini
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

    // Step 4: Generate MP4 via CometAPI (handles async polling)
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
