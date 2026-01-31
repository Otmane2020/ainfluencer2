
# Video Generation Fix Plan

## Root Cause Analysis

Based on my investigation, I identified **TWO critical issues** causing video generation to fail:

### Issue 1: Edge Function Not Deployed
The `generate-video-sora` edge function returns 404, meaning it's not actually running in production. Despite showing "Successfully deployed", the function is not accessible. This explains why there are no logs and all generations fail.

### Issue 2: Wrong Model Names in CometAPI
The CometAPI documentation explicitly states the valid model names:

| Documentation Says | Our Code Uses | Fix |
|-------------------|---------------|-----|
| `kling-v1-5` (hyphen) | `kling-v1.5` (dot) | Change to `kling-v1-5` |
| `kling-v2-master` | `kling-v1.5` | Change to `kling-v2-master` |

CometAPI endpoint confirmed: `https://api.cometapi.com/kling/v1/videos/text2video`
Valid models: `kling-v1`, `kling-v1-5`, `kling-v1-6`, `kling-v2-master`

---

## Solution

### Step 1: Fix Model Names in Edge Function

Update `COMETAPI_MODELS` in `generate-video-sora/index.ts`:

```text
Before (WRONG):
model_name: "kling-v1.5"

After (CORRECT - from CometAPI docs):
model_name: "kling-v1-5"
```

### Step 2: Verify and Redeploy

1. Fix all model name references
2. Deploy the updated function
3. Test with curl to verify it works

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-video-sora/index.ts` | Fix `kling-v1.5` to `kling-v1-5` in all 3 Kling model configs |

---

## Technical Details

### Current Code (Lines 47-84)
```typescript
// WRONG - Using dots instead of hyphens
"kling-v2.5-turbo": {
  model: "kling-v1.5",  // <-- WRONG
  requestBody: (prompt, duration, aspectRatio) => ({
    model_name: "kling-v1.5",  // <-- WRONG
    // ...
  }),
},
```

### Fixed Code
```typescript
// CORRECT - Using hyphens as per CometAPI docs
"kling-v2.5-turbo": {
  model: "kling-v1-5",  // <-- FIXED
  requestBody: (prompt, duration, aspectRatio) => ({
    model_name: "kling-v1-5",  // <-- FIXED
    // ...
  }),
},
```

---

## Expected Outcome

After these fixes:
1. Edge function will deploy and respond (no more 404)
2. CometAPI will accept the correct model names (`kling-v1-5`)
3. Video generation will start successfully
4. Progress tracking will work with proper task IDs
