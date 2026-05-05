## Problem

The edge function `generate-product-shots` fails with `Maximum call stack size exceeded` from the gemini-direct provider. Combined with the other providers being out of credits (402), every shot type fails and the function returns 500 "Failed to generate any images".

Root cause: in `bytesToBase64()`, the line `String.fromCharCode.apply(null, bytes.subarray(...))` still spreads up to 32KB of bytes as function arguments, which Deno's runtime rejects with a stack overflow on larger uploads.

## Fix

Replace the chunked `apply` with a simple per-byte loop inside 8KB windows in `supabase/functions/generate-product-shots/index.ts` (lines 73-81):

```ts
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, bytes.length);
    for (let j = i; j < end; j++) binary += String.fromCharCode(bytes[j]);
  }
  return btoa(binary);
}
```

This eliminates the stack overflow so the gemini-direct fallback works even when Lovable AI / OpenRouter return 402.

## Note on credits

The logs also show `lovable-ai` and `openrouter` returning **402 — out of credits**. Once the base64 bug is fixed, gemini-direct will succeed (GEMINI_API_KEY is configured). To restore the primary providers, top up Lovable AI workspace credits.
