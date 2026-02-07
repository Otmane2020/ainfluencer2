
# Fix Image Generation -- KIE API Documentation Compliance

## Root Cause Analysis

After thoroughly reading the official KIE API documentation and comparing it with the current code, I found **3 critical bugs** that explain why image generation fails:

### Bug 1: Flux Kontext -- Wrong result field name (CRITICAL)

The documentation clearly states the Flux Kontext status response returns:
```text
data.response.resultImageUrl  -- Generated image URL
data.response.originImageUrl  -- Original (valid 10 min)
```

But our code checks for WRONG fields:
```text
taskData.response?.resultUrls      -- DOES NOT EXIST
taskData.response?.url             -- DOES NOT EXIST
taskData.response?.image_url       -- DOES NOT EXIST
```

This is why Flux Kontext always returns "No image URL in result" even when generation succeeds.

### Bug 2: Old kie-image edge function uses wrong base URL

The old `supabase/functions/kie-image/index.ts` uses:
```text
https://kie.ai/api     (WRONG)
```

The documentation specifies:
```text
https://api.kie.ai/api  (CORRECT)
```

The shared client (`_shared/kie-api-client.ts`) uses the correct URL, but the old standalone function does not.

### Bug 3: All fallbacks exhausted -- no working provider left

The fallback chain currently is:
1. Primary model (OpenAI = billing limit, KIE = wrong URL parsing)
2. Lovable AI gateway = 402 Payment required (credits exhausted)
3. Gemini direct = likely failing because `gemini-2.0-flash-exp` may not support image generation

The Gemini direct fallback uses `gemini-2.0-flash-exp` which is an experimental model that may not be available or support `responseModalities: ["IMAGE"]`. A better fallback would use `gemini-2.0-flash` or `imagen-3.0-generate-002`.

## Fix Plan

### Step 1: Fix Flux Kontext result URL extraction

**File**: `supabase/functions/_shared/kie-api-client.ts`

In the `checkFluxKontextStatus` function, change the URL extraction to use the documented field names:

```text
BEFORE (wrong):
  taskData.response?.resultUrls
  taskData.response?.url
  taskData.response?.image_url

AFTER (correct per documentation):
  taskData.response?.resultImageUrl    -- primary result
  taskData.response?.originImageUrl    -- fallback (valid 10 min)
```

### Step 2: Fix the Gemini direct fallback model

**File**: `supabase/functions/generate-image/index.ts`

Change the Gemini direct API call to use a model that actually supports image generation:
- Use `gemini-2.0-flash` instead of `gemini-2.0-flash-exp`
- Also try `imagen-3.0-generate-002` as an alternative

### Step 3: Fix fallback chain to also try KIE models

**File**: `supabase/functions/generate-image/index.ts`

Update the fallback chain so that when Lovable AI is out of credits:
1. Try primary model (current behavior)
2. If Lovable (Nano Banana) fallback fails with 402
3. Try Gemini direct API with correct model
4. Try KIE `qwen/text-to-image` as last resort (cheapest KIE model at 0.8 credits)

### Step 4: Fix old kie-image edge function base URL

**File**: `supabase/functions/kie-image/index.ts`

Change the base URL from `https://kie.ai/api` to `https://api.kie.ai/api` to match the documentation.

### Summary of changes

| File | Change |
|------|--------|
| `supabase/functions/_shared/kie-api-client.ts` | Fix Flux Kontext to use `response.resultImageUrl` (documented field) |
| `supabase/functions/generate-image/index.ts` | Fix Gemini direct model name, add KIE Qwen as last-resort fallback |
| `supabase/functions/kie-image/index.ts` | Fix base URL from `kie.ai/api` to `api.kie.ai/api` |

### What this fixes

- Flux Kontext Pro/Max will now correctly extract the generated image URL
- Qwen Z-Image, Grok Imagine, and all other KIE Market models will work correctly (Market API parsing was already correct)
- If OpenAI and Lovable AI are both out of credits, the system will fall back to Gemini direct or KIE Qwen instead of failing
- The old kie-image endpoint will hit the correct API server
