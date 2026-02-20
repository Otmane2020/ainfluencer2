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
  res.json({ status: "ok", service: "clipmotion-video-service" });
});

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

  console.log(`[${jobId}] Starting async render job`);
  console.log(`[${jobId}] Image: ${imageUrl?.slice(0, 80)}...`);
  console.log(`[${jobId}] Audio: ${audioUrl?.slice(0, 80)}...`);
  console.log(`[${jobId}] Duration: ${duration}s`);

  try {
    await fs.mkdir(workDir, { recursive: true });

    const imagePath = path.join(workDir, "input.png");
    const audioPath = path.join(workDir, "audio.mp3");
    const outputPath = path.join(workDir, `output.${outputFormat}`);

    console.log(`[${jobId}] Downloading image...`);
    await downloadFile(imageUrl, imagePath);

    console.log(`[${jobId}] Downloading audio...`);
    await downloadFile(audioUrl, audioPath);

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
      "-t", String(duration),
      "-pix_fmt", "yuv420p",
      "-vf", `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+${zoomSpeed},1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${frameRate}`,
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      "-r", String(frameRate),
      outputPath,
    ].join(" ");

    console.log(`[${jobId}] Running FFmpeg...`);

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

    const videoBuffer = await fs.readFile(outputPath);
    const videoBase64 = videoBuffer.toString("base64");

    console.log(`[${jobId}] Video generated: ${videoBuffer.length} bytes`);

    // Cleanup
    await fs.rm(workDir, { recursive: true, force: true });

    // Notify webhook
    await callWebhook(webhookUrl, {
      jobId,
      generationId,
      success: true,
      video: {
        base64: videoBase64,
        mimeType: "video/mp4",
        size: videoBuffer.length,
        duration,
        resolution: "1080x1920",
      },
    });
  } catch (error) {
    console.error(`[${jobId}] Render error:`, error);

    // Cleanup on error
    try { await fs.rm(workDir, { recursive: true, force: true }); } catch {}

    // Notify webhook of failure
    await callWebhook(webhookUrl, {
      jobId,
      generationId,
      success: false,
      error: error.message,
    });
  }
}

// Main render endpoint — async fire-and-forget
app.post("/render", authMiddleware, async (req, res) => {
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

  // Respond immediately (202 Accepted) and run FFmpeg in background
  res.status(202).json({ jobId, generationId, status: "started" });

  // Fire and forget — do NOT await
  runRenderJob({ jobId, imageUrl, audioUrl, duration, outputFormat, webhookUrl, generationId }).catch(
    (err) => console.error(`[${jobId}] Unhandled render error:`, err)
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`🎬 ClipMotion Video Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Render: POST http://localhost:${PORT}/render`);
});
