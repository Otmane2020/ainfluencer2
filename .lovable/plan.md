

## Fix: Lazy Media Generation for Campaign Posts

### Problem
When a campaign is created, the system immediately generates all 30 posts **with images** upfront (in batches of 2, self-reinvoking until all 30 are done). This is:
- Expensive (generates 30 images at once, consuming credits)
- Slow (the chain of self-reinvocations takes a long time)
- Wasteful (images are generated weeks before they're needed)

### New Behavior
1. **At campaign creation**: Plan all 30 post slots (schedule dates, AI prompts, captions) but **skip image generation**. Posts are saved with `media_url = null` and `status = "scheduled"`.
2. **At publish time (cron job)**: When a post is due, the cron job generates the image/media **just before publishing**. This is the "just-in-time" approach.

### Changes

**File 1: `supabase/functions/generate-campaign-content/index.ts`**
- Remove the call to `generateAndUploadImage()` inside `generateSinglePost()`
- Posts are created with `media_url: null` (text content + AI prompt only)
- Remove the image generation helper functions (or keep them for reuse by cron)
- This makes campaign creation **much faster** (AI text only, no image gen)
- The self-reinvoke chain still works but completes in seconds instead of minutes

**File 2: `supabase/functions/run-campaigns-cron/index.ts`**
- Before publishing a post that has `media_url = null`, generate the image using the post's `ai_prompt`
- Reuse the same image generation logic (CometAPI / KIE / Nano Banana fallback chain)
- Update the post's `media_url` in the database before publishing
- If image generation fails, mark the post as `error` and skip publishing

### Technical Details

In `generate-campaign-content/index.ts`:
```text
// BEFORE: generates image immediately
let mediaUrl = null;
if (!isVideo) {
  mediaUrl = await generateAndUploadImage(parsed.aiPrompt, effectiveFormat, supabase);
}

// AFTER: skip image, just save the prompt
let mediaUrl = null;
// Image will be generated just-in-time by the cron job
```

In `run-campaigns-cron/index.ts` (before publishing):
```text
// If post has no media yet, generate it now (just-in-time)
if (!post.media_url && post.content_type === "image") {
  const format = post.format || "reel";
  const mediaUrl = await generateAndUploadImage(post.ai_prompt, format, supabase);
  if (mediaUrl) {
    await supabase.from("scheduled_posts")
      .update({ media_url: mediaUrl })
      .eq("id", post.id);
    post.media_url = mediaUrl;
  } else {
    // Skip this post, mark as error
    continue;
  }
}
```

### Benefits
- Campaign creation becomes near-instant (text-only AI calls)
- Credits are spent only when posts are actually due
- Calendar still shows all 30 planned posts with their captions
- Images are fresh and generated right before publishing

### Files Modified
1. `supabase/functions/generate-campaign-content/index.ts` -- remove image generation at creation time
2. `supabase/functions/run-campaigns-cron/index.ts` -- add just-in-time image generation before publishing

