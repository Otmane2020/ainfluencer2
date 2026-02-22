

## Fix Railway Rate Limit (500 logs/sec)

### Problem
Remotion's internal engine emits hundreds of log lines per render (bundling progress, browser lifecycle, frame timing stats, cleanup messages). This exceeds Railway's 500 logs/sec limit, causing 724 messages to be dropped.

### Solution
Wrap the Remotion render execution with a **console override** that filters out noisy internal logs, only allowing important messages through (errors, job-level status updates).

### Technical Details

**File: `railway-video-service/index.js`**

1. **Add a logging wrapper** around the `runRenderJob` function that temporarily replaces `console.log` with a filtered version during Remotion operations:
   - Allow lines starting with `[job-` (our own logs)
   - Allow lines containing `error`, `fail`, `warn`
   - Suppress all other Remotion internal noise (bundling %, frame stats, browser lifecycle, cleanup messages)

2. **Suppress bundler progress** in `initRemotionBundle` by removing or reducing the `onProgress` callback to only log at 0% and 100%.

3. **Reduce `renderMedia` verbosity** by setting `logLevel: "error"` in the Remotion render options (suppresses info-level logs from the renderer itself).

4. **Keep essential logs only**:
   - Job start/end with summary (duration, file size)
   - Render progress at 50% and 100% only
   - Errors and webhook notifications

### Deployment
After approval, push the updated `index.js` to the `render-server12` repository and redeploy on Railway.

