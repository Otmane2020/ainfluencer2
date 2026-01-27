

# Plan: Create a New AI Video Scenario Generator

## Problem Analysis

The current video script generation (sparkles button) produces generic marketing-style text like *"Marre des avis Google sans réponse?"* instead of structured **video scenarios** with:
- Timestamped segments (`[0-1s]`, `[1-3s]`, etc.)
- Visual scene descriptions
- Voiceover text
- Proper duration-based word counts

## Solution Overview

Create a new **dedicated edge function** specifically for generating rich video scenarios, and update the VideoGenerator to use it instead of the generic `suggest-content` function.

## Implementation Steps

### Step 1: Create new `generate-video-scenario` Edge Function

A new edge function that generates **complete video scenarios** with:

```text
Video Scenario Structure:
- Scene-by-scene breakdown with timestamps
- Visual directions (what to show)
- Voiceover/script text
- Transitions and effects suggestions
- Duration-optimized word count (2.5 words/second)
```

**Key Features:**
- Uses project context (name, description, scraped URL content)
- Applies scenario parameters (Sector, Style, Tone)
- Supports multiple script types: Reel, Ad, Testimonial, Story
- Enforces strict French quality (no English, no generic phrases)
- Returns structured JSON with multiple scenario options

**Example Output:**
```json
{
  "scenarios": [
    {
      "id": "1",
      "title": "La révélation client",
      "angle": "emotion",
      "scenes": [
        {
          "timestamp": "[0-2s]",
          "visual": "Gros plan sur un écran avec des notifications d'avis Google",
          "voiceover": "Tu vois ça ? 47 avis sans réponse."
        },
        {
          "timestamp": "[2-5s]",
          "visual": "Le propriétaire fatigué devant son ordinateur",
          "voiceover": "Chaque avis ignoré, c'est un client perdu."
        }
      ],
      "fullScript": "Tu vois ça ? 47 avis sans réponse...",
      "hashtags": ["avisGoogle", "businessLocal"]
    }
  ]
}
```

### Step 2: Update VideoGenerator Component

Modify `generateAIScript` function to:

1. Call the new `generate-video-scenario` edge function
2. Display a **scenario picker modal** showing multiple options with:
   - Title and angle (emotion, problem, benefit, urgency)
   - Scene preview
   - Estimated engagement level
3. Allow user to select a scenario or regenerate
4. Populate the script textarea with the selected scenario's full script

### Step 3: Add Scenario Preview UI Component

Create a `ScenarioPreview` component that displays:
- Visual scene breakdown with timestamps
- Voiceover text per segment
- Quick actions: Select, Copy, Edit

## Technical Details

### New Edge Function: `generate-video-scenario/index.ts`

**Location:** `supabase/functions/generate-video-scenario/index.ts`

**API Input:**
```typescript
{
  projectId: string;
  projectName: string;
  projectDescription?: string;
  projectUrl?: string;
  scrapedContent?: string;
  sectorId?: string;    // Business sector (restaurant, tech, etc.)
  styleId?: string;     // Video style (testimonial, demo, ugc, etc.)
  toneId?: string;      // Emotional tone (urgent, inspiring, etc.)
  scriptType: "reel" | "ad" | "story" | "testimonial";
  duration: number;     // 4, 8, 12, or 20 seconds
}
```

**API Output:**
```typescript
{
  scenarios: Array<{
    id: string;
    title: string;
    angle: "problem" | "benefit" | "emotion" | "proof" | "urgency";
    scenes: Array<{
      timestamp: string;
      visual: string;
      voiceover: string;
    }>;
    fullScript: string;
    hashtags: string[];
    estimatedEngagement: "high" | "medium" | "low";
  }>;
}
```

### VideoGenerator Changes

1. Replace current `generateAIScript` call to `suggest-content` with new `generate-video-scenario`
2. Add state for scenario selection modal
3. Add scenario picker UI with visual scene cards

### Updated Config

Add entry in `supabase/config.toml`:
```toml
[functions.generate-video-scenario]
verify_jwt = false
```

## User Experience Flow

```text
1. User clicks Sparkles button in VideoGenerator
2. Project selector popover appears (existing)
3. User selects project
4. Loading state shows "Generating scenarios..."
5. Modal appears with 3-5 scenario cards
6. Each card shows:
   - Title and angle badge
   - Scene timeline preview (with timestamps)
   - Full script preview
7. User clicks "Use this scenario"
8. Script populates in textarea, ready for generation
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-video-scenario/index.ts` | **Create** | New edge function for video scenario generation |
| `supabase/config.toml` | **Modify** | Add function configuration |
| `src/components/VideoGenerator.tsx` | **Modify** | Update generateAIScript to use new function |
| `src/components/ScenarioPickerModal.tsx` | **Create** | New modal for selecting generated scenarios |

## Quality Safeguards

The new function will enforce:
- French language only (reject English words)
- No generic marketing phrases ("Découvrez", "N'attendez plus")
- Timestamp structure matching duration
- Word count validation (2.5 words/second ± 15%)
- Scene-by-scene visual coherence

