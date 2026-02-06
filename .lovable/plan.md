

# AI Generation Audit - Full Diagnostic Report

## Issues Found

### 1. CRITICAL: Video Generation Completely Down (Sora + Veo)
Both video providers have hit their billing/quota limits:
- **OpenAI Sora 2**: "Billing hard limit has been reached"
- **Google Veo 3.1**: "You exceeded your current quota"

The fallback chain (Sora 2 -> Sora 2 Pro -> Veo 3.1 Pro -> Veo 3.1) fails entirely -- all 4 models are unavailable.

**Resolution**: The `kie-video` function (Wan 2.6 / Kling 2.6 via KIE API) was added as an alternative, BUT it's not working either (see issue #2).

### 2. CRITICAL: `kie-video` Edge Function Not Deployed (404)
The KIE video function exists in code and in `config.toml`, but returns 404 when called. This means the function failed to deploy silently. The VideoGenerator component already routes to `kie-video` for Wan/Kling models, so all video generation via the new models fails.

**Resolution**: Redeploy the `kie-video` function. May need to check for import/syntax issues preventing deployment.

### 3. MODERATE: CORS Headers Missing on `generate-image`
The `generate-image` function uses incomplete CORS headers:
```text
Current:  "authorization, x-client-info, apikey, content-type"
Required: "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```
The Supabase JS SDK sends these additional headers automatically. The browser's preflight (OPTIONS) request will be rejected, causing CORS errors even though the function itself works fine (confirmed via direct API test - returns 200).

**Resolution**: Update CORS headers in `generate-image/index.ts`.

### 4. INFO: Image Generation Backend Works
Direct API test to `generate-image` returned 200 successfully. The function logic, credit deduction, and model routing are all functional. The only barrier is the CORS header issue preventing browser calls.

### 5. INFO: KIE Image Function Works
The `kie-image` function is deployed and responds (returns 400 for missing params, meaning it's alive). It has correct CORS headers. However, the `generate-image` function already handles KIE models internally, so `kie-image` may be redundant.

---

## Fix Plan

### Step 1: Fix CORS on `generate-image` (Unblocks Image Generation)
Update `supabase/functions/generate-image/index.ts` line 16-18 to include the full set of required CORS headers. This single change will fix image generation from the browser.

### Step 2: Redeploy `kie-video` (Unblocks Video Generation)
Force-deploy the `kie-video` edge function. If deployment fails, investigate and fix any syntax or import issues in the function code.

### Step 3: Reroute Video Generation Fallback to KIE
Since OpenAI Sora and Google Veo are both at their billing/quota limits, update the `generate-video-sora` function to add KIE (Wan 2.6 / Kling 2.6) as a final fallback in the chain. This ensures video generation works even when premium providers are down.

Current fallback chain:
```text
Sora 2 Pro -> Sora 2 -> Veo 3.1 Pro -> Veo 3.1 -> (all fail)
```

Proposed chain:
```text
Sora 2 Pro -> Sora 2 -> Veo 3.1 Pro -> Veo 3.1 -> KIE Wan 2.6 (new)
```

### Step 4: Verify both flows end-to-end
Test image and video generation from the browser to confirm everything works.

---

## Technical Details

### Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `supabase/functions/generate-image/index.ts` | Fix CORS headers (line 16-18) | Unblocks image generation |
| `supabase/functions/generate-video-sora/index.ts` | Add KIE fallback at end of chain | Video generation resilience |
| `supabase/config.toml` | Verify `kie-video` entry (already present) | -- |

### Functions to Deploy
- `generate-image` (CORS fix)
- `kie-video` (force redeploy)
- `generate-video-sora` (KIE fallback)

### No Database Changes Required

