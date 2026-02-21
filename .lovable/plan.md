

## Fix: Video renders without audio and shows raw text

### Problem

Two issues causing the broken video output:

1. **No voiceover audio**: The frontend sends `audioUrl` to the `render-video` edge function, but the edge function never extracts it from the request body and never forwards it to the Railway worker.
2. **Raw text dump on screen**: The worker only receives `titleText` — no `duration`, no `audioUrl`, no `image`. The Remotion composition falls back to its default React template.

### Root Cause

In `supabase/functions/render-video/index.ts`:
- Line 51: `const { quality, projectId, props } = body;` — `audioUrl` is never destructured from `body`
- Lines 129-138: The worker POST payload only includes `titleText` — missing `audioUrl`, `duration`, and `image`

### Fix (2 changes, same file)

**File: `supabase/functions/render-video/index.ts`**

#### Change 1 — Extract `audioUrl` from request body

```text
// Line 51: add audioUrl extraction
const { quality = "standard", projectId, props = {}, audioUrl } = body;
```

#### Change 2 — Forward all props to the Railway worker

Update the worker POST body (lines 129-138) to include `audioUrl`, `duration`, and a default background image:

```typescript
body: JSON.stringify({
  titleText: cleanText,
  audioUrl: audioUrl || null,
  duration,
  image: props.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=80",
  width: renderWidth,
  height: renderHeight,
  crf: renderCrf,
  concurrency: renderConcurrency,
  ffmpegThreads: renderThreads,
  webhookUrl,
  generationId,
}),
```

### Result After Fix

The Railway worker will receive:
- `titleText` — clean script text
- `audioUrl` — HTTPS URL to the voiceover MP3 (uploaded to storage)
- `duration` — video length in seconds
- `image` — background image URL

The Remotion composition can then render a proper video with audio track instead of the default React logo template.

### No other files need changes

- Frontend (`AIVideoGenerator.tsx`) already sends `audioUrl` correctly
- `poll-render-job` already handles the completion flow
- Railway worker already expects these props per the documented payload format

