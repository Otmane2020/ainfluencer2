import express from "express";
import cors from "cors";
import { exec } from "child_process";
import { promises as fs, createWriteStream, unlink } from "fs";
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

// Renders output directory — persisted for polling fallback
const RENDERS_DIR = path.resolve("renders");
fs.mkdir(RENDERS_DIR, { recursive: true }).catch(() => {});

// In-memory job tracker for polling fallback
const jobs = new Map();

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "clipmotion-video-service", jobs: jobs.size });
});

// Serve rendered files statically (polling fallback)
app.use("/renders", express.static(RENDERS_DIR));

// Download file helper with redirect support
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = createWriteStream(destPath);

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(destPath);
      });
    }).on("error", (err) => {
      unlink(destPath, () => {});
      reject(err);
    });
  });
}

// Call webhook when render is complete
async function callWebhook(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    const url = new URL(webhookUrl);
    const body = JSON.stringify(payload);
    const protocol = webhookUrl.startsWith("https") ? https : http;

    await new Promise((resolve, reject) => {
      const req = protocol.request(
        {
          hostname: url.hostname,
          port: url.port || (webhookUrl.startsWith("https") ? 443 : 80),
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    console.log(`[webhook] Notified: ${webhookUrl}`);
  } catch (err) {
    console.error(`[webhook] Failed to call webhook:`, err.message);
  }
}

// Background render job
async function runRenderJob({ jobId, imageUrl, audioUrl, duration, outputFormat, webhookUrl, generationId }) {
  const workDir = `/tmp/${jobId}`;
  const job = jobs.get(jobId);

  console.log(`[${jobId}] Starting async render job`);
  console.log(`[${jobId}] Image: ${imageUrl?.slice(0, 80)}...`);
  console.log(`[${jobId}] Audio: ${audioUrl?.slice(0, 80)}...`);
  console.log(`[${jobId}] Duration: ${duration}s`);

  try {
    if (job) job.status = "in-progress";
    await fs.mkdir(workDir, { recursive: true });

    const imagePath = path.join(workDir, "input.png");
    const audioPath = path.join(workDir, "audio.mp3");
    const outputPath = path.join(workDir, `output.${outputFormat}`);

    console.log(`[${jobId}] Downloading image...`);
    await downloadFile(imageUrl, imagePath);
    if (job) job.progress = 0.15;

    console.log(`[${jobId}] Downloading audio...`);
    await downloadFile(audioUrl, audioPath);
    if (job) job.progress = 0.25;

    // Ken Burns zoom effect
    const zoomSpeed = 0.0008;
    const frameRate = 30;
    const totalFrames = duration * frameRate;

    const ffmpegCmd = [
      "ffmpeg",
      "-y",
      "-loop", "1",
      "-i", imagePath,
      "-i", audioPath,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-t", String(duration),
      "-pix_fmt", "yuv420p",
      "-vf", `scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+${zoomSpeed},1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=720x1280:fps=${frameRate}`,
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-movflags", "+faststart",
      "-r", String(frameRate),
      outputPath,
    ].join(" ");

    console.log(`[${jobId}] Running FFmpeg...`);
    if (job) job.progress = 0.3;

    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[${jobId}] FFmpeg error:`, stderr);
          reject(new Error(`FFmpeg failed: ${stderr}`));
        } else {
          console.log(`[${jobId}] FFmpeg completed`);
          resolve();
        }
      });
    });

    if (job) job.progress = 0.85;

    // ✅ Save to renders/ directory (relative path — no localhost hack)
    const finalFileName = `${jobId}.${outputFormat}`;
    const finalPath = path.join(RENDERS_DIR, finalFileName);
    await fs.copyFile(outputPath, finalPath);
    const relativeVideoUrl = `/renders/${finalFileName}`;

    const stats = await fs.stat(finalPath);
    console.log(`[${jobId}] Video saved: ${stats.size} bytes → ${relativeVideoUrl}`);

    // Update job tracker for polling fallback
    if (job) {
      job.status = "done";
      job.progress = 1;
      job.output = relativeVideoUrl; // ✅ RELATIVE path only
    }

    // Cleanup temp dir
    await fs.rm(workDir, { recursive: true, force: true });

    // Notify webhook with RELATIVE path (Edge builds absolute URL)
    await callWebhook(webhookUrl, {
      jobId,
      generationId,
      status: "completed",
      videoUrl: relativeVideoUrl, // ✅ /renders/job-xxx.mp4
      fileSize: stats.size,
      duration,
      resolution: "720x1280",
    });
  } catch (error) {
    console.error(`[${jobId}] Render error:`, error);

    if (job) {
      job.status = "failed";
      job.error = error.message;
      job.progress = 0;
    }

    // Cleanup on error
    try { await fs.rm(workDir, { recursive: true, force: true }); } catch {}

    // Notify webhook of failure
    await callWebhook(webhookUrl, {
      jobId,
      generationId,
      status: "failed",
      error: error.message,
    });
  }
}

// ── CREATE JOB (POST /render or /renders) ──
app.post(["/render", "/renders"], authMiddleware, async (req, res) => {
  const {
    imageUrl,
    audioUrl,
    duration = 10,
    outputFormat = "mp4",
    webhookUrl,
    generationId,
  } = req.body;

  if (!imageUrl || !audioUrl) {
    return res.status(400).json({ error: "imageUrl and audioUrl are required" });
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Register in job tracker for polling fallback
  jobs.set(jobId, {
    id: jobId,
    status: "queued",
    progress: 0,
    output: null,
    error: null,
    createdAt: Date.now(),
  });

  // 8-minute safety timeout
  setTimeout(() => {
    const j = jobs.get(jobId);
    if (j && (j.status === "queued" || j.status === "in-progress")) {
      j.status = "failed";
      j.error = "timeout (8min)";
      j.progress = 0;
      console.warn(`[${jobId}] Timed out after 8 minutes`);
    }
  }, 1000 * 60 * 8);

  // Auto-cleanup job from memory after 30min
  setTimeout(() => { jobs.delete(jobId); }, 1000 * 60 * 30);

  // Respond immediately (202 Accepted)
  res.status(202).json({ jobId, generationId, status: "queued" });

  // Fire and forget
  runRenderJob({ jobId, imageUrl, audioUrl, duration, outputFormat, webhookUrl, generationId }).catch(
    (err) => console.error(`[${jobId}] Unhandled render error:`, err)
  );
});

// ── POLL JOB STATUS (GET /renders/:jobId) ──
app.get("/renders/:jobId", (req, res) => {
  const jobId = req.params.jobId;

  // Skip static file requests (e.g. /renders/job-xxx.mp4)
  if (jobId.includes(".")) return res.status(404).end();

  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ status: "not-found" });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    output: job.output, // ✅ relative path: "/renders/job-xxx.mp4"
    error: job.error,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎬 ClipMotion Video Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Render: POST http://localhost:${PORT}/render`);
  console.log(`   Poll:   GET  http://localhost:${PORT}/renders/:jobId`);
});
