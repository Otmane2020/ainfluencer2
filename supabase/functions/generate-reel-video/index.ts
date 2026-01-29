import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

// ============================================================
// AUDIO BANK - Free Royalty-Free Music (Mixkit)
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
// IMAGE GENERATION - Lovable AI (Gemini)
// ============================================================

async function generateReelImage(prompt: string, brandName?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const finalPrompt = `
Create a stunning, scroll-stopping VERTICAL social media reel image (9:16 aspect ratio):

CONTENT: ${prompt}
${brandName ? `BRAND: ${brandName}` : ""}

CRITICAL REQUIREMENTS:
- VERTICAL FORMAT: 9:16 portrait orientation for mobile
- BOLD TYPOGRAPHY: Large, clear text that's readable on small screens
- HIGH CONTRAST: Vibrant colors that pop on mobile feeds
- MOBILE-SAFE ZONES: Keep key elements away from edges (top 10%, bottom 15%)
- PROFESSIONAL QUALITY: 4K, ultra-sharp, Instagram/TikTok ready
- ENGAGING COMPOSITION: Eye-catching focal point, clean layout
- MODERN AESTHETIC: Trendy, premium look with subtle gradients or textures

STYLE: Professional social media advertising, influencer-quality content
OUTPUT: Single static image optimized for Reels/Shorts/TikTok
`.trim();

  console.log("[REEL] Generating image with Lovable AI (Gemini)...");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: finalPrompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorText = await response.text();
    console.error("[REEL] Lovable AI error:", status, errorText.slice(0, 200));
    
    if (status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (status === 402) throw new Error("Credits required. Please add credits.");
    throw new Error(`Image generation failed: ${status}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  
  if (message?.images?.[0]?.image_url?.url) {
    return message.images[0].image_url.url;
  }
  
  if (Array.isArray(message?.content)) {
    const imagePart = message.content.find(
      (c: any) => c.type === "image" && c.image_base64
    );
    if (imagePart?.image_base64) {
      return `data:image/png;base64,${imagePart.image_base64}`;
    }
    
    const urlPart = message.content.find(
      (c: any) => c.type === "image_url" && c.image_url?.url
    );
    if (urlPart?.image_url?.url) {
      return urlPart.image_url.url;
    }
  }

  console.error("[REEL] Unexpected response structure:", JSON.stringify(data).slice(0, 300));
  throw new Error("No image returned by AI");
}

// ============================================================
// VIDEO RENDERING - Railway FFmpeg Service
// ============================================================

async function renderVideoWithRailway(
  imageUrl: string,
  audioUrl: string,
  duration: number
): Promise<{ success: boolean; videoBase64?: string; error?: string }> {
  const RAILWAY_URL = Deno.env.get("RAILWAY_VIDEO_SERVICE_URL");
  const RAILWAY_SECRET = Deno.env.get("RAILWAY_VIDEO_SERVICE_SECRET");

  if (!RAILWAY_URL || !RAILWAY_SECRET) {
    console.log("[REEL] Railway service not configured, using preview mode");
    return { success: false, error: "Railway service not configured" };
  }

  console.log("[REEL] Calling Railway FFmpeg service...");

  try {
    const response = await fetch(`${RAILWAY_URL}/render`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RAILWAY_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        audioUrl,
        duration,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[REEL] Railway error:", response.status, errorText);
      return { success: false, error: `Railway service error: ${response.status}` };
    }

    const result = await response.json();
    
    if (result.success && result.video?.base64) {
      console.log("[REEL] Railway rendered video successfully:", result.video.size, "bytes");
      return { success: true, videoBase64: result.video.base64 };
    }

    return { success: false, error: result.error || "Unknown Railway error" };
  } catch (error) {
    console.error("[REEL] Railway fetch error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, brandName, duration = 10, musicCategory = "upbeat" } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== GENERATE REEL VIDEO ===");
    console.log("Prompt:", prompt.slice(0, 80));
    console.log("Brand:", brandName || "N/A");
    console.log("Duration:", duration, "s | Music:", musicCategory);

    // Step 1: Generate image
    const imageData = await generateReelImage(prompt, brandName);
    
    // Step 2: Upload image to storage
    let imagePublicUrl: string;
    
    if (imageData.startsWith("data:")) {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      
      const imagePath = `reels/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(imagePath, imageBytes, { contentType: "image/png", upsert: true });

      if (uploadError) throw new Error("Image upload failed");

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(imagePath);
      imagePublicUrl = urlData.publicUrl;
    } else {
      console.log("[REEL] Downloading image from URL...");
      const imgResponse = await fetch(imageData);
      if (!imgResponse.ok) throw new Error(`Failed to download image: ${imgResponse.status}`);
      
      const imgBuffer = await imgResponse.arrayBuffer();
      const imageBytes = new Uint8Array(imgBuffer);
      
      const imagePath = `reels/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(imagePath, imageBytes, { contentType: "image/png", upsert: true });

      if (uploadError) throw new Error("Image upload failed");

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(imagePath);
      imagePublicUrl = urlData.publicUrl;
    }

    // Step 3: Get music track
    const musicUrl = getRandomTrack(musicCategory);

    // Step 4: Try to render real MP4 with Railway
    const railwayResult = await renderVideoWithRailway(imagePublicUrl, musicUrl, duration);

    if (railwayResult.success && railwayResult.videoBase64) {
      // Upload real MP4 to Supabase
      const videoBytes = Uint8Array.from(atob(railwayResult.videoBase64), (c) => c.charCodeAt(0));
      const videoPath = `reels/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
      
      const { error: videoUploadError } = await supabase.storage
        .from("media")
        .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });

      if (videoUploadError) {
        console.error("[REEL] Video upload error:", videoUploadError);
        throw new Error("Video upload failed");
      }

      const { data: videoUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);

      console.log("[REEL] ✅ REAL MP4 generated and uploaded!");
      console.log("  Video:", videoUrlData.publicUrl);

      return new Response(
        JSON.stringify({
          success: true,
          videoUrl: videoUrlData.publicUrl,
          imageUrl: imagePublicUrl,
          musicUrl: musicUrl,
          duration: Math.min(Math.max(duration, 5), 15),
          musicCategory,
          format: "video",
          aspectRatio: "9:16",
          status: "READY",
          message: "Real MP4 video generated with FFmpeg",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: Return image + audio for preview mode
    console.log("[REEL] Fallback to preview mode (image + audio)");
    console.log("  Image:", imagePublicUrl);
    console.log("  Music:", musicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imagePublicUrl,
        musicUrl: musicUrl,
        duration: Math.min(Math.max(duration, 5), 15),
        musicCategory,
        format: "reel",
        aspectRatio: "9:16",
        status: "READY",
        message: "Reel preview generated (configure Railway for real MP4)",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[REEL] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});