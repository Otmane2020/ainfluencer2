
# Fix: Image Generation + Progress Indicators

## Issues Found

### Root Cause 1: Edge Function Not Deployed
The `generate-campaign-content` edge function is **NOT registered** in `supabase/config.toml`, so it was never deployed. This is why:
- No logs appear for the function
- All images have `media_url: null`
- All posts are stuck with `status: draft`

### Root Cause 2: Progress Detection Logic
The progress indicator logic in `ContentHistoryItem.tsx` is correct, but since the actual generation never happens (function not deployed), the items remain in "generating" state forever with the estimated progress stuck at 95%.

---

## Implementation Plan

### Step 1: Register Edge Function in Config
Add the missing `generate-campaign-content` function to `supabase/config.toml`:

```toml
[functions.generate-campaign-content]
verify_jwt = false
```

### Step 2: Deploy and Test
After adding to config, the function will be deployed automatically. This will:
- Enable actual image generation via Lovable AI
- Upload images to Supabase storage
- Update posts with `media_url` and `status: scheduled`

### Step 3: Add Status Indicator for Stale Items
Enhance `ContentHistoryItem.tsx` to detect items that have been "generating" for too long (>5 minutes) and show a "Failed" or "Retry" state instead of stuck progress.

```typescript
const isStale = elapsed > 300000; // 5 minutes
if (isStale && !item.media_url) {
  // Show "Generation Failed - Retry" button
}
```

### Step 4: Add Manual Regeneration
Add a "Regenerate" button for posts that have `ai_prompt` but no `media_url`, allowing users to manually trigger image generation for failed items.

---

## Files to Edit

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `generate-campaign-content` function registration |
| `src/components/ContentHistoryItem.tsx` | Add stale detection + retry button |
| `supabase/functions/generate-campaign-content/index.ts` | (already exists, just needs deployment) |

---

## Expected Results After Fix

1. Creating a new campaign will actually generate images
2. Posts will show real-time progress while generating
3. Completed images will display in history with thumbnails
4. Stale/failed items will show a "Retry" option
5. Instagram publishing will work (media_url will be populated)
