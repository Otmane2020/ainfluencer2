// ============================================================
// MODEL POOLS CONFIGURATION
// Centralized model selection with weighted random rotation
// All models now via Lovable AI (Nano Banana)
// ============================================================

export type Provider = "lovable" | "openai" | "elevenlabs" | "suno";

export interface ModelOption {
  id: string;
  provider: Provider;
  weight: number;
  apiModel: string;
  maxDuration?: number;
  costEstimate?: number;
}

// ============================================================
// VIDEO MODEL POOLS (via Lovable AI / Nano Banana)
// All tiers now use Nano Banana for reliability
// ============================================================

export const VIDEO_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Video - Nano Banana (fast, 10s max)
  "standard-video": [
    { id: "nano-banana", provider: "lovable", weight: 100, apiModel: "nano-banana", maxDuration: 10, costEstimate: 0.05 },
  ],
  // Pro Video - Nano Banana (high quality, 12s)
  "pro-video": [
    { id: "nano-banana-pro", provider: "lovable", weight: 100, apiModel: "nano-banana-pro", maxDuration: 12, costEstimate: 0.10 },
  ],
  // Cinema Video - Nano Banana Premium
  "cinema-video": [
    { id: "nano-banana-premium", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", maxDuration: 12, costEstimate: 0.05 },
  ],
  // Legacy support
  "smart-video": [
    { id: "nano-banana", provider: "lovable", weight: 100, apiModel: "nano-banana", maxDuration: 10, costEstimate: 0.05 },
  ],
  "high-video": [
    { id: "nano-banana-pro", provider: "lovable", weight: 100, apiModel: "nano-banana-pro", maxDuration: 12, costEstimate: 0.10 },
  ],
};

// ============================================================
// IMAGE MODEL POOLS (via Lovable AI)
// Standard: Gemini Flash | Pro: Gemini Flash | Cinema: Gemini Pro
// ============================================================

export const IMAGE_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Image - Gemini Flash (fast, affordable)
  "standard-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.01 },
  ],
  // Pro Image - Gemini Flash (high quality)
  "pro-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.02 },
  ],
  // Cinema Image - Gemini Pro (premium)
  "cinema-image": [
    { id: "gemini-pro-image", provider: "lovable", weight: 100, apiModel: "google/gemini-3-pro-image-preview", costEstimate: 0.05 },
  ],
  // Legacy support
  "smart-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.01 },
  ],
  "high-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.02 },
  ],
  "studio-image": [
    { id: "gemini-pro-image", provider: "lovable", weight: 100, apiModel: "google/gemini-3-pro-image-preview", costEstimate: 0.05 },
  ],
};

// ============================================================
// AUDIO/VOICE MODEL POOLS (ElevenLabs only)
// ============================================================

export const TTS_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Voice - ElevenLabs
  "standard-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, apiModel: "eleven_multilingual_v2", costEstimate: 0.024 },
  ],
  
  // Natural Voice - ElevenLabs
  "natural-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, apiModel: "eleven_multilingual_v2", costEstimate: 0.024 },
  ],
  
  // Premium Voice - ElevenLabs highest quality
  "premium-voice": [
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 100, apiModel: "eleven_multilingual_v2", costEstimate: 0.024 },
  ],
};

// ============================================================
// MUSIC MODEL POOLS (Suno API)
// ============================================================

export const MUSIC_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Music - ~$0.03/track
  "standard-music": [
    { id: "suno-v4.5", provider: "suno", weight: 100, apiModel: "suno-v4.5", costEstimate: 0.03 },
  ],
  
  // Premium Music - ~$0.05/track
  "premium-music": [
    { id: "suno-v5", provider: "suno", weight: 100, apiModel: "suno-v5", costEstimate: 0.05 },
  ],
};

// ============================================================
// WEIGHTED RANDOM SELECTION
// ============================================================

export function selectModelFromPool(pool: ModelOption[]): ModelOption {
  if (!pool || pool.length === 0) {
    throw new Error("Empty model pool");
  }
  
  const totalWeight = pool.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const model of pool) {
    random -= model.weight;
    if (random <= 0) return model;
  }
  
  return pool[0]; // Fallback to first model
}

export function selectVideoModel(qualityId: string): ModelOption {
  const pool = VIDEO_MODEL_POOLS[qualityId] || VIDEO_MODEL_POOLS["smart-video"];
  return selectModelFromPool(pool);
}

export function selectImageModel(qualityId: string): ModelOption {
  const pool = IMAGE_MODEL_POOLS[qualityId] || IMAGE_MODEL_POOLS["smart-image"];
  return selectModelFromPool(pool);
}

export function selectTTSModel(qualityId: string): ModelOption {
  const pool = TTS_MODEL_POOLS[qualityId] || TTS_MODEL_POOLS["standard-voice"];
  return selectModelFromPool(pool);
}

export function selectMusicModel(qualityId: string): ModelOption {
  const pool = MUSIC_MODEL_POOLS[qualityId] || MUSIC_MODEL_POOLS["standard-music"];
  return selectModelFromPool(pool);
}

// ============================================================
// FALLBACK SYSTEM - Try next model on failure
// ============================================================

export function getNextModelFromPool(pool: ModelOption[], failedModelId: string): ModelOption | null {
  const remainingModels = pool.filter(m => m.id !== failedModelId);
  if (remainingModels.length === 0) return null;
  return selectModelFromPool(remainingModels);
}

// ============================================================
// MODEL INFO HELPERS
// ============================================================

export function getModelById(modelId: string): ModelOption | undefined {
  const allPools = [
    ...Object.values(VIDEO_MODEL_POOLS),
    ...Object.values(IMAGE_MODEL_POOLS),
    ...Object.values(TTS_MODEL_POOLS),
    ...Object.values(MUSIC_MODEL_POOLS),
  ].flat();
  
  return allPools.find(m => m.id === modelId);
}

export function getQualityModels(qualityId: string): ModelOption[] {
  return (
    VIDEO_MODEL_POOLS[qualityId] ||
    IMAGE_MODEL_POOLS[qualityId] ||
    TTS_MODEL_POOLS[qualityId] ||
    MUSIC_MODEL_POOLS[qualityId] ||
    []
  );
}

// ============================================================
// DURATION CONFIGS PER MODEL (API limits)
// ============================================================

export const VIDEO_DURATION_CONFIGS: Record<string, { min: number; max: number; step: number }> = {
  // Nano Banana models with actual API limits
  "nano-banana": { min: 3, max: 10, step: 1 },
  "nano-banana-pro": { min: 3, max: 12, step: 1 },
  "nano-banana-premium": { min: 3, max: 12, step: 1 },
};

export function getValidDurations(apiModel: string): number[] {
  const config = VIDEO_DURATION_CONFIGS[apiModel];
  if (!config) return [5, 10];
  
  const durations: number[] = [];
  for (let d = config.min; d <= config.max; d += config.step) {
    durations.push(d);
  }
  return durations;
}

export function clampDuration(requestedDuration: number, apiModel: string): number {
  const config = VIDEO_DURATION_CONFIGS[apiModel];
  if (!config) return requestedDuration;
  
  // Clamp to model's min/max
  const clamped = Math.max(config.min, Math.min(config.max, requestedDuration));
  
  // Round to nearest step
  return Math.round(clamped / config.step) * config.step;
}

// Get quality-level durations (union of all models in pool)
export function getQualityDurations(qualityId: string): number[] {
  const pool = VIDEO_MODEL_POOLS[qualityId];
  if (!pool) return [5, 10];
  
  // Get all possible durations from all models in pool
  const allDurations = new Set<number>();
  pool.forEach(model => {
    const config = VIDEO_DURATION_CONFIGS[model.apiModel];
    if (config) {
      for (let d = config.min; d <= config.max; d += config.step) {
        allDurations.add(d);
      }
    }
  });
  
  return Array.from(allDurations).sort((a, b) => a - b);
}