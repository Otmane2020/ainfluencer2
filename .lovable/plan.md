
# ClipMotion Feature Implementation Plan

## Overview

ClipMotion is a specialized **video generation mode** for creating short, dynamic, highly-engaging videos optimized for social media platforms (TikTok, Instagram Reels, YouTube Shorts). It uses the **same existing APIs** (CometAPI, Kling, Veo, Sora) but applies a different prompt engineering approach to produce fast-paced, animated content.

---

## What is ClipMotion?

```text
+----------------------------------+     +----------------------------------+
|        STANDARD VIDEO            |     |          CLIPMOTION              |
+----------------------------------+     +----------------------------------+
| - Cinematic pacing               |     | - Fast cuts (1-2s per scene)     |
| - Long shots                     |     | - Zoom & pan movements           |
| - Smooth transitions             |     | - Dynamic text animations        |
| - Professional narration         |     | - High energy rhythm             |
| - 4-12 seconds typical           |     | - Social-first (5-15 seconds)    |
| - Any aspect ratio               |     | - Always vertical 9:16           |
+----------------------------------+     +----------------------------------+
```

**Key Differentiators:**
- Optimized for Reels / TikTok / Shorts
- Vertical format (9:16) by default
- Animated text overlays
- Fast-paced editing rhythm
- Designed to capture attention in the first 2 seconds

---

## Implementation Approach

### 1. Create ClipMotion Configuration

**File:** `src/lib/clipMotionConfig.ts` (new)

Define ClipMotion-specific parameters:
- Default duration: 5-10 seconds
- Format: Always 9:16 vertical
- Prompt modifiers for dynamic editing
- Scene pacing guidelines
- Text animation instructions

```typescript
export interface ClipMotionConfig {
  enabled: boolean;
  scenePacing: "fast" | "medium";  // cuts per second
  textAnimations: boolean;
  cameraMovements: boolean;        // zoom, pan, tilt
  hookIntensity: "high" | "ultra"; // first 2s attention grabber
}

export const CLIPMOTION_PROMPT_MODIFIERS = {
  pacing: "Fast-paced editing with 1-2 second cuts. Dynamic rhythm.",
  camera: "Frequent zoom effects, subtle pan movements, smooth parallax.",
  hook: "Opening hook in first 2 seconds. Immediate visual impact.",
  text: "Animated text overlays. Kinetic typography. Punchlines emphasized.",
  style: "Social media optimized. TikTok/Reels aesthetic. Trendy and modern.",
};
```

### 2. Add Video Mode Toggle in VideoGenerator

**File:** `src/components/VideoGenerator.tsx`

Add a mode selector in the Quick Settings Bar:

```text
+----------------------------------------------+
| [Format▼] [Avatar] [Voice] [Quality▼]        |
| [Standard Video] [ClipMotion ✨]              | <-- New toggle
| [Scenario] [Brand Options]                    |
+----------------------------------------------+
```

Changes:
- Add `videoMode` state: `"standard" | "clipmotion"`
- Create toggle group or segmented control
- When ClipMotion is selected:
  - Force format to "reel" (9:16)
  - Adjust duration options (5s, 10s recommended)
  - Display ClipMotion-specific tips

### 3. Modify Prompt Engineering

**File:** `supabase/functions/generate-video-sora/index.ts`

Add ClipMotion prompt enhancement:

```typescript
if (videoMode === "clipmotion") {
  fullPrompt = `[CLIPMOTION MODE] ${CLIPMOTION_PROMPT_MODIFIERS.hook}
${CLIPMOTION_PROMPT_MODIFIERS.pacing}
${CLIPMOTION_PROMPT_MODIFIERS.camera}
${CLIPMOTION_PROMPT_MODIFIERS.text}
${CLIPMOTION_PROMPT_MODIFIERS.style}

CONTENT: ${prompt}`;
}
```

### 4. Update Scenario Generation

**File:** `supabase/functions/generate-video-scenario/index.ts`

Add ClipMotion-specific scenario templates:

```typescript
if (videoMode === "clipmotion") {
  systemPrompt += `
Generate SHORT, PUNCHY scenarios optimized for social media:
- Hook in first 2 seconds (question, shocking stat, or bold statement)
- Maximum 5 scenes, 1-2 seconds each
- Include text overlay suggestions for each scene
- End with a call-to-action or hook for engagement
- Use trending formats: POV, storytelling, quick tips
`;
}
```

### 5. Add ClipMotion to Campaign Wizard

**File:** `src/components/campaigns/CampaignWizardModal.tsx`

In the Volume step (Step 3), add a ClipMotion toggle for video campaigns:

```text
+--------------------------------------------------+
| Video Settings                                    |
| [x] Generate as ClipMotion                        |
|     Create dynamic, social-first video content    |
+--------------------------------------------------+
```

When enabled:
- Store `clipmotion: true` in campaign settings
- Pass to `generate-campaign-content` edge function

### 6. Update Campaign Content Generation

**File:** `supabase/functions/generate-campaign-content/index.ts`

Add ClipMotion handling:

```typescript
const isClipMotion = body.clipmotion || false;

// When generating video prompts
if (isClipMotion) {
  promptInstructions += `
Style: ClipMotion (social-first, fast-paced)
- Create hook-heavy content
- Short punchy scenes
- Dynamic camera movements
- Animated text suggestions
`;
}
```

---

## UI/UX Design

### VideoGenerator Mode Selector

```text
┌─────────────────────────────────────────────────┐
│  Video Type                                      │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Standard    │  │  ✨ ClipMotion           │  │
│  │  Video       │  │  Social & Dynamic        │  │
│  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Toggle Group Component

Using existing `ToggleGroup` from `@radix-ui/react-toggle-group`:

```tsx
<ToggleGroup type="single" value={videoMode} onValueChange={setVideoMode}>
  <ToggleGroupItem value="standard">
    <Video className="h-4 w-4 mr-1" />
    Standard
  </ToggleGroupItem>
  <ToggleGroupItem value="clipmotion" className="gap-1">
    <Sparkles className="h-4 w-4 mr-1 text-primary" />
    ClipMotion
  </ToggleGroupItem>
</ToggleGroup>
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/clipMotionConfig.ts` | **Create** | ClipMotion configuration & prompt modifiers |
| `src/components/VideoGenerator.tsx` | **Modify** | Add video mode toggle, pass mode to API |
| `src/components/VideoModeSelector.tsx` | **Create** | Reusable mode selector component |
| `supabase/functions/generate-video-sora/index.ts` | **Modify** | Handle ClipMotion prompt enhancement |
| `supabase/functions/generate-video-scenario/index.ts` | **Modify** | ClipMotion-specific scenario generation |
| `supabase/functions/generate-campaign-content/index.ts` | **Modify** | Support ClipMotion flag in campaigns |
| `src/components/campaigns/CampaignWizardModal.tsx` | **Modify** | Add ClipMotion toggle for video campaigns |
| `src/lib/videoScenarios.ts` | **Modify** | Add ClipMotion-specific presets |

---

## Technical Details

### VideoGenerator Changes

```typescript
// New state
const [videoMode, setVideoMode] = useState<"standard" | "clipmotion">("standard");

// Auto-adjust format when ClipMotion selected
useEffect(() => {
  if (videoMode === "clipmotion") {
    setSelectedFormat("reel");
  }
}, [videoMode]);

// Pass mode to API
body: JSON.stringify({
  prompt: ...,
  videoMode, // "standard" or "clipmotion"
  duration: segment.duration,
  format: selectedFormat,
  ...
})
```

### Edge Function Enhancement

```typescript
// In generate-video-sora/index.ts
const { videoMode = "standard" } = await req.json();

let fullPrompt = prompt;

if (videoMode === "clipmotion") {
  const clipMotionPrefix = `
[CLIPMOTION - Social Media Optimized Video]
- Fast-paced editing with 1-2 second scene cuts
- Dynamic camera movements (zoom, pan, parallax)
- High energy opening hook in first 2 seconds
- Animated text overlays and kinetic typography
- Modern social media aesthetic (TikTok/Reels style)

CONTENT TO VISUALIZE:
`;
  fullPrompt = clipMotionPrefix + prompt;
}
```

---

## Constraints Respected

1. **No new APIs** - Uses existing CometAPI models (Kling, Veo, Sora)
2. **No module recreation** - Extends existing VideoGenerator
3. **Clean integration** - Just adds a mode toggle
4. **Backwards compatible** - Default is "Standard" mode
5. **English UI** - All labels and text in English

---

## Estimated Changes

- **~150 lines** new configuration file
- **~80 lines** new VideoModeSelector component
- **~50 lines** modifications to VideoGenerator
- **~30 lines** modifications per edge function (3 functions)
- **~20 lines** modifications to CampaignWizardModal

**Total: ~400-450 lines of new/modified code**
