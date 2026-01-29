
# Fix Manual Reel Generation

## Problem Identified

The manual reel generation is failing because:

1. **Wrong function name on line 519**: The code calls `generate-reel` (which doesn't exist) instead of `generate-reel-video`
2. **Config mismatch**: The config.toml references `generate-reel` but the actual function folder is `generate-reel-video`
3. **No generate-reel folder exists**: The directory `supabase/functions/generate-reel` is empty/non-existent

The edge function `generate-reel-video` works correctly (tested and returns success with imageUrl + musicUrl).

## Solution

### Step 1: Fix the Wrong Function Call in ScheduledPostModal

**File:** `src/components/ScheduledPostModal.tsx`

Change line 519 from:
```typescript
const { data: reelData, error: reelError } = await supabase.functions.invoke("generate-reel", {
```

To:
```typescript
const { data: reelData, error: reelError } = await supabase.functions.invoke("generate-reel-video", {
```

### Step 2: Clean Up the Config

**File:** `supabase/config.toml`

Remove the orphaned entry for the non-existent function:
```toml
[functions.generate-reel]  # <- DELETE THIS
verify_jwt = false
```

## Summary

| What | Change |
|------|--------|
| Line 519 | `"generate-reel"` → `"generate-reel-video"` |
| config.toml | Remove `[functions.generate-reel]` entry |

## Technical Details

The `generate-reel-video` function is already working correctly. The test shows:
```json
{
  "success": true,
  "imageUrl": "https://...supabase.co/storage/v1/object/public/media/reels/reel-...png",
  "musicUrl": "https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3",
  "duration": 10,
  "format": "reel",
  "aspectRatio": "9:16",
  "status": "READY"
}
```

After this fix, both manual generation (Generate button) and auto-generation during publish will work correctly.
