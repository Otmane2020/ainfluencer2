## Goal
Make product-shot generation succeed reliably again and stop the current 500 error on `/product-shots`.

## What I found
The failure is in the backend function `generate-product-shots`, not the page preview itself.

From the logs:
- Primary image provider fails with `402 Not enough credits`
- The fallback provider is reached
- That fallback then fails with `404 model not found`
- The function returns `Failed to generate any images`, which surfaces as a 500 in the UI

So the root cause is an invalid Gemini fallback configuration, plus the function currently escalates total provider failure into a hard 500.

## Plan
1. Fix the Gemini fallback in `supabase/functions/generate-product-shots/index.ts`
   - Replace the invalid direct Gemini model usage with a known working image-generation fallback pattern already used elsewhere in the project
   - Add the proper Gemini request payload for image output
   - Keep the existing centered/contain post-processing so portrait and desktop outputs do not crop the product

2. Improve graceful failure behavior
   - Prevent total provider failure from crashing the experience with an opaque 500
   - Return a structured JSON error when no provider can generate images, so the frontend can handle it cleanly
   - Preserve detailed backend logging for provider-specific failures

3. Update the frontend call site in `src/pages/ProductShotsPage.tsx`
   - Handle the structured backend error without blank-screen behavior
   - Show a clear user-facing error state instead of a generic runtime failure

4. Validate the fix
   - Redeploy the backend function
   - Re-run generation with the same 1–2 shot flow that currently fails
   - Confirm the logs show the corrected fallback path and that the UI no longer throws the runtime error

## Technical details
Files involved:
- `supabase/functions/generate-product-shots/index.ts`
- `src/pages/ProductShotsPage.tsx`

Expected behavior after the fix:
- If the primary provider works, generation behaves as before
- If the primary provider is unavailable, fallback generation is attempted correctly
- If every provider fails, the app shows a controlled error message instead of surfacing a raw 500 runtime failure