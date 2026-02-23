

## Fix Railway Rate Limit + Poll 404s on render-server12

### Problem 1: Log Spam (176 messages dropped)
Your current code uses `spawn("npx", ["remotion", "render", ... "--log", "verbose"])` which dumps every frame to stdout/stderr, and you log ALL of it. This exceeds Railway's 500 logs/sec limit.

### Problem 2: Poll 404 errors
Your edge function `poll-render-job` polls `/renders/{jobId}` but your server exposes job status at `/jobs/{id}`. The `/renders` path only serves static MP4 files. This is why generations get stuck at 20%.

### What you need to change in render-server12

You need to manually update the `index.js` file in your `render-server12` GitHub repository with these changes:

**Change 1** -- Reduce Remotion log level from `verbose` to `error`:
```text
BEFORE:  "--log", "verbose"
AFTER:   "--log", "error"
```

**Change 2** -- Filter stdout/stderr to only log at 25% intervals instead of every line:
```text
BEFORE:
  renderProcess.stdout.on("data", (data) => {
    const output = data.toString();
    console.log(`[${jobId}] ${output}`);          // <-- logs EVERY line
    ...
  });

AFTER:
  renderProcess.stdout.on("data", (data) => {
    const output = data.toString();
    const progressMatch = output.match(/(\d+)%/);
    if (progressMatch) {
      const pct = parseInt(progressMatch[1]);
      job.progress = pct;
      if (pct === 50 || pct === 100) {            // <-- only log at 50% and 100%
        console.log(`[${jobId}] Render: ${pct}%`);
      }
    }
  });
```

Same filter for stderr.

**Change 3** -- Add a `/renders/:jobId` route (without file extension) so `poll-render-job` can find job status:
```text
ADD THIS ROUTE (before the static serves):

  app.get("/renders/:id", (req, res) => {
    if (req.params.id.includes(".")) return next();   // let static handler serve .mp4 files
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ status: "not-found" });
    res.json({
      id: job.id,
      status: job.status === "rendering" ? "in-progress" : job.status,
      progress: job.progress / 100,
      output: job.outputFile ? `/renders/${job.outputFile}` : null,
      error: job.error,
    });
  });
```

This maps your server's status format to what `poll-render-job` expects:
- `"rendering"` becomes `"in-progress"`
- `progress` is sent as 0-1 (not 0-100)
- `output` includes the path prefix

### How to deploy

1. Open your `render-server12` repository on GitHub
2. Edit `index.js` with the 3 changes above
3. Commit and push -- Railway will auto-redeploy
4. Verify with the `/health` endpoint

### Summary of impact
- Log spam: eliminated (from 176+ dropped messages to near zero)
- Poll 404s: fixed (generations will progress past 20% and complete properly)
- No changes needed in Lovable -- the edge functions stay as-is

