
# Context Injection Audit: Images vs Videos (Manual + Cron)

## Current State Analysis

### Image Generation

| Function | Uses Context Guard | Project Data | Status |
|----------|-------------------|--------------|--------|
| `generate-image/index.ts` | ✅ `validateAndBuildContext()` | Full marketing context, AI summary, language | Working |
| `generate-campaign-content/index.ts` | ✅ `validateAndBuildContext()` | Fetches project, builds context guard | Working |
| `run-campaigns-cron/index.ts` | ⚠️ Partial | Passes brandName, language to `generateImage()` | Partial |

### Video Generation

| Function | Uses Context Guard | Project Data | Status |
|----------|-------------------|--------------|--------|
| `generate-ai-video/index.ts` | ❌ Manual inline | Basic projectName, URL, aiContextSummary | Partial |
| `run-campaigns-cron/index.ts` | ❌ None | Only passes prompt to `generateVideo()` | MISSING |

---

## Issues Identified

### 1. Video Cron (`run-campaigns-cron`) - No Project Context
The `generateVideo()` and `generateReel()` functions in the cron job only receive:
```typescript
generateVideo(prompt, supabase, quality)
generateReel(prompt, supabase, brandName, language, quality)
```
Missing: full marketing context, AI summary, theme colors, target audience.

### 2. Video API (`generate-ai-video`) - No Context Guard
Uses inline context building instead of the shared `generation-context-guard.ts`:
```typescript
// Current: manual inline (lines 283-305)
if (projectName || aiContextSummary || marketingContext) {
  enhancedPrompt = `${contextParts.join(" | ")} - ${prompt}`;
}
```
This is inconsistent with images which use `validateAndBuildContext()`.

### 3. Cron Image Generation - Partial Context
The `generateImage()` function in cron gets language and brandName but not the full marketing context JSON.

---

## Solution Plan

### Step 1: Update `run-campaigns-cron/index.ts`

**Modify `generateImage()` signature** to accept full project context:
```typescript
async function generateImage(
  prompt: string, 
  supabase: any, 
  project: {
    name: string;
    detected_language: string | null;
    marketing_context: any;
    ai_context_summary: string | null;
    theme_color: string | null;
    url: string | null;
  },
  quality: string = "pro"
): Promise<string | null>
```

**Modify `generateVideo()` and `generateReel()` signatures** similarly.

### Step 2: Build Enhanced Prompts with Context Guard

In the cron generation functions, use the shared context guard:
```typescript
import { validateAndBuildContext } from "../_shared/generation-context-guard.ts";

// In generateImage/generateVideo:
const contextGuard = validateAndBuildContext({
  projectName: project.name,
  projectUrl: project.url,
  themeColor: project.theme_color,
  detectedLanguage: project.detected_language || "en",
  marketingContext: project.marketing_context,
  aiContextSummary: project.ai_context_summary,
  generationPrompt: prompt,
  generationType: "image", // or "video"
});

// Use contextGuard.enhancedPrompt instead of prompt
```

### Step 3: Update `generate-ai-video/index.ts`

Replace manual context building with the shared context guard:
```typescript
import { 
  validateAndBuildContext,
  fetchProjectContext,
  type MarketingContext 
} from "../_shared/generation-context-guard.ts";

// Fetch project if projectId provided
let project = null;
if (body.projectId) {
  const { project: p } = await fetchProjectContext(supabase, body.projectId);
  project = p;
}

// Build with context guard
const contextGuard = validateAndBuildContext({
  projectId: project?.id || body.projectId,
  projectName: project?.name || body.projectName,
  projectUrl: project?.url || body.projectUrl,
  detectedLanguage: project?.detected_language || body.detectedLanguage || "en",
  marketingContext: project?.marketing_context || body.marketingContext,
  aiContextSummary: project?.ai_context_summary || body.aiContextSummary,
  generationPrompt: prompt,
  generationType: "video",
});

// Use contextGuard.enhancedPrompt for API call
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/run-campaigns-cron/index.ts` | Pass full project to media generators, use context guard |
| `supabase/functions/generate-ai-video/index.ts` | Import and use `validateAndBuildContext()` |

---

## Expected Outcome

After implementation:
- All image and video generations (manual + cron) will use the same context guard
- Brand colors, tone, target audience, products will be injected consistently
- Output language will be enforced in both images and videos
- The context score will be logged for debugging

---

## Technical Details

### Context Guard Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                   User Prompt                               │
│  "Create a promo video for summer collection"              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              validateAndBuildContext()                      │
│                                                             │
│  • Add brand name, URL, theme color                        │
│  • Inject target audience pain points + desires            │
│  • Add products/services to showcase                       │
│  • Enforce output language                                 │
│  • Add visual style guidelines                             │
│  • Calculate context score (0-100)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Enhanced Prompt (2000+ chars)               │
│                                                             │
│  === BRAND CONTEXT FOR STARLINKO ===                       │
│  [OUTPUT LANGUAGE: FRENCH]                                 │
│  BRAND NAME: Starlinko                                     │
│  WEBSITE: https://starlinko.com                            │
│  PRIMARY COLOR: #F97316                                    │
│                                                             │
│  === TARGET AUDIENCE ===                                   │
│  WHO: Local business owners                                │
│  THEIR PAIN POINTS: Low visibility, few reviews            │
│  THEIR DESIRES: More customers, higher rankings            │
│  ...                                                       │
│                                                             │
│  === GENERATION TASK (VIDEO) ===                           │
│  Create a promo video for summer collection                │
│  ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

### Credit Costs (Unchanged)
- Standard Image: 1 credit
- Pro Image: 3 credits
- Standard Video: 5 credits
- Pro Video: 10 credits
- Cinema Video: 20 credits

