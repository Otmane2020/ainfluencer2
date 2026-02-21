# ClipMotion Video Service (Remotion Engine v3)

React-based video rendering service powered by **Remotion** — based on the official `template-prompt-to-video` architecture.

## Architecture

```
Express Server (index.js)
  ├── Startup: bundle() React compositions via @remotion/bundler
  ├── POST /renders: accept job → renderMedia() → webhook callback
  └── GET /renders/:jobId: poll job status

src/
  ├── Root.tsx                    → Remotion entry (3 compositions)
  ├── ClipMotionVideo.tsx         → Main composition (timeline + legacy mode)
  ├── lib/
  │   ├── types.ts                → Zod schemas (Timeline, Scene, Text, Audio)
  │   ├── constants.ts            → FPS, INTRO_DURATION, EXTRA_SCALE
  │   └── utils.ts                → Frame timing, blur calc, simple timeline builder
  └── components/
      ├── SceneBackground.tsx     → Ken Burns zoom + blur/fade transitions
      ├── Subtitle.tsx            → Spring-animated word overlay (stroke + fill)
      ├── Vignette.tsx            → Cinematic vignette
      └── IntroTitle.tsx          → Full-screen title card
```

## Compositions

| ID | Resolution | Use Case |
|----|-----------|----------|
| `ClipMotionVideo` | 1280×720 (landscape) | Marketing videos, ads |
| `ClipMotionVertical` | 720×1280 (portrait) | Reels / TikTok / Stories |
| `ClipMotionSquare` | 1080×1080 (square) | Instagram feed / Facebook |

## Two Rendering Modes

### Legacy Mode (flat props)
```json
{
  "imageUrl": "https://...",
  "audioUrl": "https://...",
  "titleText": "My Brand",
  "duration": 10
}
```

### Timeline Mode (multi-scene, official pattern)
```json
{
  "timeline": {
    "shortTitle": "Brand Story",
    "elements": [
      { "imageUrl": "https://...", "startMs": 0, "endMs": 5000,
        "enterTransition": "blur", "exitTransition": "fade",
        "animations": [{ "type": "scale", "startMs": 0, "endMs": 5000, "from": 1, "to": 1.12 }] },
      { "imageUrl": "https://...", "startMs": 5000, "endMs": 10000 }
    ],
    "text": [
      { "text": "Discover", "startMs": 0, "endMs": 3000, "position": "top" },
      { "text": "Our Brand", "startMs": 3000, "endMs": 6000, "position": "center" }
    ],
    "audio": [
      { "audioUrl": "https://...", "startMs": 0, "endMs": 10000 }
    ]
  },
  "duration": 10,
  "width": 1080,
  "height": 1920
}
```

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
- **Root Directory:** `/` (repo root)
- **Health Check:** `/health`

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
