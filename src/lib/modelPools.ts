// ============================================================
// MODEL POOLS CONFIGURATION
// Centralized model selection with weighted random rotation
// ============================================================

export type Provider = "cometapi" | "lovable" | "openai" | "elevenlabs" | "suno";

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
// ============================================================

export const VIDEO_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Smart Video - ~$0.40/video avg
  "smart-video": [
    { id: "veo-3.1", provider: "cometapi", weight: 50, apiModel: "veo-2", maxDuration: 10, costEstimate: 0.40 },
    { id: "kling-v2", provider: "cometapi", weight: 35, apiModel: "kling-video", maxDuration: 10, costEstimate: 0.30 },
    { id: "minimax-02", provider: "cometapi", weight: 15, apiModel: "minimax-video-01", maxDuration: 6, costEstimate: 0.20 },
  ],
  
  // High Video - ~$1.20/video avg
  "high-video": [
    { id: "sora-2", provider: "cometapi", weight: 60, apiModel: "sora-2", maxDuration: 12, costEstimate: 0.96 },
    { id: "veo-3.1-pro", provider: "cometapi", weight: 40, apiModel: "veo-2", maxDuration: 20, costEstimate: 2.00 },
  ],
  
  // Cinema Video - ~$2.40/video avg
  "cinema-video": [
    { id: "sora-2-pro", provider: "cometapi", weight: 70, apiModel: "sora-2", maxDuration: 20, costEstimate: 2.40 },
    { id: "veo-3.1-ultra", provider: "cometapi", weight: 30, apiModel: "veo-2", maxDuration: 30, costEstimate: 4.00 },
  ],
};

// ============================================================
// IMAGE MODEL POOLS (CometAPI + Lovable AI)
// ============================================================

export const IMAGE_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Smart Image - ~$0.01/image avg
  "smart-image": [
    { id: "gemini-flash-image", provider: "lovable", weight: 60, apiModel: "google/gemini-2.5-flash-image", costEstimate: 0.008 },
    { id: "flux-2-flex", provider: "cometapi", weight: 40, apiModel: "flux-2-flex", costEstimate: 0.008 },
  ],
  
  // High Image - ~$0.05/image avg
  "high-image": [
    { id: "nano-banana-pro", provider: "cometapi", weight: 50, apiModel: "nano-banana-pro", costEstimate: 0.03 },
    { id: "flux-2-pro", provider: "cometapi", weight: 50, apiModel: "flux-2-pro", costEstimate: 0.08 },
  ],
  
  // Studio Image - ~$0.08/image avg
  "studio-image": [
    { id: "flux-2-pro", provider: "cometapi", weight: 60, apiModel: "flux-2-pro", costEstimate: 0.08 },
    { id: "gemini-pro-image", provider: "lovable", weight: 40, apiModel: "google/gemini-3-pro-image-preview", costEstimate: 0.06 },
  ],
};

// ============================================================
// AUDIO/VOICE MODEL POOLS (Multi-provider)
// ============================================================

export const TTS_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Standard Voice - ~$0.006/request (cheapest)
  "standard-voice": [
    { id: "kling-tts", provider: "cometapi", weight: 100, apiModel: "kling-tts", costEstimate: 0.006 },
  ],
  
  // Natural Voice - ~$0.02/request avg
  "natural-voice": [
    { id: "openai-tts", provider: "openai", weight: 50, apiModel: "tts-1", costEstimate: 0.015 },
    { id: "kling-tts", provider: "cometapi", weight: 50, apiModel: "kling-tts", costEstimate: 0.006 },
  ],
  
  // Premium Voice - ~$0.024/1K chars (highest quality)
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
// DURATION CONFIGS PER MODEL
// ============================================================

export const VIDEO_DURATION_CONFIGS: Record<string, number[]> = {
  // CometAPI models
  "veo-2": [5, 10],
  "kling-video": [5, 10],
  "minimax-video-01": [4, 6],
  "sora-2": [4, 8, 12],
};

export function getValidDurations(apiModel: string): number[] {
  return VIDEO_DURATION_CONFIGS[apiModel] || [5, 10];
}

export function clampDuration(requestedDuration: number, apiModel: string): number {
  const validDurations = getValidDurations(apiModel);
  
  // Find closest valid duration
  return validDurations.reduce((prev, curr) =>
    Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev
  );
}
