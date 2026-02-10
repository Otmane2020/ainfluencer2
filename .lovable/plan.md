

# Fix: Campaign Creation Timeout Error

## Problem
The `generate-campaign-content` edge function works correctly (logs confirm images are being generated), but it takes 3-5 minutes per batch (10 images x ~20-30s each with CometAPI fallback). The browser's `supabase.functions.invoke()` fetch request times out before the function responds, causing "Failed to send a request to the Edge Function" error.

## Solution: Fire-and-Forget with Polling

Instead of waiting for the edge function to finish, the wizard will:
1. Create the campaign in the database
2. Call the edge function **without waiting** for a response
3. Poll the `scheduled_posts` table to track progress in real-time

## Technical Changes

### 1. Update `CampaignWizardModal.tsx` - handleSubmit
- After creating the campaign record, invoke `generate-campaign-content` but **do not await** the response
- Instead, start a polling interval that checks `scheduled_posts` count for the campaign ID
- Update the progress bar based on actual posts created in the DB
- Mark as complete when target is reached or after a max timeout (5 minutes)

### 2. Update `generate-campaign-content/index.ts`
- Reduce batch size from 10 to 5 images per invocation to reduce per-call duration
- Add a self-re-invocation mechanism: after generating 5 posts, if more remain, the function calls itself again (chain pattern)
- This avoids needing the client to re-call the function

### 3. Progress Polling Logic (in wizard)
```text
1. Create campaign in DB --> immediate
2. Fire edge function (no await) --> immediate
3. Poll every 3s:
   SELECT count(*) FROM scheduled_posts WHERE campaign_id = X
4. Update progress bar: (count / target) * 100
5. Complete when count >= target OR timeout after 5 min
```

## Benefits
- No more timeout errors
- User sees real-time progress as posts appear in DB
- Resilient to network interruptions during generation
- The generation continues server-side even if user closes the modal

