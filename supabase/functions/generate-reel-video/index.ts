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
// GENERATE REEL VIDEO – IMAGE AS REEL (STABLE)
// Image: CometAPI flux-2-pro | Audio: Free Bank
// Format: 9:16 Reel (1024×1792) 
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
// IMAGE GENERATION – CometAPI flux-2-pro (9:16 vertical)
// ============================================================

async function generateImage(prompt: string, brandName?: string): Promise<string> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) throw new Error("COMETAPI_API_KEY not configured");

  const finalPrompt = `
Create a stunning vertical Reel image (9:16 aspect ratio):

${prompt}
${brandName ? `Brand: ${brandName}` : ""}

REQUIREMENTS:
- Format: 9:16 vertical portrait
- Ultra-premium advertising photography, 8K quality
- Bold, large text overlay readable on mobile
- High contrast, vibrant colors
- Professional studio lighting
- Instagram/TikTok Reel style
- Mobile-safe zones (avoid top and bottom edges)
`.trim();

  console.log("[REEL] Generating image with CometAPI flux-2-pro...");

  // Use flux-2-pro which is stable and supports 9:16
  const response = await fetch("https://api.cometapi.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COMETAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "flux-2-pro",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1792", // 9:16 vertical for reels
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorText = await response.text();
    console.error("[REEL] CometAPI error:", status, errorText.slice(0, 300));
    
    if (status === 429) throw new Error("Rate limit exceeded");
    if (status === 402) throw new Error("Credits required");
    if (status === 503) throw new Error("Image service temporarily unavailable");
    throw new Error(`Image generation failed: ${status}`);
  }

  const data = await response.json();
  console.log("[REEL] CometAPI response received");
  
  const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  
  if (!imageUrl) {
    console.error("[REEL] No image in response:", JSON.stringify(data).slice(0, 200));
    throw new Error("No image returned");
  }

  // If it's a URL, return it directly (we'll download in next step)
  if (imageUrl.startsWith("http")) {
    console.log("[REEL] Image URL received");
    return imageUrl;
  }

  // If base64, we need to upload it first
  console.log("[REEL] Image base64 received");
  return `data:image/png;base64,${imageUrl}`;
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

    console.log("=== GENERATE REEL (IMAGE AS REEL) ===");
    console.log("Prompt:", body.prompt.slice(0, 80));
    console.log("Duration:", duration, "s | Music:", musicCategory);

    // Step 1: Generate image
    const imageResult = await generateImage(body.prompt, body.brandName);
    
    let imagePublicUrl: string;
    
    // Step 2: Handle image result (URL or base64)
    if (imageResult.startsWith("http")) {
      // Download the image and upload to our storage
      console.log("[REEL] Downloading image from CometAPI...");
      const imgResponse = await fetch(imageResult);
      if (!imgResponse.ok) {
        throw new Error(`Failed to download image: ${imgResponse.status}`);
      }
      const imgBuffer = await imgResponse.arrayBuffer();
      const imageBytes = new Uint8Array(imgBuffer);
      
      const imagePath = `reels/image-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(imagePath, imageBytes, { contentType: "image/png", upsert: true });

      if (uploadError) {
        console.error("[REEL] Image upload error:", uploadError);
        throw new Error("Image upload failed");
      }

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(imagePath);
      imagePublicUrl = urlData.publicUrl;
    } else {
      // Handle base64
      const base64Data = imageResult.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      
      const imagePath = `reels/image-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(imagePath, imageBytes, { contentType: "image/png", upsert: true });

      if (uploadError) {
        console.error("[REEL] Image upload error:", uploadError);
        throw new Error("Image upload failed");
      }

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(imagePath);
      imagePublicUrl = urlData.publicUrl;
    }

    // Step 3: Get music from free bank
    const musicUrl = getRandomTrack(musicCategory);

    console.log("[REEL] Complete!");
    console.log("  Image:", imagePublicUrl);
    console.log("  Music:", musicUrl);

    // Return "Image as Reel" - ready to post as static reel with music
    return new Response(
      JSON.stringify({
        success: true,
        format: "reel",
        aspectRatio: "9:16",
        resolution: "1024x1792",
        duration,
        imageUrl: imagePublicUrl,
        videoUrl: null, // No video composition for now (CometAPI video endpoint unreliable)
        musicUrl,
        musicCategory,
        status: "IMAGE_READY",
        message: `Reel image generated (9:16). Ready for posting with background music.`,
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
