

## Complete Model Restructure: Quality-Based System

Based on your detailed pricing tables, I'll restructure the entire model system to use **quality levels** (Smart, High, Studio, Cinema) instead of specific product names, and update all edge functions with the correct CometAPI model mappings.

---

### 1. New Quality System Overview

**IMAGES:**
| Quality (UI) | Internal Model | Unit Price | Available Plans |
|-------------|----------------|------------|-----------------|
| Smart Image | Flux 2 Flex | 1.50€ | All (Starter, Pro, Business) |
| High Image | Nano Banana Pro / GPT Image | 2.50€ | Pro, Business |
| Studio Image | Flux 2 Pro / GPT Image HQ | 4.00€ | Business only |

**VIDEOS:**
| Quality (UI) | Internal Model | Unit Price | Available Plans |
|-------------|----------------|------------|-----------------|
| Smart Video | Kling Std / Veo Fast | 9.90€ | Pro (1/day), Business (3/day) |
| High Video | Veo 3.1 / Sora 2 | 12.90€ | Pro, Business (packs only) |
| Cinema Video | Sora Pro / Veo Pro | 19.90€ | Business only (packs only) |

---

### 2. Files to Modify

#### A. `src/lib/commercialProducts.ts` - Complete Rewrite

**Changes:**
- Replace current products with quality-based system
- Add `QUALITY_LEVELS` config for images and videos
- Add `MODEL_ROUTING` mapping quality → CometAPI model
- Update `PRICING_PLANS` with correct plan restrictions
- Add helper functions for plan-based access control

```typescript
// NEW: Quality-based products
export const QUALITY_LEVELS = {
  image: [
    { id: "smart-image", name: "Smart Image", internalModel: "flux-2-flex", price: 1.50 },
    { id: "high-image", name: "High Image", internalModel: "nano-banana-pro", price: 2.50 },
    { id: "studio-image", name: "Studio Image", internalModel: "flux-2-pro", price: 4.00 },
  ],
  video: [
    { id: "smart-video", name: "Smart Video", internalModel: "kling-std", price: 9.90 },
    { id: "high-video", name: "High Video", internalModel: "veo-3.1", price: 12.90 },
    { id: "cinema-video", name: "Cinema Video", internalModel: "sora-2-pro", price: 19.90 },
  ],
};

// Internal model → CometAPI model mapping
export const COMETAPI_MODEL_ROUTING = {
  // Images
  "flux-2-flex": "flux-2-flex",
  "nano-banana-pro": "nano-banana-pro",
  "flux-2-pro": "flux-2-pro",
  // Videos
  "kling-std": "kling-video",
  "veo-3.1": "veo-2",
  "sora-2-pro": "sora-2",
};

// Plan access control
export const PLAN_QUALITY_ACCESS = {
  starter: {
    image: ["smart-image"],
    video: [], // NO video access
  },
  pro: {
    image: ["smart-image", "high-image"],
    video: ["smart-video", "high-video"],
  },
  business: {
    image: ["smart-image", "high-image", "studio-image"],
    video: ["smart-video", "high-video", "cinema-video"],
  },
};
```

---

#### B. `supabase/functions/generate-video-sora/index.ts` - CometAPI Model Update

**Current Issue:** Uses old model names that don't match the new quality system.

**Changes:**
- Update `MODEL_CONFIGS` to use quality-based model IDs
- Add correct CometAPI model mappings:
  - `smart-video` → `kling-video` (Kling Std)
  - `high-video` → `veo-2` (Veo 3.1)
  - `cinema-video` → `sora-2` (Sora 2 Pro)

```typescript
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Smart Video - Kling Standard (fast, affordable)
  "smart-video": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "kling-std": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  // High Video - Veo 3.1 / Sora 2
  "high-video": {
    apiModel: "veo-2",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-3.1": {
    apiModel: "veo-2",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "sora-2": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  // Cinema Video - Sora 2 Pro / Veo Pro
  "cinema-video": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "sora-2-pro": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-pro": {
    apiModel: "veo-2",
    durations: [10, 20, 30],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  // Legacy compatibility
  "kling-v2-master": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
};
```

---

#### C. `supabase/functions/generate-image/index.ts` - CometAPI Image Models

**Current Issue:** Uses Lovable AI only, but we need CometAPI integration for Flux 2 Flex/Pro and Nano Banana Pro.

**Changes:**
- Add CometAPI image generation for non-Lovable models
- Route Smart Image → Lovable AI or Flux 2 Flex (CometAPI)
- Route High Image → Nano Banana Pro (CometAPI)
- Route Studio Image → Flux 2 Pro (CometAPI)

```typescript
// Model routing based on quality level
const QUALITY_MODEL_MAP: Record<string, { provider: "lovable" | "cometapi"; model: string }> = {
  "smart-image": { provider: "cometapi", model: "flux-2-flex" },
  "high-image": { provider: "cometapi", model: "nano-banana-pro" },
  "studio-image": { provider: "cometapi", model: "flux-2-pro" },
  // Legacy IDs
  "ai-image-smart": { provider: "lovable", model: "google/gemini-2.5-flash-image" },
  "ai-image-standard": { provider: "cometapi", model: "flux-2-flex" },
  "ai-image-pro": { provider: "cometapi", model: "nano-banana-pro" },
  "ai-image-studio": { provider: "cometapi", model: "flux-2-pro" },
};
```

---

#### D. `supabase/functions/run-campaigns-cron/index.ts` - AutoPost Model Selection

**Changes:**
- Use `smart-video` model (Kling Std) for AutoPost video generation
- Use `smart-image` model (Flux 2 Flex) for AutoPost image generation
- Add quality parameter to generation functions

```typescript
// AutoPost always uses Smart quality for cost control
async function generateImage(prompt: string, supabase: any, brandName?: string): Promise<string | null> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  // Use Flux 2 Flex via CometAPI for Smart Image
  const response = await fetch("https://api.cometapi.com/v1/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
    body: JSON.stringify({
      model: "flux-2-flex",
      prompt: enhancedPrompt,
    }),
  });
}

async function generateVideo(prompt: string, supabase: any): Promise<string | null> {
  // Use Kling via CometAPI for Smart Video
  const response = await fetch("https://api.cometapi.com/v1/videos", {
    method: "POST",
    headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
    body: JSON.stringify({
      model: "kling-video",
      prompt: prompt,
      duration: 5,
    }),
  });
}
```

---

#### E. `src/components/ProductSelector.tsx` - Quality-Based UI

**Changes:**
- Display quality levels instead of product names
- Add plan restriction badges ("Pro+", "Business only")
- Show price per unit clearly

---

#### F. `src/components/ModelSelector.tsx` - Optional Legacy Support

**Changes:**
- Keep for advanced users who want model selection
- Map quality levels to underlying models
- Hide from normal UI flow

---

### 3. Summary of Model Mappings

| Quality Level | CometAPI Model | Price | Usage |
|--------------|----------------|-------|-------|
| **Smart Image** | `flux-2-flex` | 1.50€ | AutoPost + Manual |
| **High Image** | `nano-banana-pro` | 2.50€ | Packs/Credits |
| **Studio Image** | `flux-2-pro` | 4.00€ | Packs/Credits |
| **Smart Video** | `kling-video` | 9.90€ | AutoPost (1-3/day) |
| **High Video** | `veo-2` | 12.90€ | Packs only |
| **Cinema Video** | `sora-2` | 19.90€ | Packs only |

---

### 4. Plan Restrictions Summary

| Plan | Image Access | Video Access | AutoPost |
|------|-------------|--------------|----------|
| **Starter** | Smart only | ❌ None | 30 images/day |
| **Pro** | Smart, High | Smart, High | Unlimited images, 1 video/day |
| **Business** | All | All | Unlimited images, 3 videos/day |

---

### 5. Implementation Order

1. **Update `src/lib/commercialProducts.ts`** - Core quality definitions
2. **Update `supabase/functions/generate-video-sora/index.ts`** - Video model routing
3. **Update `supabase/functions/generate-image/index.ts`** - Image model routing + CometAPI integration
4. **Update `supabase/functions/run-campaigns-cron/index.ts`** - AutoPost uses Smart quality
5. **Update `src/components/ProductSelector.tsx`** - Quality-based UI
6. **Deploy edge functions**

