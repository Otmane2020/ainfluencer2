

# Plan: Fix Video Generation Edge Function Deployment

## Problem Summary
The `generate-video-sora` edge function is not accessible (404 error) even though it exists in the codebase and config.toml. The deployment appears to succeed but the function isn't actually available.

## Root Cause
The function uses an older Deno standard library version (`0.168.0`) while other working functions use `0.190.0`. This version mismatch may cause silent deployment failures.

## Implementation Steps

### Step 1: Update Deno Import Version
Update the `serve` import in `generate-video-sora/index.ts` to match other working functions:

```typescript
// FROM:
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// TO:
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
```

### Step 2: Fix Frontend Error Handling
The `VideoGenerator.tsx` has a duplicate `setIsGenerating(true)` call and missing error handling when the video generation API returns an error:

1. Remove the duplicate `setIsGenerating(true)` at line 584 (already set in `generateContent()` at line 527)
2. Add proper error notification when the video API call fails

### Step 3: Add API Response Error Handling
When the `generate-video-sora` endpoint returns a non-200 response, the frontend should:
- Show a clear error message to the user
- Reset the `isGenerating` state
- Close the progress modal

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-video-sora/index.ts` | Update Deno import from `0.168.0` to `0.190.0` |
| `src/components/VideoGenerator.tsx` | Remove duplicate `setIsGenerating(true)`, improve error handling |

## Technical Details

The updated VideoGenerator error handling will:
```typescript
// In the video task creation try/catch (lines 689-692)
} catch (error) {
  console.error("Video task creation error:", error);
  toast({
    title: "Video generation failed",
    description: error instanceof Error ? error.message : "Unable to create video task",
    variant: "destructive",
  });
  return { ...segment, status: "error" as const };
}
```

## Expected Outcome
After these changes:
- The edge function will deploy correctly
- Video generation will work as expected
- Users will see clear error messages if something fails

