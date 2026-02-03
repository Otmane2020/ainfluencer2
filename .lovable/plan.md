

# Fix Plan: Kling API "image can not be null" Error

## Problem Analysis

The error `{"code":1201,"message":"image can not be null"}` indicates that the Kling API is not receiving the image URL in the expected format. After analyzing the edge function logs and official Kling API documentation:

### Root Cause
The current implementation sends the request with an incorrectly nested structure:
```json
{
  "input": {
    "image_url": "...",    // ❌ Wrong: nested inside "input"
    "audio_url": "..."
  },
  "config": { ... }
}
```

But Kling's `/v1/videos/image2video` endpoint expects:
```json
{
  "model_name": "kling-v1-6",
  "image": "...",           // ✅ Correct: top-level "image" field
  "prompt": "...",
  "duration": 5,
  "mode": "std"             // ✅ Required: "std" or "pro"
}
```

### Additional Issues Found
1. The `/v1/images/ai-avatar` endpoint returns 404 — it doesn't exist on `api.klingai.com`
2. The lip-sync endpoint requires `mode` field which is missing
3. The `image2video` endpoint requires `image` (not `image_url`) at the top level

## Solution

### Step 1: Fix the Image-to-Video Request Format
Update the `generate-video-kling` edge function to use the correct Kling API structure:

**For Image-to-Video endpoint** (`/v1/videos/image2video`):
```json
{
  "model_name": "kling-v1-6",
  "image": "<public_image_url>",
  "prompt": "Person speaking naturally, lip-synced to audio",
  "duration": 5,
  "mode": "std",
  "aspect_ratio": "9:16"
}
```

**For Lip-Sync endpoint** (`/v1/videos/lip-sync`) — when image is actually a video:
```json
{
  "video_url": "...",
  "audio_url": "...",
  "mode": "audio2video"
}
```

### Step 2: Update Endpoint Strategy
Since Kling's lip-sync requires a **video** input (not image), the correct flow for talking portraits is:
1. First: Generate a short looping video from the portrait image using `/v1/videos/image2video`
2. Then: Apply lip-sync to that video using `/v1/videos/lip-sync`

Alternatively, use the simpler approach of just using image-to-video with a speaking prompt.

### Step 3: Add Missing Mode Parameter
The `mode` field is **required** for both endpoints:
- For image2video: `"std"` (standard) or `"pro"` (professional)
- For lip-sync: `"audio2video"` (sync audio to video)

## Implementation Details

### Changes to `supabase/functions/generate-video-kling/index.ts`

```text
1. Remove the non-existent /v1/images/ai-avatar attempt

2. Fix /v1/videos/image2video request body:
   - Change "input.image_url" → top-level "image"
   - Add required "mode": "std" field
   - Move prompt to top level
   - Remove nested "input" and "config" structure

3. Fix /v1/videos/lip-sync request body:
   - Add required "mode": "audio2video"
   - Keep video_url and audio_url structure

4. Update status endpoint paths accordingly
```

### Before vs After

| Field | Before (Wrong) | After (Correct) |
|-------|----------------|-----------------|
| Image field | `input.image_url` | `image` (top-level) |
| Mode field | Missing | `"mode": "std"` |
| Structure | Nested in `input`/`config` | Flat top-level fields |
| Model name | In `config` | Top-level `model_name` |

### Request Body Structure (Fixed)

```javascript
// Image-to-Video (primary for talking portraits)
{
  "model_name": "kling-v1-6",
  "image": imageUrl,
  "prompt": "Person speaking naturally to camera, expressive face, natural lip movements",
  "duration": 5,
  "mode": "std",
  "aspect_ratio": "9:16"
}
```

## Files to Modify
- `supabase/functions/generate-video-kling/index.ts` — Fix request body structure

## Expected Outcome
After this fix, the Video Motion feature will correctly call the Kling image-to-video API and generate talking portrait videos without the "image can not be null" error.

