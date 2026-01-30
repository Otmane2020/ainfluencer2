

# Fix Plan: Campaign Launch & Social Publishing Issues

## Issues Identified

### Issue 1: "Launch Now" Generates All Month's Photos Instead of Just Today's

**Current Behavior**: When clicking "Launch Now", the cron function fetches ALL posts for the campaign regardless of scheduled date.

**Expected Behavior**: Should only process posts scheduled for the current day (today).

**Root Cause**: In `run-campaigns-cron/index.ts` lines 607-612:
```typescript
if (forceRun && campaignId) {
  postsQuery = postsQuery.eq("campaign_id", campaignId);
  // Missing: date filter for today only
}
```

### Issue 2: Instagram Publishing Intermittently Fails

**Current Behavior**: Some posts show `Partial: IG: Publish failed: Media ID is not available`

**Root Cause**: The Instagram container polling may timeout before the container is ready.

---

## Technical Solution

### Fix 1: Limit "Launch Now" to Today's Posts Only

Update `run-campaigns-cron/index.ts` to filter by today when `forceRun` is true:

```typescript
if (forceRun && campaignId) {
  postsQuery = postsQuery.eq("campaign_id", campaignId);
  
  // Get today's date boundaries in UTC
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  
  // Only process posts scheduled for today
  postsQuery = postsQuery
    .gte("scheduled_for", startOfToday.toISOString())
    .lte("scheduled_for", endOfToday.toISOString());
}
```

### Fix 2: Improve Instagram Container Polling

Increase timeout and add retry logic:

```typescript
// Increase timeout for images (10 → 20 attempts)
const maxWait = isVideo ? 60 : 20;

// Add longer initial wait before first status check
await new Promise(resolve => setTimeout(resolve, 3000));

// If container never finishes, try publishing anyway after max attempts
// Instagram sometimes returns FINISHED status late
```

### Fix 3: Add Fallback for Failed Instagram Posts

If Instagram fails but Facebook succeeds, mark post as `partial` and store which platforms succeeded.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/run-campaigns-cron/index.ts` | Fix date filtering for forceRun, improve Instagram polling |

---

## How the Cron Job Works (Explanation)

The campaign automation flow works like this:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CAMPAIGN CREATION                             │
│                                                                  │
│  1. User creates campaign with settings                         │
│  2. generate-campaign-content creates scheduled_posts           │
│     - status: "scheduled" or "draft"                            │
│     - media_url: NULL (no image/video yet)                      │
│     - ai_prompt: Text prompt for generation                     │
│     - scheduled_for: Date/time for each post                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   HOURLY CRON (run-campaigns-cron)               │
│                   Schedule: 0 * * * * (every hour)               │
│                                                                  │
│  1. Query posts WHERE:                                          │
│     - status IN ('scheduled', 'draft')                          │
│     - scheduled_for <= NOW                                      │
│     - LIMIT 20                                                  │
│                                                                  │
│  2. For each post:                                              │
│     a) Check user subscription (Pro/Business required)          │
│     b) Generate media if missing (image via Gemini/video via    │
│        Nano Banana)                                              │
│     c) Publish to platforms (Facebook then Instagram)           │
│     d) Update post status to 'published'                        │
│                                                                  │
│  3. Update campaign stats                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   "LAUNCH NOW" (Manual Trigger)                  │
│                                                                  │
│  Calls run-campaigns-cron with:                                 │
│  - campaignId: specific campaign to process                     │
│  - forceRun: true                                               │
│                                                                  │
│  BUG: Currently processes ALL posts, not just today's           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Posts Were "Published" but Not on Social Media

From database analysis:
- 12 posts were marked `published` with timestamps
- Some have `error_message: "Partial: IG: Publish failed: Media ID is not available"`
- This means:
  - **Facebook**: Successfully published (no FB error)
  - **Instagram**: Failed because container wasn't ready

The posts show `published` because at least one platform (Facebook) succeeded. The system marks as `published` even with partial success.

---

## Expected Behavior After Fix

1. **"Launch Now"** → Only processes posts scheduled for today (1-3 posts typically)
2. **Instagram** → More reliable publishing with longer container wait times
3. **Error tracking** → Clear error messages for which platform failed

