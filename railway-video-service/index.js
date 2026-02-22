import express from "express";
import cors from "cors";
import { promises as fs } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || "clipmotion-secret";

const RENDERS_DIR = path.resolve("renders");
fs.mkdir(RENDERS_DIR, { recursive: true }).catch(() => {});

const jobs = new Map();
let bundleLocation = null;

// ── Auth middleware ──
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// ── Bundle Remotion compositions at startup ──
async function initRemotionBundle() {
  console.log("[remotion] Bundling compositions...");
  const { bundle } = await import("@remotion/bundler");
  const entryPoint = path.resolve(__dirname, "src/index.ts");
  bundleLocation = await bundle({
    entryPoint,
    onProgress: (progress) => {
      if (progress % 25 === 0) console.log(`[remotion] Bundle: ${progress}%`);
    },
  });
  console.log(`[remotion] Bundle ready: ${bundleLocation}`);
}

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "clipmotion-remotion-service",
    engine: "remotion",
    bundled: !!bundleLocation,
    jobs: jobs.size,
  });
});

// ── Serve rendered files (use /output to avoid conflict with POST /renders) ──
app.use("/output", express.static(RENDERS_DIR));

// ── Download helper ──
async function downloadFile(url, destPath) {
  const { createWriteStream, unlink } = await import("fs");
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = createWriteStream(destPath);
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(destPath); });
    }).on("error", (err) => {
      unlink(destPath, () => {});
      reject(err);
    });
  });
}

// ── Webhook callback ──
async function callWebhook(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    const url = new URL(webhookUrl);
    const body = JSON.stringify(payload);
    const protocol = webhookUrl.startsWith("https") ? https : http;

    await new Promise((resolve, reject) => {
      const req = protocol.request({
        hostname: url.hostname,
        port: url.port || (webhookUrl.startsWith("https") ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      }, (res) => { res.resume(); resolve(); });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    console.log(`[webhook] Notified: ${webhookUrl}`);
  } catch (err) {
    console.error(`[webhook] Failed:`, err.message);
  }
}

// ── Remotion Render Job ──
async function runRenderJob({ jobId, imageUrl, audioUrl, duration, webhookUrl, generationId, titleText, width, height, timeline }) {
  const job = jobs.get(jobId);
  console.log(`[${jobId}] Starting Remotion render`);
  console.log(`[${jobId}] Mode: ${timeline ? "timeline" : "legacy"} | ${width}x${height} | ${duration}s`);

  try {
    if (!bundleLocation) throw new Error("Remotion bundle not ready");
    if (job) job.status = "in-progress";

    const { selectComposition, renderMedia } = await import("@remotion/renderer");

    const fps = 30;
    const durationInFrames = Math.round(duration * fps);

    // Select composition based on aspect ratio
    const isVertical = height > width;
    const isSquare = Math.abs(width - height) < 50;
    const compositionId = isSquare
      ? "ClipMotionSquare"
      : isVertical
        ? "ClipMotionVertical"
        : "ClipMotionVideo";

    // Support both timeline mode and legacy flat mode
    const inputProps = timeline
      ? { timeline, imageUrl: "", audioUrl: "", titleText: "" }
      : { timeline: null, imageUrl, audioUrl, titleText: titleText || "" };

    if (job) job.progress = 0.15;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    composition.durationInFrames = durationInFrames;
    composition.width = width;
    composition.height = height;
    composition.fps = fps;

    if (job) job.progress = 0.25;

    const outputPath = path.join(RENDERS_DIR, `${jobId}.mp4`);
    console.log(`[${jobId}] Rendering ${compositionId}: ${width}x${height}, ${durationInFrames} frames...`);

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      concurrency: 2,
      chromiumOptions: { enableMultiProcessOnLinux: false },
      onProgress: ({ progress }) => {
        if (job) job.progress = 0.25 + progress * 0.6;
        const pct = Math.round(progress * 100);
        if (pct % 25 === 0 && pct > 0) {
          console.log(`[${jobId}] Render: ${pct}%`);
        }
      },
    });

    if (job) job.progress = 0.9;

    const stats = await fs.stat(outputPath);
    const relativeVideoUrl = `/output/${jobId}.mp4`;
    console.log(`[${jobId}] Done: ${stats.size} bytes → ${relativeVideoUrl}`);

    if (job) {
      job.status = "done";
      job.progress = 1;
      job.output = relativeVideoUrl;
    }

    await callWebhook(webhookUrl, {
      jobId, generationId, status: "completed",
      videoUrl: relativeVideoUrl,
      fileSize: stats.size, duration,
      resolution: `${width}x${height}`,
    });
  } catch (error) {
    console.error(`[${jobId}] Render error:`, error);
    if (job) { job.status = "failed"; job.error = error.message; job.progress = 0; }
    await callWebhook(webhookUrl, { jobId, generationId, status: "failed", error: error.message });
  }
}

// ── POST /render or /renders ──
app.post(["/render", "/renders"], authMiddleware, async (req, res) => {
  const {
    imageUrl, audioUrl,
    duration = 10, outputFormat = "mp4",
    webhookUrl, generationId,
    titleText = "", width = 1280, height = 720,
    timeline = null,
  } = req.body;

  // Timeline mode doesn't require imageUrl/audioUrl
  if (!timeline && (!imageUrl || !audioUrl)) {
    return res.status(400).json({ error: "imageUrl and audioUrl are required (or provide timeline)" });
  }

  if (!bundleLocation) {
    return res.status(503).json({ error: "Remotion bundle not ready. Try again in ~30s." });
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  jobs.set(jobId, {
    id: jobId, status: "queued", progress: 0,
    output: null, error: null, createdAt: Date.now(),
  });

  setTimeout(() => {
    const j = jobs.get(jobId);
    if (j && (j.status === "queued" || j.status === "in-progress")) {
      j.status = "failed"; j.error = "timeout (10min)"; j.progress = 0;
      console.warn(`[${jobId}] Timed out`);
    }
  }, 1000 * 60 * 10);

  setTimeout(() => { jobs.delete(jobId); }, 1000 * 60 * 30);

  res.status(202).json({ jobId, generationId, status: "queued" });

  runRenderJob({ jobId, imageUrl, audioUrl, duration, webhookUrl, generationId, titleText, width, height, timeline })
    .catch((err) => console.error(`[${jobId}] Unhandled:`, err));
});

// ── Poll job status ──
app.get("/renders/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  if (jobId.includes(".")) return res.status(404).end();
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ status: "not-found" });
  res.json({ id: job.id, status: job.status, progress: job.progress, output: job.output, error: job.error });
});

// ── Start ──
(async () => {
  try {
    await initRemotionBundle();
  } catch (err) {
    console.error("[remotion] Bundle failed:", err.message);
    console.error("[remotion] Server will start but renders will fail until bundle is ready");
  }

  app.listen(PORT, () => {
    console.log(`🎬 ClipMotion Remotion Service running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Render: POST http://localhost:${PORT}/render`);
  });
})();
