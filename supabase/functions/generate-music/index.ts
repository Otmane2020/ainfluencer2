import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// MUSIC MODEL POOL CONFIGURATION
// ============================================================

interface MusicModelOption {
  id: string;
  apiModel: string;
  weight: number;
  costEstimate: number;
}

const MUSIC_MODEL_POOLS: Record<string, MusicModelOption[]> = {
  // Standard Music - ~$0.03/track
  "standard-music": [
    { id: "suno-v4.5", apiModel: "suno-v4.5", weight: 100, costEstimate: 0.03 },
  ],
  
  // Premium Music - ~$0.05/track
  "premium-music": [
    { id: "suno-v5", apiModel: "suno-v5", weight: 100, costEstimate: 0.05 },
  ],
};

function selectMusicModel(qualityId: string): MusicModelOption {
  const pool = MUSIC_MODEL_POOLS[qualityId] || MUSIC_MODEL_POOLS["standard-music"];
  const totalWeight = pool.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const model of pool) {
    random -= model.weight;
    if (random <= 0) return model;
  }
  
  return pool[0];
}

// ============================================================
// SUNO MUSIC GENERATION
// ============================================================

interface MusicRequest {
  prompt: string;
  duration?: number; // 10-60 seconds
  genre?: string;
  mood?: string;
  quality?: "standard-music" | "premium-music";
  instrumental?: boolean;
}

interface SunoCreateResponse {
  id: string;
  status: string;
}

interface SunoStatusResponse {
  id: string;
  status: string;
  audio_url?: string;
  duration?: number;
  error?: string;
}

async function createSunoTrack(
  prompt: string,
  model: string,
  duration: number = 30,
  instrumental: boolean = true,
  apiKey: string
): Promise<{ taskId: string | null; error?: string }> {
  try {
    console.log(`[Suno] Creating track with model: ${model}`);
    console.log(`[Suno] Prompt: ${prompt.slice(0, 100)}...`);
    
    const response = await fetch("https://api.cometapi.com/v1/audio/music", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        duration,
        instrumental,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Suno] Create error:", response.status, errorText);
      return { taskId: null, error: `Suno API error: ${response.status}` };
    }

    const data: SunoCreateResponse = await response.json();
    console.log("[Suno] Track task created:", data.id);
    return { taskId: data.id };
  } catch (error) {
    console.error("[Suno] Create exception:", error);
    return { taskId: null, error: String(error) };
  }
}

async function pollSunoStatus(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 60
): Promise<{ audioUrl: string | null; error?: string }> {
  console.log(`[Suno] Polling for task ${taskId}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s
    
    try {
      const response = await fetch(`https://api.cometapi.com/v1/audio/music/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      
      if (!response.ok) {
        console.log(`[Suno] Poll ${i + 1}/${maxAttempts}: HTTP ${response.status}`);
        continue;
      }
      
      const data: SunoStatusResponse = await response.json();
      const status = data.status?.toLowerCase();
      
      console.log(`[Suno] Poll ${i + 1}/${maxAttempts}: status=${status}`);
      
      if (status === "completed" || status === "success" || status === "done") {
        if (data.audio_url) {
          console.log(`[Suno] Track ready: ${data.audio_url.slice(0, 60)}...`);
          return { audioUrl: data.audio_url };
        }
      } else if (status === "failed" || status === "error") {
        console.error("[Suno] Task failed:", data.error);
        return { audioUrl: null, error: data.error || "Generation failed" };
      }
    } catch (error) {
      console.error(`[Suno] Poll error:`, error);
    }
  }
  
  return { audioUrl: null, error: "Timeout waiting for music generation" };
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    if (!COMETAPI_API_KEY) {
      throw new Error("COMETAPI_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    // ============================================================
    // STATUS CHECK
    // ============================================================
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      const response = await fetch(`https://api.cometapi.com/v1/audio/music/${taskId}`, {
        headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();
      const status = data.status?.toLowerCase();
      
      let normalizedStatus = "processing";
      if (status === "completed" || status === "success" || status === "done") {
        normalizedStatus = "completed";
      } else if (status === "failed" || status === "error") {
        normalizedStatus = "failed";
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          status: normalizedStatus,
          audioUrl: data.audio_url,
          duration: data.duration,
          error: data.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // CREATE MUSIC
    // ============================================================
    const body: MusicRequest = await req.json();
    const { 
      prompt, 
      duration = 30, 
      genre, 
      mood, 
      quality = "standard-music",
      instrumental = true,
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select model from pool
    const selectedModel = selectMusicModel(quality);
    
    console.log("=== Music Generation Request ===");
    console.log("Quality:", quality);
    console.log("Selected Model:", selectedModel.id);
    console.log("Duration:", duration, "s");
    console.log("Genre:", genre || "auto");
    console.log("Mood:", mood || "auto");
    console.log("Instrumental:", instrumental);

    // Build enhanced prompt
    let enhancedPrompt = prompt;
    if (genre) enhancedPrompt += ` Genre: ${genre}.`;
    if (mood) enhancedPrompt += ` Mood: ${mood}.`;
    enhancedPrompt += " High quality, royalty-free, suitable for social media content.";

    // Create track
    const createResult = await createSunoTrack(
      enhancedPrompt,
      selectedModel.apiModel,
      Math.min(Math.max(duration, 10), 120),
      instrumental,
      COMETAPI_API_KEY
    );

    if (!createResult.taskId) {
      return new Response(
        JSON.stringify({ success: false, error: createResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we should wait for completion
    const waitForCompletion = url.searchParams.get("wait") === "true";

    if (waitForCompletion) {
      // Sync mode: Wait for completion
      const pollResult = await pollSunoStatus(createResult.taskId, COMETAPI_API_KEY);

      if (!pollResult.audioUrl) {
        return new Response(
          JSON.stringify({ success: false, error: pollResult.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upload to Supabase storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const audioResponse = await fetch(pollResult.audioUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBytes = new Uint8Array(audioBuffer);
      const audioPath = `music/track-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(audioPath, audioBytes, { contentType: "audio/mpeg", upsert: true });

      if (uploadError) {
        console.error("[Music] Upload error:", uploadError);
        return new Response(
          JSON.stringify({
            success: true,
            audioUrl: pollResult.audioUrl,
            taskId: createResult.taskId,
            status: "completed",
            model: selectedModel.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(audioPath);

      return new Response(
        JSON.stringify({
          success: true,
          audioUrl: publicUrlData.publicUrl,
          taskId: createResult.taskId,
          status: "completed",
          model: selectedModel.id,
          storagePath: audioPath,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Async mode: Return task ID immediately
    return new Response(
      JSON.stringify({
        success: true,
        taskId: createResult.taskId,
        status: "processing",
        model: selectedModel.id,
        message: "Music generation started. Poll status endpoint for completion.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Music] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
