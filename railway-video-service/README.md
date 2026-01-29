# ClipMotion Video Service

FFmpeg-based video rendering service for creating real MP4 reels from image + audio.

## 🚀 Deploy to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Connect this folder or push to a new repo

### Step 2: Configure Environment Variables

In Railway dashboard, add these variables:

| Variable | Value |
|----------|-------|
| `API_SECRET` | Create a secure random string (e.g., `clipmotion-xyz123-secret`) |
| `PORT` | `3000` (Railway sets this automatically) |

### Step 3: Get Your Service URL

After deployment, Railway will provide a URL like:
```
https://clipmotion-video-service.up.railway.app
```

### Step 4: Add URL to Lovable Secrets

In Lovable, add the secret:
- **Name:** `RAILWAY_VIDEO_SERVICE_URL`
- **Value:** Your Railway URL (e.g., `https://clipmotion-video-service.up.railway.app`)

Also add:
- **Name:** `RAILWAY_VIDEO_SERVICE_SECRET`
- **Value:** The same `API_SECRET` you set in Railway

## 📡 API Reference

### Health Check
```
GET /health
```

### Render Video
```
POST /render
Authorization: Bearer YOUR_API_SECRET
Content-Type: application/json

{
  "imageUrl": "https://..../image.png",
  "audioUrl": "https://..../audio.mp3",
  "duration": 10
}
```

Response:
```json
{
  "success": true,
  "jobId": "job-123456",
  "video": {
    "base64": "AAAA...",
    "mimeType": "video/mp4",
    "size": 1234567,
    "duration": 10,
    "resolution": "1080x1920"
  }
}
```

## 💰 Cost

- Railway: ~$5/month for hobby tier
- FFmpeg: Free
- Storage: Uses Supabase (already included)

## 🎬 What it does

1. Downloads image and audio from provided URLs
2. Applies Ken Burns zoom effect to image
3. Overlays audio track
4. Exports as MP4 (1080x1920, 30fps)
5. Returns base64-encoded video

The edge function then uploads this to Supabase Storage.
