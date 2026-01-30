

# Integration of Nano Banana Video API

## Summary

Replace CometAPI and Replicate with the **Nano Banana Video API** for video generation. This API offers a simpler, more reliable solution with direct video URL response (no complex polling) and supports text-to-video and image-to-video generation.

## API Overview

| Feature | Nano Banana API |
|---------|-----------------|
| **Base URL** | `https://nanobananavideo.com/api/v1/` |
| **Auth** | `X-API-Key` header |
| **Text-to-Video** | `POST /text-to-video.php` |
| **Image-to-Video** | `POST /image-to-video.php` |
| **Status Check** | `GET /video-status.php?video_id=X` |
| **Resolutions** | 480p, 720p, 1080p |
| **Durations** | 3-12 seconds |
| **Aspect Ratios** | 16:9, 9:16, 1:1, 4:5, etc. |

## Implementation Plan

### Step 1: Add API Key Secret

Request the user to add their Nano Banana API key:

```text
Secret Name: NANOBANANA_API_KEY
```

### Step 2: Update Edge Functions

#### A. Update `generate-video-sora/index.ts`

Replace the current CometAPI/Lovable AI logic with Nano Banana API:

```text
┌─────────────────────────────────────────────────────────────┐
│                  VIDEO GENERATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌───────────────────┐                 │
│  │ Quality Tier │────▶│ Resolution Map    │                 │
│  └──────────────┘     └────────┬──────────┘                 │
│                                │                             │
│    Standard (5 cr) ──────────▶ 720p                         │
│    Pro (10 cr) ──────────────▶ 1080p                        │
│    Cinema (20 cr) ───────────▶ 1080p + longer duration      │
│                                                              │
│         ┌──────────────────────────────────────────┐        │
│         ▼                                          │        │
│  ┌────────────────────────────────────────────────┐│        │
│  │ POST /text-to-video.php                        ││        │
│  │ {                                              ││        │
│  │   "prompt": "...",                             ││        │
│  │   "resolution": "1080p",                       ││        │
│  │   "duration": 8,                               ││        │
│  │   "aspect_ratio": "9:16"                       ││        │
│  │ }                                              ││        │
│  └────────────────────────────────────────────────┘│        │
│                                                     │        │
│         ┌───────────────────────────────────────────┘        │
│         ▼                                                    │
│  ┌────────────────────────────────────────────────┐         │
│  │ Response:                                       │         │
│  │ {                                               │         │
│  │   "success": true,                              │         │
│  │   "video_id": 123,                              │         │
│  │   "video_url": "https://...mp4"                 │         │
│  │ }                                               │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Key changes:
- Remove CometAPI and Lovable AI video generation
- Implement Nano Banana text-to-video endpoint
- Map quality tiers to resolutions:
  - **Standard**: 720p, max 10s
  - **Pro**: 1080p, max 12s
  - **Cinema**: 1080p, max 12s (extended features)
- Handle synchronous video URL response (no polling needed for most cases)
- Add status polling via `/video-status.php` for queued videos

#### B. Update `generate-ai-video/index.ts`

Similar refactor for the AI Video MULTI tool:
- Replace CometAPI with Nano Banana API
- Support image-to-video via `/image-to-video.php` endpoint
- Update status checking to use Nano Banana status endpoint

### Step 3: Update Model Configuration

#### A. Update `src/lib/modelPools.ts`

Replace CometAPI model references with Nano Banana:

```typescript
export const VIDEO_MODEL_POOLS: Record<string, ModelOption[]> = {
  "standard-video": [
    { id: "nano-banana-720p", provider: "nanobanana", weight: 100, apiModel: "720p", maxDuration: 10 },
  ],
  "pro-video": [
    { id: "nano-banana-1080p", provider: "nanobanana", weight: 100, apiModel: "1080p", maxDuration: 12 },
  ],
  "cinema-video": [
    { id: "nano-banana-1080p-hq", provider: "nanobanana", weight: 100, apiModel: "1080p", maxDuration: 12 },
  ],
};
```

#### B. Update `src/lib/commercialProducts.ts`

Update quality tier descriptions:
- Standard: "Nano Banana • 720p (10s max)"
- Pro: "Nano Banana HD • 1080p (12s max)"
- Cinema: "Nano Banana Premium • 1080p"

### Step 4: Implement Status Polling

For videos that return `queued` or `processing` status:

```typescript
// Status check endpoint
const checkNanoBananaStatus = async (videoId: number): Promise<{
  status: "queued" | "processing" | "completed" | "failed";
  video_url?: string;
}> => {
  const response = await fetch(
    `https://nanobananavideo.com/api/v1/video-status.php?video_id=${videoId}`,
    { headers: { "X-API-Key": apiKey } }
  );
  return response.json();
};
```

### Step 5: Handle Error Cases

Implement proper error handling:
- **400**: Invalid parameters → Return validation error
- **401**: Invalid API key → Log and throw auth error
- **429**: Rate limit (10/30min) → Queue and retry with backoff
- **500+**: Server error → Refund credits automatically

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/generate-video-sora/index.ts` | Major refactor - replace all API calls |
| `supabase/functions/generate-ai-video/index.ts` | Major refactor - replace CometAPI |
| `src/lib/modelPools.ts` | Update video model pool to Nano Banana |
| `src/lib/commercialProducts.ts` | Update quality tier descriptions |

## Duration & Resolution Mapping

| Quality | Resolution | Max Duration | Credits |
|---------|------------|--------------|---------|
| Standard | 720p | 10s | 5 |
| Pro | 1080p | 12s | 10 |
| Cinema | 1080p | 12s | 20 |

## Credit Cost Calculation (Per Nano Banana Docs)

The API uses its own credit system internally, but our platform credits remain unchanged:
- Base: 5 platform credits
- 1080p: +5 credits (Pro/Cinema tiers)
- Duration >5s: +1 credit per extra second (built into tier pricing)

## Benefits of This Migration

1. **Reliability**: Direct video URL response reduces polling complexity
2. **Simplicity**: Single provider instead of CometAPI + Replicate + Lovable AI
3. **Speed**: 3-12s video generation with immediate URL
4. **Features**: Native support for aspect ratios (9:16 for reels, 16:9 for landscape)
5. **Image-to-Video**: Direct support for reference image animation

## Technical Implementation Details

### New Helper Functions

```typescript
// Resolution mapping
function getResolutionForQuality(quality: string): string {
  return quality === "standard" ? "720p" : "1080p";
}

// Aspect ratio mapping
function getAspectRatio(format: string): string {
  switch (format) {
    case "vertical":
    case "reel":
      return "9:16";
    case "square":
      return "1:1";
    default:
      return "16:9";
  }
}

// Duration clamping (API limit: 3-12s)
function clampDuration(duration: number): number {
  return Math.max(3, Math.min(12, duration));
}
```

### API Request Structure

```typescript
const response = await fetch("https://nanobananavideo.com/api/v1/text-to-video.php", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": NANOBANANA_API_KEY,
  },
  body: JSON.stringify({
    prompt: prompt,
    resolution: getResolutionForQuality(quality),
    duration: clampDuration(duration),
    aspect_ratio: getAspectRatio(format),
  }),
});

const result = await response.json();
// result.video_url is immediately available if success=true
```

