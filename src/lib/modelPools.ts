// ============================================================
// MODEL POOLS CONFIGURATION
// Centralized model selection with weighted random rotation
// ============================================================

export type Provider = "replicate" | "lovable" | "openai" | "elevenlabs" | "suno";

export interface ModelOption {
  id: string;
  provider: Provider;
  weight: number; // Higher = more likely to be selected
  apiModel: string;
  maxDuration?: number;
  costEstimate?: number;
}

// ============================================================
// VIDEO MODEL POOLS (via CometAPI)
// Standard: Sora (fast) | Pro: Sora 2 (20s) | Cinema: Nano Banana
// ============================================================

export const VIDEO_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Video - Sora (fast, 10s max)
  "standard-video": [
    { id: "sora", provider: "replicate", weight: 100, apiModel: "sora", maxDuration: 10, costEstimate: 0.30 },
  ],
  // Pro Video - Sora 2 (high quality, 20s)
  "pro-video": [
    { id: "sora-2", provider: "replicate", weight: 100, apiModel: "sora-2", maxDuration: 20, costEstimate: 0.60 },
  ],
  // Cinema Video - Nano Banana (premium quality via Lovable AI)
  "cinema-video": [
    { id: "nano-banana", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", maxDuration: 15, costEstimate: 0.05 },
  ],
  // Legacy support
  "smart-video": [
    { id: "sora", provider: "replicate", weight: 100, apiModel: "sora", maxDuration: 10, costEstimate: 0.30 },
  ],
  "high-video": [
    { id: "sora-2", provider: "replicate", weight: 100, apiModel: "sora-2", maxDuration: 20, costEstimate: 0.60 },
  ],
};

// ============================================================
// IMAGE MODEL POOLS
// Standard: Gemini Flash | Pro: Nano Banana | Cinema: Gemini Pro
// ============================================================

export const IMAGE_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Image - Gemini Flash (fast, affordable)
  "standard-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.01 },
  ],
  // Pro Image - Nano Banana (high quality)
  "pro-image": [
    { id: "nano-banana-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.02 },
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
    { id: "nano-banana-image", provider: "lovable", weight: 100, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.02 },
  ],
  "studio-image": [
    { id: "gemini-pro-image", provider: "lovable", weight: 100, apiModel: "google/gemini-3-pro-image-preview", costEstimate: 0.05 },
  ],
};

// ============================================================
// AUDIO/VOICE MODEL POOLS (Multi-provider with fallback)
// ============================================================

export const TTS_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Voice - OpenAI TTS (reliable) ~$0.015/request
  "standard-voice": [
    { id: "openai-tts", provider: "openai", weight: 100, apiModel: "tts-1", costEstimate: 0.015 },
  ],
  
  // Natural Voice - Mix of OpenAI and ElevenLabs ~$0.018/request avg
  "natural-voice": [
    { id: "openai-tts", provider: "openai", weight: 70, apiModel: "tts-1", costEstimate: 0.015 },
    { id: "elevenlabs-tts", provider: "elevenlabs", weight: 30, apiModel: "eleven_multilingual_v2", costEstimate: 0.024 },
  ],
  
  // Premium Voice - ElevenLabs highest quality ~$0.024/1K chars
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
  // CometAPI models with actual API limits
  "sora": { min: 4, max: 10, step: 1 },          // Sora: 4-10s
  "sora-2": { min: 4, max: 20, step: 1 },        // Sora 2: 4-20s flexible
  "nano-banana": { min: 5, max: 15, step: 5 },   // Nano Banana: 5, 10, 15s
  "veo-2": { min: 5, max: 10, step: 5 },         // Veo 3.1: 5s or 10s
  "kling-video": { min: 5, max: 10, step: 5 },   // Kling v2: 5s or 10s (deprecated)
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
