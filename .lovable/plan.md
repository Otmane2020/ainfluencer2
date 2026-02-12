

# Fix: Campaign Generation Stuck at 47%

## Root Cause

The `generate-campaign-content` edge function processes images in batches of 5. With CometAPI failing (500 errors) and falling back to OpenRouter, each image takes ~30 seconds. A batch of 5 = ~150 seconds, which exceeds the edge function timeout limit. The function gets killed (`shutdown`) before completing the batch, so the self-reinvocation at the end never fires, breaking the chain permanently.

## Solution

### 1. Reduce Batch Size (BATCH_SIZE: 5 -> 2)

In `supabase/functions/generate-campaign-content/index.ts`, reduce `BATCH_SIZE` from 5 to 2. This ensures each invocation completes well within the timeout (~60s for 2 images).

### 2. Use EdgeRuntime.waitUntil for Self-Reinvocation

Move the self-reinvocation call into `EdgeRuntime.waitUntil()` so it fires even if the function is shutting down. This prevents the chain from breaking.

### 3. Add Error Resilience - Skip Failed Posts

When image generation fails for a post, still count it toward the batch to prevent infinite retry loops. Insert the post with `media_url: null` and `status: "error"` so it can be retried later without blocking the chain.

### 4. Add a "Resume" Button in Progress Modal

When the progress modal detects no new posts for 30+ seconds, show a "Resume Generation" button that re-triggers the edge function for the same campaign. This gives users a manual recovery path.

### 5. Re-trigger the Current Stuck Campaign

After deploying the fix, manually re-invoke the edge function for campaign `fa8e8c65-1ec0-47f0-8cdc-0176b1fbdd00` to resume generating the remaining 22 posts.

## Files to Modify

- `supabase/functions/generate-campaign-content/index.ts` -- reduce batch size, add waitUntil, improve error handling
- `src/components/campaigns/CampaignWizardModal.tsx` -- add stall detection and resume button in polling logic
- `src/components/campaigns/CampaignProgressModal.tsx` -- add optional "Resume" action button

## Technical Details

```text
Current flow (broken):
  Batch 1 (5 posts) -> OK -> self-reinvoke
  Batch 2 (5 posts) -> TIMEOUT at post 3 -> shutdown -> chain DEAD

Fixed flow:
  Batch 1 (2 posts) -> OK -> waitUntil(self-reinvoke)
  Batch 2 (2 posts) -> OK -> waitUntil(self-reinvoke)
  ... continues until target reached
```

The polling in the wizard already works correctly -- it just needs the backend to keep generating. The stall detection adds a safety net for edge cases.

