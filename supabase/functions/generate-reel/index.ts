import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATE REEL: Image + ElevenLabs Audio -> Video
// Uses MiniMax (cheapest) for image-to-video conversion
// ============================================================

interface ReelRequest {
  prompt: string;           // Image description prompt
  voiceText: string;        // Text for ElevenLabs voiceover
  voiceId?: string;         // ElevenLabs voice ID
  duration?: number;        // Target duration in seconds (4 or 6)
  format?: "reel" | "story" | "landscape";
  brandName?: string;
  detectedLanguage?: string;
}

// Step 1: Generate image using Lovable AI (always available)
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
    // Build enhanced prompt
    let enhancedPrompt = prompt;
    if (brandName) {
      enhancedPrompt = `${prompt} for ${brandName} brand`;
    }
    
    // Add format context
    if (format === "reel" || format === "story") {
      enhancedPrompt += ". Vertical portrait format 9:16, social media style, eye-catching, professional quality, ultra high resolution.";
    } else {
      enhancedPrompt += ". Horizontal landscape format 16:9, professional quality, ultra high resolution.";
    }

    console.log("[REEL] Step 1: Generating image with Lovable AI (Gemini)...");
    
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

// Step 2: Generate audio using ElevenLabs TTS
async function generateAudio(
  text: string,
  voiceId: string
): Promise<{ audioUrl: string | null; error?: string }> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!ELEVENLABS_API_KEY) {
    return { audioUrl: null, error: "ELEVENLABS_API_KEY not configured" };
  }

  try {
    console.log("[REEL] Step 2: Generating voiceover with ElevenLabs...");
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[REEL] ElevenLabs error:", response.status, errorText.slice(0, 200));
      return { audioUrl: null, error: `ElevenLabs error: ${response.status}` };
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[REEL] Audio generated, size:", audioBuffer.byteLength, "bytes");

    // Upload audio to Supabase storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileName = `audio/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
    
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, new Uint8Array(audioBuffer), {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[REEL] Audio upload error:", uploadError);
      return { audioUrl: null, error: "Failed to upload audio" };
    }

    const { data: publicUrlData } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    console.log("[REEL] Audio uploaded:", publicUrlData.publicUrl);
    return { audioUrl: publicUrlData.publicUrl };
  } catch (error) {
    console.error("[REEL] Audio generation exception:", error);
    return { audioUrl: null, error: String(error) };
  }
}

// Step 3: Generate video using Sora-2 (text-to-video with image context)
async function generateVideo(
  imageUrl: string,
  prompt: string,
  duration: number,
  format: string
): Promise<{ taskId: string | null; videoUrl?: string; error?: string }> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) {
    return { taskId: null, error: "COMETAPI_API_KEY not configured" };
  }

  try {
    // Sora-2 supports 4, 8, 12 seconds
    const validDuration = duration <= 5 ? 4 : duration <= 9 ? 8 : 12;
    const size = format === "landscape" ? "1280x720" : "720x1280";

    // Build prompt that incorporates the image description for context
    // Since image-to-video params vary by model, we use text-to-video with enhanced prompt
    const videoPrompt = `${prompt}. Smooth, cinematic camera motion. Ken Burns effect with subtle zoom and pan. Professional quality video with natural movement. Social media reel style.`;

    console.log("[REEL] Step 3: Creating video with Sora-2 (text-to-video)...");
    console.log("[REEL] Duration:", validDuration, "s | Size:", size);
    console.log("[REEL] Note: Image URL saved for reference:", imageUrl);

    const formData = new FormData();
    formData.append("prompt", videoPrompt);
    formData.append("model", "sora-2");
    formData.append("seconds", validDuration.toString());
    formData.append("size", size);
    // Note: Not using image_url as Sora-2 doesn't support it - video will be based on prompt

    const response = await fetch("https://api.cometapi.com/v1/videos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[REEL] Video generation error:", errorText);
      return { taskId: null, error: `Video generation failed: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    console.log("[REEL] Video task created:", result.id);

    return { 
      taskId: result.id, 
      videoUrl: result.video_url || result.url,
    };
  } catch (error) {
    console.error("[REEL] Video generation exception:", error);
    return { taskId: null, error: String(error) };
  }
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    // ============================================================
    // STATUS CHECK
    // ============================================================
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        return new Response(
          JSON.stringify({ error: "taskId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
      
      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Status check failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      const videoData = result.data || result;
      const innerData = videoData.data || {};
      
      const rawStatus = videoData.status || innerData.status || "in_progress";
      const taskStatus = rawStatus.toLowerCase();
      const progress = innerData.progress || videoData.progress || 0;

      // Extract video URL
      let videoUrl = undefined;
      if (taskStatus === "success" || taskStatus === "succeeded" || taskStatus === "completed") {
        videoUrl = videoData.video_url || videoData.url || videoData.output_video ||
                   innerData.video_url || innerData.url || innerData.output_video;
                   
        // Fallback: fetch content endpoint
        if (!videoUrl) {
          try {
            const contentResponse = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
              headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
            });
            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              videoUrl = contentData.url || contentData.video_url || contentData.download_url;
            }
          } catch (e) {
            console.error("[REEL] Content endpoint error:", e);
          }
        }
      }

      return new Response(
        JSON.stringify({
          taskId,
          status: taskStatus,
          progress: typeof progress === "string" ? parseInt(progress.replace("%", "")) : progress,
          videoUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // CREATE REEL
    // ============================================================
    const {
      prompt,
      voiceText,
      voiceId = "EXAVITQu4vr4xnSDxMaL", // Sarah (default)
      duration = 6,
      format = "reel",
      brandName,
      detectedLanguage = "en",
    }: ReelRequest = await req.json();

    if (!prompt || !voiceText) {
      return new Response(
        JSON.stringify({ error: "prompt and voiceText are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== GENERATE REEL ===");
    console.log("Prompt:", prompt.slice(0, 100));
    console.log("Voice Text:", voiceText.slice(0, 100));
    console.log("Format:", format, "| Duration:", duration, "s");

    // Step 1: Generate image
    const imageResult = await generateImage(prompt, format, brandName);
    if (!imageResult.imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: imageResult.error, step: "image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Generate audio (async - don't wait, just get URL for later)
    const audioResult = await generateAudio(voiceText, voiceId);
    if (!audioResult.audioUrl) {
      console.warn("[REEL] Audio generation failed, continuing without audio:", audioResult.error);
    }

    // Step 3: Generate video from image
    const videoResult = await generateVideo(imageResult.imageUrl, prompt, duration, format);
    
    // If video generation fails, still return success with image + audio
    // User can manually combine them or retry later
    if (!videoResult.taskId && !videoResult.videoUrl) {
      console.warn("[REEL] Video generation failed, returning image + audio only:", videoResult.error);
      return new Response(
        JSON.stringify({
          success: true,
          partial: true,
          imageUrl: imageResult.imageUrl,
          audioUrl: audioResult.audioUrl,
          videoTaskId: null,
          videoUrl: null,
          model: "sora-2",
          duration,
          format,
          message: "Image and audio generated successfully. Video generation temporarily unavailable - you can use these assets to create a reel manually or retry later.",
          videoError: videoResult.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[REEL] Pipeline complete!");
    console.log("  Image:", imageResult.imageUrl);
    console.log("  Audio:", audioResult.audioUrl || "none");
    console.log("  Video Task:", videoResult.taskId);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageResult.imageUrl,
        audioUrl: audioResult.audioUrl,
        videoTaskId: videoResult.taskId,
        videoUrl: videoResult.videoUrl, // May be available immediately
        model: "sora-2",
        duration,
        format,
        message: "Reel generation started. Poll status with ?action=status&taskId=" + videoResult.taskId,
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
