
# Fix: Video Stuck at 92% — Root Cause & Full Solution

## Diagnosis

The 92% cap is intentional code: `Math.min(prev + 4, 92)`. The progress increments every 3 seconds but deliberately stops at 92% waiting for the database to flip `status` to `completed`. That never happens because:

**The Railway worker never calls the webhook back.**

Database evidence: Every recent generation has `status: processing, progress: 20` forever — no `completed_at`, no `error_message`. The worker accepted the job (progress went from 10 → 20) but never sent the webhook completion callback to `video-webhook`.

## Root Cause: Two separate issues

### Issue 1 — Wrong endpoint on Railway Remotion worker
The `render-video` edge function now calls `POST /renders` (Remotion queue endpoint). The Remotion worker API does NOT support a `webhookUrl` callback — it only exposes:
- `POST /renders` — submits a job and returns a `jobId`
- `GET /renders/:jobId` — poll for status

The Remotion worker never calls any webhook. It expects the client to **poll `/renders/:jobId`** for progress, not wait for a callback.

### Issue 2 — The webhook-based architecture is designed for the FFmpeg worker
The `railway-video-service/index.js` (FFmpeg worker) DOES support `webhookUrl`. But the currently deployed service on Railway is the **Remotion** worker, which doesn't.

## Which worker is actually deployed?

From the Railway URL `clipmotion-video-production.up.railway.app`:
- It has `/renders` route → **Remotion worker**
- The FFmpeg `index.js` in the repo has `/render` → NOT deployed

The edge function sends `webhookUrl` + `generationId` to the Remotion worker but the Remotion worker ignores those fields entirely. So the generation stays at `processing: 20` forever.

## Solution: Add server-side progress polling for the Remotion job

Instead of relying on a webhook callback (which the Remotion worker doesn't support), the `render-video` edge function should:
1. Submit the job to `/renders` → get `jobId`
2. Return `{ generationId, jobId }` to the client immediately
3. A **new background polling mechanism** inside the edge function OR a scheduled check polls `GET /renders/:jobId` on Railway and updates the `generations` table

But edge functions can't run indefinitely. The cleanest fix is:

**Option A (Recommended — minimal changes):** Move the Remotion job status polling to a dedicated edge function that the client calls repeatedly, which in turn calls `GET /renders/:jobId` on Railway and updates the DB.

**Option B (Alternative):** Switch back to the FFmpeg worker (`railway-video-service/index.js`) which already has full webhook support. Deploy it to Railway and use `POST /render`.

## Chosen approach: Option A — Add a `poll-render-job` edge function

This is the smallest change and keeps the Remotion worker.

### What changes

**1. New edge function: `supabase/functions/poll-render-job/index.ts`**
- Called by the client every 3 seconds with `{ generationId, jobId }`
- Fetches `GET /renders/:jobId` from the Railway Remotion worker
- Maps Remotion job status to our DB progress:
  - `queued` → 25%
  - `rendering` → 50–85% (incrementing)
  - `done` → upload video URL to storage, set `status: completed, progress: 100`
  - `failed` → set `status: failed`, refund credits
- Returns the current status to the client

**2. `src/components/VideoGenerator.tsx` — update polling to call `poll-render-job`**
- Current: polls `generations` table directly (never updates because webhook never fires)
- New: every 3 seconds, call `poll-render-job` edge function with `{ generationId, jobId }`
- The edge function updates the DB, and the UI reads the new value
- Progress will now actually advance: 20% → 25% → 50% → 85% → 100%
- At 100%, the video URL is set and the video player shows

**3. `supabase/functions/render-video/index.ts` — store jobId in generation record**
- Add `job_id: jobId` to the `generations` insert (or update after job is accepted)
- This allows the poll function to retrieve it without the client tracking it separately

**4. Remove the 92% artificial cap**
- Change `Math.min(prev + 4, 92)` → no longer needed since real progress comes from Railway

### Flow after fix

```text
Client                     render-video EF          Railway Remotion Worker
  |                              |                          |
  |-- invoke render-video -----> |                          |
  |                              |-- POST /renders -------> |
  |                              |<-- { jobId } ----------- |
  |<-- { generationId, jobId } - |                          |
  |                              |                   (rendering...)
  |-- call poll-render-job (t+3s)|                          |
  |   { generationId, jobId }    |-- GET /renders/:jobId -> |
  |                              |<-- { status: rendering } |
  |                              |-- update generations DB  |
  |<-- { progress: 50 } -------- |                          |
  |-- call poll-render-job (t+6s)|-- GET /renders/:jobId -> |
  |                              |<-- { status: done, url } |
  |                              |-- upload to storage      |
  |                              |-- update DB: completed   |
  |<-- { progress: 100, url } -- |                          |
  |-- show video player -------> |                          |
```

### Files to modify

| File | Change |
|---|---|
| `supabase/functions/poll-render-job/index.ts` | New: polls Railway `/renders/:jobId`, updates DB, returns status |
| `supabase/functions/render-video/index.ts` | Store `jobId` in generations record after job accepted |
| `src/components/VideoGenerator.tsx` | Call `poll-render-job` edge function every 3s instead of querying DB directly; remove 92% cap |
| `supabase/config.toml` | Add `[functions.poll-render-job]` entry |

### Why not touch the Railway worker?

The Remotion worker already works correctly — it accepts jobs and renders videos. The only missing piece is the bridge that reads its status and writes it to our database. That bridge is the new `poll-render-job` edge function.
