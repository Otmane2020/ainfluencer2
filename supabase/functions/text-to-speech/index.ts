import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// TTS MODEL POOL CONFIGURATION - ElevenLabs Only (High Quality)
// ============================================================

interface TTSModelOption {
  id: string;
  provider: "elevenlabs";
  weight: number;
  costEstimate: number;
}

const TTS_MODEL_POOLS: Record<string, TTSModelOption[]> = {
  // Standard Voice - ElevenLabs (reliable high quality)
  "standard-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, costEstimate: 0.024 },
  ],
  
  // Natural Voice - ElevenLabs
  "natural-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, costEstimate: 0.024 },
  ],
  
  // Premium Voice - ElevenLabs highest quality
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
  // Try both keys in order
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
    console.log(`[ElevenLabs] Trying ${keyLabel} for TTS...`);

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

      // If 401 or quota exceeded, try next key
      if (response.status === 401 || response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData?.detail?.status === "quota_exceeded") {
            console.log(`[ElevenLabs] ${keyLabel} quota exceeded, trying next key...`);
            continue;
          }
        } catch (_) {}
        console.log(`[ElevenLabs] ${keyLabel} auth failed, trying next key...`);
        continue;
      }

      return { audioBuffer: null, error: `ElevenLabs API error: ${response.status}` };
    } catch (error) {
      console.error(`[ElevenLabs] ${keyLabel} exception:`, error);
      continue;
    }
  }

  return { audioBuffer: null, error: "All ElevenLabs API keys failed (401/quota). Please update your API key." };
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

    // Select model from pool based on quality
    const qualityLevel = quality || DEFAULT_QUALITY;
    const selectedModel = selectTTSModel(qualityLevel);
    
    // Use the provided voiceId or fallback to George (male voice)
    const finalVoiceId = voiceId || "JBFqnCBsd6RMkjVDRZzb";
    
    console.log(`=== TTS Request ===`);
    console.log(`Voice ID received: ${voiceId || "(none - using default)"}`);
    console.log(`Voice ID used: ${finalVoiceId}`);
    console.log(`Quality: ${qualityLevel}`);
    console.log(`Selected: ${selectedModel.id} (${selectedModel.provider})`);
    console.log(`Text length: ${text.length} chars`);
    console.log(`Text preview: ${text.substring(0, 100)}...`);

    // Generate with ElevenLabs using the selected voice
    const result = await generateWithElevenLabs(text, finalVoiceId);

    if (!result.audioBuffer) {
      return new Response(
        JSON.stringify({ error: result.error || "TTS generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TTS] Success with voice ${finalVoiceId}, returning audio`);

    return new Response(result.audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});