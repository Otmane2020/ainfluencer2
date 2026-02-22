import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// AUDIO CACHE - store in Supabase Storage to avoid re-generating
// ============================================================

async function hashKey(text: string, voiceId: string): Promise<string> {
  const data = new TextEncoder().encode(`${voiceId}:${text}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getCachedAudio(cacheKey: string): Promise<ArrayBuffer | null> {
  try {
    const sb = getSupabaseAdmin();
    const path = `tts-cache/${cacheKey}.mp3`;
    const { data, error } = await sb.storage.from("media").download(path);
    if (error || !data) return null;
    console.log(`[TTS Cache] HIT for ${cacheKey.substring(0, 12)}…`);
    return await data.arrayBuffer();
  } catch {
    return null;
  }
}

async function setCachedAudio(cacheKey: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    const path = `tts-cache/${cacheKey}.mp3`;
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    await sb.storage.from("media").upload(path, blob, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    console.log(`[TTS Cache] STORED ${cacheKey.substring(0, 12)}…`);
  } catch (e) {
    console.warn("[TTS Cache] Failed to store:", e);
  }
}

// ============================================================
// TTS MODEL POOL CONFIGURATION
// ============================================================

interface TTSModelOption {
  id: string;
  provider: "elevenlabs";
  weight: number;
  costEstimate: number;
}

const TTS_MODEL_POOLS: Record<string, TTSModelOption[]> = {
  "standard-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, costEstimate: 0.024 },
  ],
  "natural-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, costEstimate: 0.024 },
  ],
  "premium-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, costEstimate: 0.024 },
  ],
};

const DEFAULT_QUALITY = "standard-voice";

function selectTTSModel(qualityId: string): TTSModelOption {
  const pool = TTS_MODEL_POOLS[qualityId] || TTS_MODEL_POOLS[DEFAULT_QUALITY];
  const totalWeight = pool.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;
  for (const model of pool) {
    random -= model.weight;
    if (random <= 0) return model;
  }
  return pool[0];
}

// ============================================================
// ELEVENLABS TTS
// ============================================================

async function generateWithElevenLabs(
  text: string, 
  voiceId: string
): Promise<{ audioBuffer: ArrayBuffer | null; error?: string }> {
  const keys = [
    Deno.env.get("ELEVENLABS_API_KEY_1"),
    Deno.env.get("ELEVENLABS_API_KEY"),
  ].filter(Boolean) as string[];
  
  if (keys.length === 0) {
    console.error("No ELEVENLABS_API_KEY configured");
    return { audioBuffer: null, error: "ElevenLabs API key not configured" };
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyLabel = i === 0 ? "KEY_1" : "KEY";
    console.log(`[ElevenLabs] Trying ${keyLabel}…`);

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.4,
              use_speaker_boost: true,
              speed: 0.85,
            },
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        console.log(`[ElevenLabs] Success with ${keyLabel}, size: ${audioBuffer.byteLength}`);
        return { audioBuffer };
      }

      const errorText = await response.text();
      console.error(`[ElevenLabs] ${keyLabel} error: ${response.status} ${errorText}`);

      if (response.status === 401 || response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData?.detail?.status === "quota_exceeded") {
            console.log(`[ElevenLabs] ${keyLabel} quota exceeded, trying next…`);
            continue;
          }
        } catch (_) {}
        console.log(`[ElevenLabs] ${keyLabel} auth failed, trying next…`);
        continue;
      }

      return { audioBuffer: null, error: `ElevenLabs API error: ${response.status}` };
    } catch (error) {
      console.error(`[ElevenLabs] ${keyLabel} exception:`, error);
      continue;
    }
  }

  return { audioBuffer: null, error: "All ElevenLabs API keys failed (401/quota)." };
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, quality } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalVoiceId = voiceId || "JBFqnCBsd6RMkjVDRZzb";
    const qualityLevel = quality || DEFAULT_QUALITY;
    const selectedModel = selectTTSModel(qualityLevel);

    console.log(`=== TTS Request === voice=${finalVoiceId} quality=${qualityLevel} chars=${text.length}`);

    // --- CHECK CACHE FIRST ---
    const cacheKey = await hashKey(text, finalVoiceId);
    const cached = await getCachedAudio(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    // --- GENERATE ---
    const result = await generateWithElevenLabs(text, finalVoiceId);

    if (!result.audioBuffer) {
      return new Response(
        JSON.stringify({ error: result.error || "TTS generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- STORE IN CACHE (fire-and-forget) ---
    setCachedAudio(cacheKey, result.audioBuffer);

    return new Response(result.audioBuffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
