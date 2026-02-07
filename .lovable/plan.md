

# Fix Image Generation -- Multiple Provider Failures

## Diagnosis

After investigating the edge function logs, I found **three distinct issues** causing image generation to fail for every model:

### Issue 1: OpenAI billing limit reached (openai-4o-image)
The OpenAI API key has hit its billing hard limit. The error is:
```
"Billing hard limit has been reached."
```
This is an account-level issue -- your OpenAI account needs more funds or the billing limit needs to be raised on https://platform.openai.com.

### Issue 2: KIE Flux Kontext timeout (flux-kontext-pro)
Tasks are created successfully but the edge function times out during the polling phase. No status check logs appear after task creation, suggesting the function hits the Supabase edge function timeout limit (60s) while waiting.

### Issue 3: No automatic fallback
When one provider fails, there's no retry with an alternative model. The user gets a generic error instead of the system trying another model.

## Fix Plan

### Step 1: Add automatic model fallback in generate-image

When a model fails, automatically retry with a reliable fallback model (Nano Banana via Lovable AI) instead of returning an error. This ensures users always get an image.

**File**: `supabase/functions/generate-image/index.ts`

- After the primary model fails, check if it was NOT already a Lovable model
- If so, retry with `google/gemini-2.5-flash-image` (Nano Banana) which is reliable and free
- Log the fallback attempt for monitoring
- Only refund credits if BOTH primary and fallback fail

### Step 2: Better OpenAI error handling

Instead of returning a generic "OpenAI error: 400", detect the billing limit error specifically and trigger the fallback immediately.

**File**: `supabase/functions/generate-image/index.ts` (generateWithOpenAI function)

- Parse the OpenAI error response JSON to detect `billing_hard_limit_reached`
- Return a specific error code that the main handler can use to trigger fallback

### Step 3: Reduce Flux Kontext polling timeout

The current 90-second timeout exceeds Supabase edge function limits. Reduce to a safer value and ensure earlier fallback.

**File**: `supabase/functions/generate-image/index.ts`

- Reduce `maxAttempts` from 90 to 30 (30 seconds max)
- If Flux Kontext times out, trigger fallback to Lovable

### Step 4: Ensure prompt truncation is applied before KIE API call

The prompt is truncated at line 811 (2950 chars), but the log shows 3313 chars. The truncation IS applied, but we need to ensure the truncated version is what gets sent to all providers.

**File**: `supabase/functions/generate-image/index.ts`

- Add a log line after truncation to confirm the final prompt length
- Verify the `finalPrompt` variable is the one passed to `generateImage()`

### Summary of changes

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Add automatic fallback to Nano Banana when primary model fails. Better OpenAI error detection. Reduce polling timeout. Add truncation confirmation log. |

### What you need to do separately

- **OpenAI billing**: If you want the `openai-4o-image` model to work again, you need to add funds or raise the billing limit on your OpenAI account at https://platform.openai.com/settings/organization/billing

