

# Plan d'intégration des modèles optimisés

## Résumé

Intégrer le nouveau stack de modèles recommandé (3 par famille) avec rotation aléatoire pour optimiser les coûts et la qualité, tout en gardant l'abstraction "Quality Level" pour les utilisateurs.

---

## Architecture proposée

```text
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Quality Levels)              │
├─────────────────────────────────────────────────────────────────┤
│  Smart Video │ High Video │ Cinema Video                        │
│  Smart Image │ High Image │ Studio Image                        │
│  AI Voice    │ Music      │ Premium Voice                       │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 MODEL POOL (Random Selection)                   │
├─────────────────────────────────────────────────────────────────┤
│ VIDEO:  [veo-3.1, sora-2, kling-video]    → pick random         │
│ IMAGE:  [flux-2-flex, flux-2-pro, nano-banana]                  │
│ AUDIO:  [kling-tts, openai-tts, elevenlabs]                     │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND ROUTING                              │
├─────────────────────────────────────────────────────────────────┤
│ CometAPI (Videos/High Images) │ Lovable AI (Smart Images)       │
│ OpenAI/ElevenLabs (Voice)     │ Suno API (Music)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Nouveaux modèles par famille (3 each)

### VIDEO (via CometAPI)

| Quality    | Pool Models                                | Selection Logic      | Est. Cost       |
|------------|-------------------------------------------|---------------------|-----------------|
| Smart      | `veo-3.1`, `kling-video`, `minimax-02`    | Random rotation     | ~$0.40/video    |
| High       | `veo-3.1-pro`, `sora-2`                   | Random 50/50        | ~$1.20/video    |
| Cinema     | `sora-2-pro`, `veo-3.1-pro`               | Random 50/50        | ~$2.40/video    |

### IMAGE (CometAPI + Lovable AI)

| Quality    | Pool Models                                | Selection Logic      | Est. Cost       |
|------------|-------------------------------------------|---------------------|-----------------|
| Smart      | `flux-2-flex`, `gemini-flash-image`       | Random 50/50        | ~$0.01/image    |
| High       | `nano-banana-pro`, `flux-2-pro`           | Random 50/50        | ~$0.05/image    |
| Studio     | `flux-2-pro`, `gpt-image-1.5`             | Random 50/50        | ~$0.08/image    |

### AUDIO/VOICE (Multi-provider)

| Quality    | Pool Models                                | Selection Logic      | Est. Cost       |
|------------|-------------------------------------------|---------------------|-----------------|
| Standard   | `kling-tts`                               | Single (cheapest)   | ~$0.006/req     |
| Natural    | `openai-tts`, `kling-tts`                 | Random 50/50        | ~$0.02/req      |
| Premium    | `elevenlabs-tts`                          | Single (quality)    | ~$0.024/1K char |

### MUSIC (Suno API)

| Quality    | Pool Models                                | Selection Logic      | Est. Cost       |
|------------|-------------------------------------------|---------------------|-----------------|
| Standard   | `suno-v4.5`                               | Single              | ~$0.03/track    |
| Premium    | `suno-v5`                                 | Single              | ~$0.05/track    |

---

## Changes Required

### 1. Backend: Model Pool System (NEW)

**Create `src/lib/modelPools.ts`**

Central configuration for model pools with weighted random selection:

```typescript
interface ModelOption {
  id: string;
  provider: "cometapi" | "lovable" | "openai" | "elevenlabs" | "suno";
  weight: number; // Higher = more likely
  apiModel: string;
  maxDuration?: number;
}

const VIDEO_MODEL_POOLS = {
  "smart-video": [
    { id: "veo-3.1", provider: "cometapi", weight: 40, apiModel: "veo-2" },
    { id: "kling-v2", provider: "cometapi", weight: 40, apiModel: "kling-video" },
    { id: "minimax-02", provider: "cometapi", weight: 20, apiModel: "minimax-video-01" },
  ],
  "high-video": [
    { id: "sora-2", provider: "cometapi", weight: 60, apiModel: "sora-2" },
    { id: "veo-3.1-pro", provider: "cometapi", weight: 40, apiModel: "veo-2" },
  ],
  "cinema-video": [
    { id: "sora-2-pro", provider: "cometapi", weight: 70, apiModel: "sora-2" },
    { id: "veo-3.1-ultra", provider: "cometapi", weight: 30, apiModel: "veo-2" },
  ],
};
```

### 2. Update `generate-video-sora` Edge Function

Add weighted random model selection:

```typescript
// Pick random model from pool based on quality level
function selectModelFromPool(qualityId: string): ModelOption {
  const pool = VIDEO_MODEL_POOLS[qualityId] || VIDEO_MODEL_POOLS["smart-video"];
  const totalWeight = pool.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const model of pool) {
    random -= model.weight;
    if (random <= 0) return model;
  }
  return pool[0];
}
```

### 3. Update `generate-image` Edge Function

Add image model pool with fallback:

```typescript
const IMAGE_MODEL_POOLS = {
  "smart-image": [
    { provider: "lovable", model: "google/gemini-2.5-flash-image", weight: 60 },
    { provider: "cometapi", model: "flux-2-flex", weight: 40 },
  ],
  "high-image": [
    { provider: "cometapi", model: "nano-banana-pro", weight: 50 },
    { provider: "cometapi", model: "flux-2-pro", weight: 50 },
  ],
  "studio-image": [
    { provider: "cometapi", model: "flux-2-pro", weight: 60 },
    { provider: "lovable", model: "google/gemini-3-pro-image-preview", weight: 40 },
  ],
};
```

### 4. Update `text-to-speech` Edge Function

Replace single ElevenLabs provider with multi-provider routing:

```typescript
const TTS_PROVIDERS = {
  "standard-voice": { provider: "kling", endpoint: "...", cost: 0.006 },
  "natural-voice": { provider: "openai", model: "tts-1", cost: 0.015 },
  "premium-voice": { provider: "elevenlabs", model: "eleven_multilingual_v2", cost: 0.024 },
};
```

### 5. Add Suno Music Generation (NEW Edge Function)

**Create `supabase/functions/generate-music/index.ts`**

For background music generation:

```typescript
// Suno API integration for royalty-free music
// Models: suno-v4.5 (fast/cheap), suno-v5 (premium)
```

### 6. Update Frontend `commercialProducts.ts`

Update internal model mappings:

```typescript
export const VIDEO_QUALITY_LEVELS: QualityLevel[] = [
  {
    id: "smart-video",
    name: "Smart Video",
    internalModel: "pool:smart-video", // NEW: Pool reference
    price: 9.90,
    description: "Short videos for social networks",
    features: ["HD 1080p", "5-10s", "AI Voice included"],
  },
  // ...
];
```

### 7. Update Config & Cleanup

- Update `supabase/config.toml` to add new functions
- Remove unused legacy model IDs from `ModelSelector.tsx`
- Update `COMETAPI_MODEL_ROUTING` with new model IDs

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/modelPools.ts` | **NEW** - Model pool configurations |
| `src/lib/commercialProducts.ts` | Update quality levels with pool references |
| `supabase/functions/generate-video-sora/index.ts` | Add weighted random selection |
| `supabase/functions/generate-image/index.ts` | Add image pool routing |
| `supabase/functions/generate-reel-video/index.ts` | Add model pool support |
| `supabase/functions/text-to-speech/index.ts` | Multi-provider TTS routing |
| `supabase/functions/generate-music/index.ts` | **NEW** - Suno music generation |
| `supabase/config.toml` | Add new function configuration |
| `src/components/ModelSelector.tsx` | Simplify to show only 3 per category |

---

## Cost Comparison

| Content | Current Stack | New Stack | Savings |
|---------|---------------|-----------|---------|
| 10s Reel | ~$0.80 (veo-2) | ~$0.40 (pool avg) | **50%** |
| Smart Image | ~$0.03 | ~$0.01 | **66%** |
| High Image | ~$0.05 | ~$0.04 | **20%** |
| Voice 10s | ~$0.24 (ElevenLabs) | ~$0.006 (Kling TTS) | **97%** |

---

## Secrets Required

| Secret | Provider | Status |
|--------|----------|--------|
| `COMETAPI_API_KEY` | CometAPI | Already configured |
| `LOVABLE_API_KEY` | Lovable AI | Already configured |
| `ELEVENLABS_API_KEY` | ElevenLabs | Already configured |
| `SUNO_API_KEY` | Suno | **NEW - Required** |

---

## Implementation Steps

1. Create `modelPools.ts` configuration file
2. Update `generate-video-sora` with pool selection logic
3. Update `generate-image` with multi-provider pools
4. Update `text-to-speech` with Kling TTS as default
5. Create `generate-music` Edge Function for Suno
6. Update `commercialProducts.ts` with new mappings
7. Clean up `ModelSelector.tsx` UI (3 options per category)
8. Test end-to-end with all quality levels
9. Monitor costs and adjust weights as needed

---

## Technical Notes

- **Fallback system**: If selected model fails, retry with next model in pool
- **Logging**: Log which model was used for cost tracking
- **Weights**: Adjustable weights allow optimizing for cost vs quality
- **Rate limits**: Distribute load across providers to avoid rate limiting
- **Caching**: Consider caching model selection for same user session

