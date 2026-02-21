# ClipMotion Video Service (Remotion Engine)

React-based video rendering service powered by **Remotion** for creating dynamic MP4 reels.

## Architecture

```
Express Server (index.js)
  ├── Startup: bundle() React compositions via @remotion/bundler
  ├── POST /renders: accept job → renderMedia() → webhook callback
  └── GET /renders/:jobId: poll job status
```

## Compositions

| ID | Resolution | Use Case |
|----|-----------|----------|
| `ClipMotionVideo` | 1280×720 (landscape) | Standard marketing videos |
| `ClipMotionVertical` | 720×1280 (portrait) | Reels / TikTok / Stories |

### Features
- **Ken Burns** zoom effect via Remotion `interpolate()`
- **Title overlay** with spring animation + fade out
- **Cinematic vignette** overlay
- **Audio sync** via Remotion `<Audio>` component
- **Dynamic duration** from inputProps

## 🚀 Deploy to Railway

### Requirements
- Railway **Pro Plan** (8GB+ RAM recommended)
- Docker builder (not Nixpacks) for Chromium support

### Environment Variables

| Variable | Value |
|----------|-------|
| `API_SECRET` | Secure random string |
| `PORT` | `3000` (auto-set by Railway) |

### Railway Settings
- **Builder:** Dockerfile
- **Root Directory:** `/` (if repo root) or path to this folder
- **Health Check:** `/health`
- **Start Command:** `node index.js` (auto from Dockerfile)

### After Deployment

Add to Lovable Cloud secrets:
- `RENDER_WORKER_URL` → Railway URL (e.g., `https://clipmotion-video.up.railway.app`)
- `RENDER_WORKER_SECRET` → Same as `API_SECRET`

## API

### Health Check
```
GET /health
→ { status: "ok", engine: "remotion", bundled: true, jobs: 0 }
```

### Render Video
```
POST /renders
Authorization: Bearer YOUR_API_SECRET
Content-Type: application/json

{
  "imageUrl": "https://.../image.png",
  "audioUrl": "https://.../audio.mp3",
  "titleText": "My Brand",
  "duration": 10,
  "width": 1280,
  "height": 720,
  "webhookUrl": "https://.../render-callback",
  "generationId": "uuid"
}

→ 202 { jobId: "job-...", status: "queued" }
```

### Poll Status
```
GET /renders/:jobId
→ { id, status, progress, output, error }
```

## 💰 Cost
- Railway Pro: ~$20/month (8GB RAM)
- Remotion: Free for self-hosted
- Chromium + FFmpeg: Included in Docker image
