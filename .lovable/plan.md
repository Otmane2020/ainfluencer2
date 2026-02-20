
## Fix: Remotion/FFmpeg Video Generation Pipeline

### Root Cause Analysis

There are 3 cascading bugs:

**Bug 1 — Wrong URL (immediate):** `RENDER_WORKER_URL` was set to `https://TON-SERVICE.up.railway.app/renders` (placeholder). The correct path on the Railway worker is `/render` (no "s"). This alone causes the 404 error seen in logs.

**Bug 2 — Wrong payload format:** The `render-video` edge function sends `{ composition, props, quality }` to the Railway worker, but the Railway `index.js` expects `{ imageUrl, audioUrl, duration }`. These are completely incompatible.

**Bug 3 — Synchronous timeout:** The edge function awaits the Railway worker response synchronously. FFmpeg rendering takes 30-120 seconds, but Supabase edge functions time out after ~60 seconds. This will cause failures even if Bug 1 & 2 are fixed.

### Architecture — Async Flow (Required)

```text
Client                  Edge Function            Railway Worker
  |                          |                        |
  |-- POST render-video -->  |                        |
  |                          |-- POST /render ------> |
  |                          |   (fire & forget)      |
  |<-- { generationId } --   |                        |
  |                          |                (FFmpeg runs...)
  |-- poll generations -----> DB                      |
  |   every 3s               |                        |
  |                          |<-- webhook callback -- |
  |                          |   (on complete)        |
  |                          |-- update generation    |
  |<-- status: completed -   DB                       |
```

### What Will Be Changed

**1. Railway `index.js` — Add webhook callback support**

The worker currently returns the video as base64 in the HTTP response body (synchronous). We need to change it to:
- Accept `webhookUrl` + `generationId` in the request body
- Start FFmpeg in the background (non-blocking)
- Immediately return `{ jobId, status: "started" }` (202 Accepted)
- When FFmpeg finishes, upload the base64 video + call the webhook URL with the result

**2. Edge function `render-video/index.ts` — Fix payload + async**

- Fix the payload sent to the Railway worker to include `imageUrl` (generated from a background image based on the prompt), `audioUrl`, `duration`
- Since the worker is FFmpeg-based, send a **gradient/dark background image URL** as the base image when no `imageUrl` is provided
- Pass `webhookUrl` = the URL of a new `video-webhook` edge function + `generationId`
- Return immediately with `{ success: true, generationId }` — don't wait for FFmpeg

**3. New edge function `video-webhook/index.ts`**

- Receives the callback from the Railway worker when rendering is done
- Receives `{ generationId, video: { base64 } }`
- Uploads the base64 video to the `media` storage bucket
- Updates the `generations` row: `status = "completed"`, `media_url = <public URL>`

**4. `AIVideoGenerator.tsx` — Poll for completion**

- After invoking `render-video`, get back `generationId`
- Start polling the `generations` table every 3 seconds
- Show real progress bar (10% → 95% while polling, 100% when `status = "completed"`)
- When complete, display the video from `media_url`
- If `status = "failed"`, show error toast

**5. Update `RENDER_WORKER_URL` secret**

The user must update the secret to their actual Railway URL. We will update the edge function to gracefully detect the placeholder URL and show a clear error instead of a 404.

### Files to Edit

| File | Change |
|---|---|
| `railway-video-service/index.js` | Add async mode: accept `webhookUrl`, start FFmpeg in background, call webhook on complete |
| `supabase/functions/render-video/index.ts` | Fix payload format, make async, add webhook URL |
| `supabase/functions/video-webhook/index.ts` | New: receives callback, uploads video, updates `generations` |
| `supabase/config.toml` | Add `[functions.video-webhook]` entry |
| `src/components/AIVideoGenerator.tsx` | Replace sync call with poll-based UI |

### User Action Required

After these changes, the user must update the `RENDER_WORKER_URL` secret to their actual Railway deployment URL (e.g. `https://my-real-service.up.railway.app/render`). The Railway `index.js` also needs to be redeployed with the new async code.
