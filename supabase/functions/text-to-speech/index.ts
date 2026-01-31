import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  
  if (!ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY not configured");
    return { audioBuffer: null, error: "ElevenLabs API key not configured" };
  }

  try {
    console.log("[ElevenLabs] Generating TTS for:", text.substring(0, 50) + "...");

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
            style: 0.4,
            use_speaker_boost: true,
            speed: 0.85, // Slower speech for better comprehension
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ElevenLabs] API error:", response.status, errorText);
      return { audioBuffer: null, error: `ElevenLabs API error: ${response.status}` };
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[ElevenLabs] Audio generated, size:", audioBuffer.byteLength);
    return { audioBuffer };
  } catch (error) {
    console.error("[ElevenLabs] Exception:", error);
    return { audioBuffer: null, error: String(error) };
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