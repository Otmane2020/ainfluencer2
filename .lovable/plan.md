
# Fix Plan: Kling API "mode" Parameter Error

## Problem Analysis

The error `input.mode: must not be null` indicates the Kling API request is missing a required `mode` field. After investigating the Kling API documentation and the current implementation, I found two issues:

### Issue 1: Wrong API Endpoint
The current code uses `/v1/videos/lip-sync` which is designed for:
- **Input**: Existing video + audio
- **Output**: Video with lip-synced audio

But the Video Motion feature needs to create talking videos from:
- **Input**: Still portrait image + audio
- **Output**: Animated talking video

This requires the **AI Avatar** endpoint, not the Lip-Sync endpoint.

### Issue 2: Missing Required Field
Even for the lip-sync endpoint, the `mode` field is required to specify the operation type:
- `audio_to_video` - Sync audio to video
- `text_read` - Generate speech from text

## Solution Options

### Option A: Switch to AI Avatar API (Recommended)
Use the correct Kling AI Avatar endpoint (`/v1/videos/ai-avatar`) which takes:
- `image_url` - Portrait image URL
- `audio_url` - Audio file URL  
- `prompt` - Optional prompt for generation

This matches the Video Motion feature's intended functionality.

### Option B: Fix Lip-Sync Endpoint
If staying with lip-sync, we would need to:
1. First generate a still video from the image
2. Then apply lip-sync with the audio
3. Add the missing `mode: "audio_to_video"` field

This is more complex and less suitable for the use case.

## Implementation Plan (Option A)

### Step 1: Update Edge Function Endpoint and Payload
Modify `supabase/functions/generate-video-kling/index.ts`:

```text
Changes:
1. Change endpoint from /v1/videos/lip-sync to /v1/videos/ai-avatar
2. Update request body structure:
   - Use image_url instead of face_image_url
   - Remove audio_type field
   - Add mode: "audio" for audio-driven generation
   - Include prompt field (optional)
3. Update status check endpoint to /v1/videos/ai-avatar/{taskId}
```

### Step 2: Request Body Structure
```json
{
  "model_name": "kling-v1",
  "input": {
    "image_url": "https://...",
    "audio_url": "https://...",
    "mode": "audio"
  }
}
```

### Step 3: Update Response Handling
The AI Avatar endpoint may return slightly different response structure - update parsing accordingly.

## Technical Details

| Item | Current | Updated |
|------|---------|---------|
| Endpoint | `/v1/videos/lip-sync` | `/v1/videos/ai-avatar` |
| Image field | `face_image_url` | `image_url` |
| Mode field | Missing | `"audio"` |
| Status endpoint | `/v1/videos/lip-sync/{id}` | `/v1/videos/ai-avatar/{id}` |

## Files to Modify
- `supabase/functions/generate-video-kling/index.ts`

## Expected Outcome
After this fix, the Video Motion feature will correctly call the Kling AI Avatar API to generate talking videos from portrait images and audio files.
