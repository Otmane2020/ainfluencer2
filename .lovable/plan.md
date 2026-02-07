

# Fix AI Prompt Generation to Sell Projects Effectively

## Problem

The AI-generated prompts for images and videos don't effectively sell projects because:

1. **Missing marketing data**: The ImageGenerator and VideoGenerator don't send the project's `marketing_context` (products, USP, target audience, brand tone) to the backend. The AI generates prompts "blind" -- without knowing what the brand sells.
2. **No overlay text suggestions**: Image prompts generate pure visual descriptions but never suggest overlay text (catchphrases, CTAs, selling hooks) that would appear on top of the image in post-production.
3. **Too artistic, not enough commercial**: The current system prompt focuses on "cinematic storytelling" and "visual emotions" but lacks instructions to showcase actual products, benefits, and conversion triggers.

## Solution

### Step 1: Send marketing context from frontend components

**ImageGenerator.tsx**:
- Add `marketing_context` to the Project interface
- Fetch `marketing_context` in the project query
- Send `marketingContext` in the `suggest-content` API call body

**VideoGenerator.tsx**:
- Send `marketingContext: project.marketing_context` in the `generate-video-scenario` call (already fetched but not sent)

### Step 2: Enhance image prompt generation with selling power

**suggest-content/index.ts** (`image_prompt` section):
- Add `overlayText` field to the JSON response schema -- the AI must suggest a catchy selling phrase for each prompt
- Add `cta` field -- a call-to-action recommendation
- Inject marketing context data (products, USP, audience pain points) directly into the system prompt
- Shift prompt instructions from "tell a silent story" to "SELL the product through visual impact + overlay copy"
- Each suggestion must reference a specific product/service from the project

### Step 3: Enhance video scenario generation with selling context

**generate-video-scenario/index.ts**:
- Accept and use `marketingContext` parameter
- Inject products/services, audience pain points, and USP into the system prompt
- Ensure each scenario directly addresses a real audience pain point or showcases a real product benefit

### Step 4: Auto-apply overlay text from suggestions

**ImageGenerator.tsx**:
- When a suggestion is selected, auto-fill the `overlayText` in `brandOptions` with the suggested text
- Auto-enable the `includeText` brand option when overlay text is provided

## Technical Details

### Files to modify

| File | Changes |
|------|---------|
| `src/components/ImageGenerator.tsx` | Add `marketing_context` to Project type, fetch it, send as `marketingContext` to API, auto-fill overlay text from suggestion |
| `src/components/VideoGenerator.tsx` | Send `marketingContext: project.marketing_context` in both scenario generation calls |
| `supabase/functions/suggest-content/index.ts` | Rework `image_prompt` system prompt to be sales-oriented, add `overlayText` and `cta` to JSON schema, inject marketing context |
| `supabase/functions/generate-video-scenario/index.ts` | Accept and inject `marketingContext` into system prompt for product-aware scripts |

### New image suggestion JSON schema

```json
{
  "suggestions": [
    {
      "id": "1",
      "title": "Hook title (max 50 chars)",
      "content": "Visual-only cinematic image prompt (no text)",
      "overlayText": "Catchy selling phrase for overlay (max 8 words)",
      "cta": "Call-to-action text (e.g. 'Try Free Today')",
      "contentType": "image",
      "estimatedEngagement": "high"
    }
  ]
}
```

### Key prompt changes for image generation

The system prompt will shift from:
- "Tell a SILENT STORY through emotions" (current)

To:
- "Create a CONVERSION-FOCUSED visual that SELLS the product"
- "Each prompt MUST reference a specific product/service from the brand"
- "Suggest an overlay text: a short, punchy phrase that sells"
- "Suggest a CTA aligned with the audience's pain points"

### No database changes required

All data (marketing_context, products, audience) already exists in the projects table. The fix is purely about connecting and using this data in the prompt generation pipeline.
