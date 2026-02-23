

## Root Cause Analysis: Video Generation Failures

There is a **payload mismatch** between the `render-video` edge function and what `render-server12` actually expects. The edge function was written for a different server architecture (the `index.js` shown in `railway-video-service/`), not your real deployed `render-server12`.

### The 3 Mismatches

| Field | Edge function sends | render-server12 expects |
|-------|-------------------|----------------------|
| Props | `titleText`, `audioUrl`, `imageUrl` at top level | Nested inside `props: { ... }` |
| Callback URL | `webhookUrl` | `callbackUrl` |
| Template/Composition | `"template-prompt-to-video"` | Must match a composition ID registered in `templates/index.tsx` on the server |

### What needs to change

**Option A (recommended): Update the `render-video` edge function** to match what render-server12 expects:

1. Restructure the POST body so `imageUrl`, `audioUrl`, `titleText`, `duration`, `width`, `height` are nested inside `props`
2. Rename `webhookUrl` to `callbackUrl`
3. Set the correct `templateId` matching what is registered in your Remotion `templates/index.tsx` on Railway

**Option B: Update render-server12** to accept the current edge function payload (destructure the flat fields, rename callbackUrl to webhookUrl). This is what we partially did in the last session.

### Recommended Fix (Option A)

Update `supabase/functions/render-video/index.ts` to send the correct payload format:

```text
BEFORE (line 147-160):
  body: JSON.stringify({
    templateId,
    titleText: cleanText,
    audioUrl: audioUrl || null,
    duration,
    imageUrl: props.image || "https://...",
    width, height, crf, concurrency, ffmpegThreads,
    webhookUrl,
    generationId,
  })

AFTER:
  body: JSON.stringify({
    templateId: "<your-actual-composition-id>",
    props: {
      titleText: cleanText,
      audioUrl: audioUrl || null,
      imageUrl: props.image || "https://...",
      duration,
      width: renderWidth,
      height: renderHeight,
    },
    callbackUrl: webhookUrl,
  })
```

### Pre-requisite: Confirm Composition ID

Before implementing this fix, we need to know the exact composition IDs registered in your `render-server12` Remotion templates. You can check by calling `GET /templates` on your Railway worker, or by looking at the `templates/index.tsx` file in the `render-server12` repository.

### Additional fix: render-callback webhook

The `render-callback` edge function expects `{ jobId, generationId, status, videoUrl }` in the webhook payload, but render-server12 sends `{ jobId, status: "completed", outputUrl: "/renders/..." }`. The callback needs to also handle `outputUrl` as the video path field.

### Steps

1. Confirm the Remotion composition IDs from your render-server12 `/templates` endpoint
2. Update `render-video` edge function to send properly structured payload matching render-server12's API
3. Update `render-callback` to accept `outputUrl` in addition to `videoUrl`
4. Test end-to-end video generation
