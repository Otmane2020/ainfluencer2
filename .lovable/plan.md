

# Fix: "Hello Demo" / Broken Video Rendering

## Problem

The URL-to-Video pipeline generates videos that all look generic because:

1. The Railway FFmpeg worker **ignores** the `titleText` parameter sent by the edge function — it only processes `imageUrl`, `audioUrl`, and `duration`
2. The AI script prompt sometimes produces metadata labels ("Angle: BENEFIT", "Engagement: HIGH") mixed into the script instead of clean narration
3. No text overlay is rendered on the final video — it's just a zooming image with audio

## Solution

### 1. Update Railway Worker (`railway-video-service/index.js`)

- Accept `titleText` and `width`/`height` params in the `/renders` endpoint
- Add an FFmpeg `drawtext` filter to burn a short title (first line of the script or page title) onto the video with a semi-transparent background bar
- Use the provided `width`/`height` or default to `720x1280`

```text
FFmpeg filter chain:
  zoompan (Ken Burns) -> drawtext (title at top with background box)
```

### 2. Fix the AI Script Prompt (`supabase/functions/url-to-video-script/index.ts`)

- Strengthen the system prompt to explicitly forbid metadata labels like "Angle:", "Engagement:", "SCRIPT:", "Hook:", etc.
- Add a post-processing step to strip any remaining metadata lines from the generated script before returning it

### 3. Pass title text properly from `render-video` edge function

- The `render-video` function already sends `titleText` — no change needed there
- The Railway worker just needs to USE it (fix in step 1)

### 4. Sanitize script in `UrlToVideoGenerator.tsx`

- Before sending `props.text` to render-video, strip any lines starting with metadata labels ("Angle:", "Hook:", "SCRIPT:", etc.)
- Use the `pageTitle` as the video overlay text instead of the script body (the script is for voiceover audio, not for on-screen display)

## Technical Details

### Railway Worker FFmpeg Filter Update

Add `drawtext` after `zoompan`:

```text
zoompan=...,drawtext=text='Title Here':fontsize=36:fontcolor=white:
  box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=60
```

### Script Sanitization (post-processing)

```typescript
// Strip metadata lines from AI output
const cleanScript = script
  .split('\n')
  .filter(line => !/^(Angle|Engagement|Hook|SCRIPT|Scene|CTA)\s*:/i.test(line.trim()))
  .join('\n')
  .trim();
```

### Video text prop fix

In `UrlToVideoGenerator.tsx`, send `pageTitle` as the overlay text instead of `script.slice(0,120)`:

```typescript
props: {
  text: pageTitle || "Your Brand",  // Clean title for overlay
  duration: 10,
  image: screenshot || undefined,
}
```

## Files to Modify

| File | Change |
|------|--------|
| `railway-video-service/index.js` | Accept and use `titleText` in FFmpeg drawtext filter |
| `supabase/functions/url-to-video-script/index.ts` | Stricter prompt + post-process to strip metadata labels |
| `src/components/UrlToVideoGenerator.tsx` | Send `pageTitle` as overlay text, not raw script |

