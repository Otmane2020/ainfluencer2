

## Issues Found

### 1. History and Post History not sorted correctly
Both pages already sort by `created_at DESC`, but the Post History query uses `created_at` (when the post record was created) instead of `published_at` (when it was actually published). This can cause posts to appear out of order. The main History page (`HistoryPage.tsx`) is correctly sorted at line 359.

### 2. LovelyAnswers Facebook publishing silently fails
**Root cause identified**: The LovelyAnswers post (`e60778de`) has `media_url` stored as **base64 data** (`data:image/png;base64,...`), but the `publishToFacebook` function sends this raw base64 string as the `url` parameter to Facebook's Graph API. Facebook requires a **publicly accessible URL**, so it rejects the request. The post gets marked as `published` despite the Facebook upload failing because the cron does not properly track per-platform success.

The `publishToFacebook` function (line 598-648) does NOT handle base64 media -- it just passes `post.media_url` directly to Facebook. The fix is to detect base64 and upload to storage first, converting it to a public URL before sending to Facebook (and Instagram).

---

## Plan

### Step 1: Fix sorting in PostHistoryPage
- Change the query `ORDER BY` from `created_at DESC` to `published_at DESC NULLS LAST` so the most recently published posts appear first.

### Step 2: Fix base64 media detection in publishing flow
In `supabase/functions/run-campaigns-cron/index.ts`, add a base64-to-storage conversion step **before** publishing to any platform (around line 1356, before the platform loop):
- If `post.media_url` starts with `data:`, call the existing `uploadBase64ToStorage()` function to convert it to a public URL.
- Update both the in-memory `post.media_url` and the database record.
- This ensures Facebook, Instagram, and all other platforms receive a publicly accessible URL.

### Step 3: Track per-platform success and set external_post_id for Facebook
The `publishToFacebook` function (line 598) currently does not return the Facebook post ID. Update it to:
- Parse the response JSON and extract the `id` or `post_id` field.
- Return it in the result so the cron can store it in `external_post_id`.

### Step 4: Deploy and test
- Deploy the updated `run-campaigns-cron` edge function.
- Verify the fix by checking upcoming LovelyAnswers posts process correctly.

---

## Technical Details

### Files to modify:
1. **`src/pages/PostHistoryPage.tsx`** -- Change sort order from `created_at` to `published_at DESC NULLS LAST`
2. **`supabase/functions/run-campaigns-cron/index.ts`** -- Add base64 detection before publishing loop; update `publishToFacebook` to return post ID

### Key code changes:

**PostHistoryPage.tsx (line 96):**
Change `.order("created_at", { ascending: false })` to `.order("published_at", { ascending: false })`

**run-campaigns-cron/index.ts (~line 1356):**
Add before the platform publishing loop:
```typescript
// Convert base64 media to public URL before publishing
if (post.media_url?.startsWith("data:")) {
  console.log(`[cron] Converting base64 media to storage URL...`);
  const publicUrl = await uploadBase64ToStorage(post.media_url, supabase);
  if (publicUrl) {
    await supabase.from("scheduled_posts").update({ media_url: publicUrl }).eq("id", post.id);
    post.media_url = publicUrl;
    console.log(`[cron] Base64 converted to: ${publicUrl.slice(0, 60)}...`);
  }
}
```

**publishToFacebook function (~line 640):**
Extract and return Facebook post ID from the response.

