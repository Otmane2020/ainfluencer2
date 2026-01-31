
# Fix: Image Generation Not Working

## Problem Identified

The image generation edge function returns a field named `imageData`, but the frontend component `ImageGenerator.tsx` expects a field named `imageUrl`. This naming mismatch causes the condition `if (data?.imageUrl)` to fail, throwing "No image URL received" even though the image was generated successfully.

### Evidence

**Edge Function Response (line 731):**
```typescript
return new Response(
  JSON.stringify({
    imageData: finalImageData,  // <-- Returns "imageData"
    ...
  }),
  ...
);
```

**Frontend Check (line 306):**
```typescript
if (data?.imageUrl) {  // <-- Expects "imageUrl"
  const newImage = {
    url: data.imageUrl,
    ...
  };
}
```

## Solution

Update the edge function `generate-image/index.ts` to return `imageUrl` instead of `imageData` to match the frontend expectation. This is the safer fix because:

1. Multiple frontend components already use `data.imageUrl` (VideoGenerator, AvatarManager, AIContentGenerator, ImageGenerator)
2. Changing the edge function response affects only one place
3. No need to update multiple frontend files

## Changes Required

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` (line 731) | Rename `imageData` to `imageUrl` in the JSON response |

### Code Change

```typescript
// Before (line 731)
imageData: finalImageData,

// After
imageUrl: finalImageData,
```

## Expected Result

After this fix:
- The frontend will correctly receive `data.imageUrl`
- Images will display properly after generation
- The toast "Image generated!" will show with the actual image

## Technical Details

The edge function is actually working correctly - when tested directly via curl, it returns a valid base64-encoded image in the `imageData` field. The issue is purely a naming mismatch between backend and frontend.
