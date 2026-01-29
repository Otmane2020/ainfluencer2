import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// TTS MODEL POOL CONFIGURATION - Multi-provider routing
// ============================================================

interface TTSModelOption {
  id: string;
  provider: "elevenlabs" | "cometapi" | "openai";
  weight: number;
  costEstimate: number;
}

const TTS_MODEL_POOLS: Record<string, TTSModelOption[]> = {
  // Standard Voice - Cheapest (~$0.006/request)
  "standard-voice": [
    { id: "kling-tts", provider: "cometapi", weight: 100, costEstimate: 0.006 },
  ],
  
  // Natural Voice - Balanced (~$0.015/request avg)
  "natural-voice": [
    { id: "openai-tts", provider: "openai", weight: 50, costEstimate: 0.015 },
    { id: "kling-tts", provider: "cometapi", weight: 50, costEstimate: 0.006 },
  ],
  
  // Premium Voice - Highest quality (~$0.024/1K chars)
  "premium-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, costEstimate: 0.024 },
  ],
};

// Default to standard for cost efficiency
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
            style: 0.5,
            use_speaker_boost: true,
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
// KLING TTS (via CometAPI) - Low cost option
// ============================================================

async function generateWithKlingTTS(
  text: string,
  voiceId?: string
): Promise<{ audioBuffer: ArrayBuffer | null; error?: string }> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  
  if (!COMETAPI_API_KEY) {
    console.error("COMETAPI_API_KEY not configured");
    return { audioBuffer: null, error: "CometAPI key not configured" };
  }

  try {
    console.log("[KlingTTS] Generating TTS for:", text.substring(0, 50) + "...");

    const response = await fetch("https://api.cometapi.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling-tts",
        input: text,
        voice: voiceId || "alloy", // Default voice
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[KlingTTS] API error:", response.status, errorText);
      return { audioBuffer: null, error: `Kling TTS error: ${response.status}` };
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[KlingTTS] Audio generated, size:", audioBuffer.byteLength);
    return { audioBuffer };
  } catch (error) {
    console.error("[KlingTTS] Exception:", error);
    return { audioBuffer: null, error: String(error) };
  }
}

// ============================================================
// OPENAI TTS
// ============================================================

async function generateWithOpenAITTS(
  text: string,
  voiceId?: string
): Promise<{ audioBuffer: ArrayBuffer | null; error?: string }> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  
  if (!COMETAPI_API_KEY) {
    console.error("COMETAPI_API_KEY not configured");
    return { audioBuffer: null, error: "API key not configured" };
  }

  try {
    console.log("[OpenAI TTS] Generating TTS for:", text.substring(0, 50) + "...");

    // Use CometAPI's OpenAI-compatible endpoint
    const response = await fetch("https://api.cometapi.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voiceId || "alloy",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenAI TTS] API error:", response.status, errorText);
      return { audioBuffer: null, error: `OpenAI TTS error: ${response.status}` };
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[OpenAI TTS] Audio generated, size:", audioBuffer.byteLength);
    return { audioBuffer };
  } catch (error) {
    console.error("[OpenAI TTS] Exception:", error);
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
    
    console.log(`=== TTS Request ===`);
    console.log(`Quality: ${qualityLevel}`);
    console.log(`Selected: ${selectedModel.id} (${selectedModel.provider})`);
    console.log(`Text length: ${text.length} chars`);

    let result: { audioBuffer: ArrayBuffer | null; error?: string };

    switch (selectedModel.provider) {
      case "elevenlabs":
        result = await generateWithElevenLabs(text, voiceId || "JBFqnCBsd6RMkjVDRZzb");
        break;
      case "openai":
        result = await generateWithOpenAITTS(text, voiceId);
        break;
      case "cometapi":
      default:
        result = await generateWithKlingTTS(text, voiceId);
        break;
    }

    // Fallback if primary fails
    if (!result.audioBuffer && selectedModel.provider !== "cometapi") {
      console.log("[TTS] Primary failed, falling back to Kling TTS...");
      result = await generateWithKlingTTS(text, voiceId);
    }

    if (!result.audioBuffer) {
      return new Response(
        JSON.stringify({ error: result.error || "TTS generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TTS] Success with ${selectedModel.id}, returning audio`);

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
