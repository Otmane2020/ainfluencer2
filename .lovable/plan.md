

# Fix Plan: Kling Motion Video Generation

## Problem Summary

The Video Motion feature fails because the Kling API request format is incorrect. The current implementation sends a nested structure (`input`/`config`) while the Kling API expects flat top-level fields.

Additionally, **Kling's lip-sync endpoint requires a video input, not an image** - making it incompatible with the portrait image use case.

## Solution: Use D-ID API for Talking Portraits

Since Kling's lip-sync requires a video (not image), we'll switch to **D-ID API** which is specifically designed for generating talking head videos from a portrait image + audio.

---

## Implementation Steps

### Step 1: Create D-ID Edge Function

Create a new edge function `generate-video-did` that uses the D-ID Talks API:

- **Endpoint**: `https://api.d-id.com/talks`
- **Method**: POST with source image URL and audio URL
- **Status polling**: `GET /talks/{id}` to check completion

Request format:
```json
{
  "source_url": "<portrait_image_url>",
  "script": {
    "type": "audio",
    "audio_url": "<audio_url>"
  },
  "config": {
    "stitch": true,
    "result_format": "mp4"
  }
}
```

### Step 2: Update VideoMotionGenerator

Modify the component to call the new D-ID edge function instead of Kling:

1. Keep Sora as a premium option
2. Replace Kling with D-ID for lip-sync generation
3. Update the provider configuration and UI labels

### Step 3: Add D-ID API Secret

Request the user to add their D-ID API key via the secrets tool.

---

## Technical Details

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-video-did/index.ts` | Create | New D-ID API integration |
| `supabase/config.toml` | Update | Add function config |
| `src/components/VideoMotionGenerator.tsx` | Update | Switch from Kling to D-ID |

### D-ID API Request Structure

```typescript
// Create talk
POST https://api.d-id.com/talks
{
  "source_url": imageUrl,
  "script": {
    "type": "audio",
    "audio_url": audioUrl
  },
  "config": {
    "stitch": true,
    "result_format": "mp4"
  }
}

// Check status
GET https://api.d-id.com/talks/{id}
```

### Provider Configuration Update

```typescript
const MOTION_PROVIDERS = {
  did: {
    id: "did" as MotionProvider,
    name: "D-ID",
    description: "Realistic lip-sync from portraits",
    badge: "LIP-SYNC",
    features: ["Image to talking video", "Natural lip movements", "Fast processing"],
  },
  sora: {
    id: "sora" as MotionProvider,
    name: "Sora 2",
    description: "Premium cinematic quality",
    badge: "PREMIUM",
    features: ["Natural expressions", "Micro-gestures", "Cinema quality"],
  },
};
```

---

## Why D-ID Instead of Kling?

| Feature | Kling | D-ID |
|---------|-------|------|
| Input type for lip-sync | Video only ❌ | Image + Audio ✅ |
| Purpose | General video animation | Talking portraits |
| API complexity | Complex, multiple endpoints | Simple, single endpoint |
| Lip-sync quality | Not designed for images | Specialized for this |

---

## Alternative: Fix Kling for Animation Only

If you want to keep Kling as an option for **animation without lip-sync**, we can fix the request format:

```typescript
// Correct Kling image2video format (NO lip-sync)
{
  "model": "kling-video/v1.6/pro/image-to-video",
  "image_url": imageUrl,
  "prompt": "Person speaking naturally",
  "duration": 5
}
```

But this won't sync lips to audio - it will just animate the portrait generically.

---

## Expected Outcome

After implementing D-ID:
- Upload a portrait image
- Enter script text (converted to audio via TTS)
- D-ID generates a video with realistic lip-sync
- Video is returned and playable in the UI

