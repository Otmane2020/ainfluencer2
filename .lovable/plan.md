
# Video Generation Fix Plan

## Problem Identified

Based on my investigation, I found **three critical issues** causing video generation failures:

### Issue 1: Quality Parameter Mismatch
The frontend sends `quality: "720p"` (from the Quality Options constant), but the edge function expects quality values like `"standard"`, `"pro"`, or `"cinema"` to select the correct model fallback chain.

**Evidence from code:**
```typescript
// VideoGenerator.tsx line 654
quality: selectedQuality,  // This is "720p"

// generate-video-sora/index.ts line 137-141
const MODEL_FALLBACK_CHAINS: Record<string, string[]> = {
  cinema: ["kling-v2-master", ...],
  pro: ["kling-v2.1-master", ...],
  standard: ["kling-v2.5-turbo", ...],  // "720p" doesn't match!
};
```

### Issue 2: Model ID Not Matching COMETAPI_MODELS Keys
The frontend sends `model: getInternalModel()?.id || "sora-2"`, but the edge function ignores this and only looks at `quality`. When quality is "720p" (unknown), it falls back to `standard` but the model selection still fails.

### Issue 3: Status Check Using Wrong Endpoint
The status check in the edge function uses a legacy generic endpoint:
```typescript
// Line 611 - This doesn't exist/work for Kling models
await fetch(`https://api.cometapi.com/v1/videos/${taskId}`)
```
Each CometAPI model needs its own status endpoint (e.g., `/v1/kling/task/${taskId}` for Kling).

**Database Evidence:**
Recent generations show model `nanobanana-standard` (doesn't exist) with `status: failed` and `error_message: CometAPI unavailable`.

---

## Solution

### 1. Fix Quality Parameter Mapping

Update `VideoGenerator.tsx` to send the correct quality tier based on the selected product:

```typescript
// Map product tier to quality parameter
const qualityTier = selectedProduct.tier; // "standard" | "pro" | "cinema"

body: JSON.stringify({
  // ...
  quality: qualityTier,  // Send tier, not resolution
  // ...
})
```

### 2. Add Model-Specific Status Endpoints

Update the status check in `generate-video-sora/index.ts` to use the correct endpoint for each model type:

```typescript
// Add model-specific status endpoints
const STATUS_ENDPOINTS: Record<string, (taskId: string) => string> = {
  "kling": (id) => `https://api.cometapi.com/v1/kling/task/${id}/status`,
  "minimax": (id) => `https://api.cometapi.com/v1/minimax/query/${id}`,
  "runway": (id) => `https://api.cometapi.com/v1/runway/task/${id}`,
  "bytedance": (id) => `https://api.cometapi.com/v1/video/bytedance/${id}`,
};
```

### 3. Store Model Type with Generation Record

When creating a generation, store which model family was used so the status check knows which endpoint to call:

```typescript
// In generation record
model: usedModel.model,  // e.g., "kling-v2.5-turbo"
model_family: "kling",    // Add this for status routing
```

### 4. Add Robust Error Detection

Improve the fallback logic to detect more error conditions:

```typescript
// Detect various failure modes
if (responseText.includes("not found") || 
    responseText.includes("unavailable") ||
    responseText.includes("error") ||
    response.status === 503) {
  console.log(`[${model.model}] Unavailable, trying next...`);
  continue;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/VideoGenerator.tsx` | Fix quality parameter to send product tier instead of resolution |
| `supabase/functions/generate-video-sora/index.ts` | Add model-specific status endpoints, improve error handling, store model family |

---

## Technical Details

### VideoGenerator.tsx Changes

```typescript
// Line ~650-668: Fix the request body
body: JSON.stringify({
  prompt: buildScenarioPrompt(...) + segment.script,
  avatarUrl,
  duration: segment.duration,
  quality: selectedProduct.tier, // FIX: Use tier instead of "720p"
  format: selectedFormat,
  model: selectedProduct.internalModels[0], // FIX: Use product's model
  videoMode,
  // ... rest
})
```

### Edge Function Changes

1. **Add model family tracking**
2. **Add status endpoint routing by model family**
3. **Improve polling response handling**
4. **Add better logging for debugging**

---

## Expected Outcome

After these fixes:
1. Video generation will use the correct CometAPI endpoints for Kling models
2. Progress tracking will work because status checks use correct endpoints
3. Fallback chain will properly try Kling V2.5 Turbo → MiniMax → Bytedance for standard quality
4. Users will see accurate progress updates (10% → 30% → 60% → 100%)

