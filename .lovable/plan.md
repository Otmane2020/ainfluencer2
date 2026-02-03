
# Add Comprehensive Image Model Selector with Pricing Display

## Overview

Add a dropdown model selector to the AI Images page (`/images`) that displays all available image generation models with their quality ratings, credit costs, and recommended usage - visible BEFORE generation.

---

## Models to Add (18 models total)

| Model | Type | Quality | Credits | Cost Level | Usage |
|-------|------|---------|---------|------------|-------|
| Recraft Remove Background | Img → Img | ⭐⭐⭐⭐ | 1.0 | — | E-commerce cutouts |
| Qwen z-image | Text → Img | ⭐⭐⭐ | 0.8 | Very Low | Testing, volume |
| Flux 2 Flex (2K) | Text/Img → Img | ⭐⭐⭐⭐⭐ | 24 | High | Premium ads |
| Flux 2 Flex (1K) | Text/Img → Img | ⭐⭐⭐⭐ | 14 | Medium | Ads / e-commerce |
| Flux-2 Pro (2K) | Text/Img → Img | ⭐⭐⭐⭐⭐ | 7 | Very Good | Photorealism |
| Flux-2 Pro (1K) | Text/Img → Img | ⭐⭐⭐⭐ | 5 | Low | Ads, products |
| Google Nano Banana Pro (2K) | Text → Img | ⭐⭐⭐⭐⭐ | 18 | Medium | Social ads |
| Google Nano Banana Pro (4K) | Text → Img | ⭐⭐⭐⭐⭐⭐ | 24 | High | Hero / branding |
| Grok Imagine (img→img) | Img → Img | ⭐⭐⭐ | 4 / 2 img | Low | Fun, remix |
| Grok Imagine (text→img) | Text → Img | ⭐⭐⭐ | 4 / 6 img | Very Low | Volume |
| OpenAI 4o Image | Text → Img | ⭐⭐⭐⭐ | 6 | Good | Polyvalent |
| Flux1-Kontext Pro | Text → Img | ⭐⭐⭐⭐ | 5 | Low | Clean generation |
| Flux1-Kontext Max | Text → Img | ⭐⭐⭐⭐⭐ | 10 | Medium | Stable quality |
| Recraft Crisp Upscale | Img → Img | ⭐⭐⭐⭐ | 0.5 | Ultra Low | Upscale |
| Ideogram v3 Remix – TURBO | Img → Img | ⭐⭐⭐ | 3.5 | Low | Fast |
| Ideogram v3 Remix – BALANCED | Img → Img | ⭐⭐⭐⭐ | 7 | Good | Good balance |
| Ideogram v3 Remix – QUALITY | Img → Img | ⭐⭐⭐⭐⭐ | 10 | Medium | Clean visuals |
| Ideogram v3 Edit – QUALITY | Img → Img | ⭐⭐⭐⭐⭐ | 10 | Medium | Pro retouching |
| Ideogram V3 Reframe | Img → Img | ⭐⭐⭐⭐⭐ | 10 | Medium | Reframing |

---

## Files to Create/Modify

### 1. NEW: `src/lib/imageModels.ts`

Centralized configuration for all image models:

```text
Model configuration structure:
- id: Unique identifier
- name: Display name
- type: "text-to-image" | "image-to-image" | "utility"
- quality: 1-6 (star rating)
- credits: Cost per generation
- costLevel: "ultra-low" | "low" | "medium" | "high"
- costPerImage: Dollar cost (for display)
- usage: Recommended use case
- provider: "kie" | "lovable" | "openai" | "replicate"
- apiEndpoint: Backend endpoint mapping
- requiresImage: Whether source image is needed
```

### 2. NEW: `src/components/ImageModelSelector.tsx`

Dropdown component displaying models with:
- Model name and type badge (Text→Img / Img→Img)
- Star rating (quality)
- Credit cost with colored badge (green/yellow/red based on cost level)
- Recommended usage text
- Grouped by category (Text-to-Image / Image-to-Image / Utilities)

Visual layout:
```text
┌─────────────────────────────────────────────────┐
│ 🎨 Model: Flux-2 Pro (1K)              ▼        │
└─────────────────────────────────────────────────┘
   ┌────────────────────────────────────────────┐
   │ TEXT → IMAGE                               │
   │ ├─ Nano Banana Pro (2K)  ⭐⭐⭐⭐⭐  18 cr   │
   │ │   Social ads                    🟠 Medium │
   │ ├─ Flux-2 Pro (1K)       ⭐⭐⭐⭐   5 cr    │
   │ │   Ads, products                 🟢 Low    │
   │ ...                                         │
   │ IMAGE → IMAGE                               │
   │ ├─ Recraft Remove BG     ⭐⭐⭐⭐   1 cr    │
   │ │   E-commerce cutouts            🟢 Low    │
   │ ...                                         │
   │ UTILITIES                                   │
   │ ├─ Recraft Crisp Upscale ⭐⭐⭐⭐   0.5 cr  │
   │ │   Upscale                       🟢 Ultra  │
   └────────────────────────────────────────────┘
```

### 3. MODIFY: `src/components/ImageGenerator.tsx`

- Import and add `ImageModelSelector` component
- Add state for selected model
- Pass model ID to generate-image function
- Show conditional UI for "Img→Img" models (source image upload)
- Display credit cost next to Generate button

### 4. MODIFY: `supabase/functions/generate-image/index.ts`

- Add routing logic based on `modelId` parameter
- Route to appropriate provider:
  - KIE API models: Recraft, Qwen, Grok, Ideogram, Flux 2 Flex/Pro
  - Lovable AI: Nano Banana, Nano Banana Pro
  - OpenAI: GPT Image
  - Replicate: FLUX Schnell/Dev/Pro
- Add credit deduction based on model-specific costs

### 5. UPDATE: `supabase/functions/_shared/kie-api-client.ts`

- Add missing endpoints for new models
- Update credit cost mappings

---

## UI/UX Flow

1. User opens `/images` page
2. Model selector dropdown shows **current model** with preview (name + credits + stars)
3. Click to expand full dropdown with grouped models
4. Each model row shows:
   - Icon/emoji for type
   - Model name
   - Star rating (⭐⭐⭐⭐⭐)
   - Credit cost with color badge
   - Short usage description
5. Select model → updates state + credit display on Generate button
6. For Img→Img models: Show source image upload zone
7. Click Generate → uses selected model with correct pricing

---

## Technical Architecture

```text
┌──────────────────────────────────────────────────────┐
│  ImageGenerator.tsx                                  │
│  ├── ImageModelSelector (dropdown)                   │
│  ├── SourceImageUpload (conditional for Img→Img)     │
│  ├── Prompt textarea                                 │
│  └── Generate button [💰 X credits]                  │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  generate-image Edge Function                        │
│  ├── Route by modelId                                │
│  │   ├── kie-* → KIE API                             │
│  │   ├── nano-banana-* → Lovable AI Gateway          │
│  │   ├── gpt-image → OpenAI API                      │
│  │   └── flux-* → Replicate API                      │
│  ├── Deduct credits based on model                   │
│  └── Store generation with model info                │
└──────────────────────────────────────────────────────┘
```

---

## Model Categories

**Text → Image (Generation)**
- Qwen z-image (budget)
- Grok Imagine text
- OpenAI 4o Image
- Flux1-Kontext Pro/Max
- Flux-2 Pro 1K/2K
- Flux 2 Flex 1K/2K
- Nano Banana Pro 2K/4K

**Image → Image (Transformation)**
- Recraft Remove Background
- Recraft Crisp Upscale
- Grok Imagine img
- Ideogram v3 Remix (TURBO/BALANCED/QUALITY)
- Ideogram v3 Edit QUALITY
- Ideogram V3 Reframe

---

## Credit Cost Color System

- 🟢 **Ultra Low** (0-2 cr): Green badge
- 🟢 **Low** (3-5 cr): Light green badge
- 🟠 **Medium** (6-15 cr): Orange badge
- 🔴 **High** (16+ cr): Red badge

---

## Implementation Steps

1. Create `src/lib/imageModels.ts` with all 18+ model configurations
2. Create `src/components/ImageModelSelector.tsx` dropdown component
3. Update `ImageGenerator.tsx` to integrate model selector
4. Add source image upload for Img→Img models
5. Update `generate-image` edge function with model routing
6. Update KIE API client with new endpoints
7. Test all model integrations
8. Update credit deduction logic per model

---

## Existing Models (Keep)

The current models will be retained and integrated:
- Nano Banana (Gemini Flash) - 1 credit
- Nano Banana Pro (Gemini Pro) - 3 credits
- FLUX Schnell (Replicate) - 1 credit
- FLUX Dev (Replicate) - 3 credits
- FLUX Pro (Replicate) - 5 credits
- GPT Image (OpenAI) - 4 credits

---

## SEO Considerations

- Add descriptive alt text for generated images
- Structured data for image generation tool
- Meta descriptions optimized for "AI image generator" keywords
