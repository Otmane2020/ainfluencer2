
# Plan: Fix Video Generation - Redeploy Edge Function

## Root Cause Analysis

The logs clearly show the problem:
```
Requested duration: 20 Validated duration: 12 Quality: 4k Size: 1080x1920
CometAPI error: {"code":"invalid_size","message":"sora-2 size is invalid"}
```

The **deployed code** is still using `1080x1920` even though the **source code** has been fixed to use `720x1280`. This means the edge function was not properly redeployed after the last edit.

---

## Current Source Code (Correct)

```typescript
// Lines 10-16 in generate-video-sora/index.ts
const QUALITY_SIZES: Record<string, { portrait: string; landscape: string }> = {
  "720p": { portrait: "720x1280", landscape: "1280x720" },
  "1080p": { portrait: "720x1280", landscape: "1280x720" },  // Correct
  "4k": { portrait: "720x1280", landscape: "1280x720" },     // Correct
};
```

---

## Solution

### Step 1: Force Redeploy the Edge Function

The `generate-video-sora` function needs to be redeployed to apply the corrected resolution mapping:

| Quality | Old (Broken) | New (Fixed) |
|---------|--------------|-------------|
| 720p | 720x1280 | 720x1280 |
| 1080p | 1080x1920 | 720x1280 |
| 4k | 1080x1920 | 720x1280 |

CometAPI Sora-2 only accepts these specific sizes:
- `480x480`, `720x480`, `1280x720` (landscape)
- `480x720`, `720x1280` (portrait)

### Step 2: Add Validation Logging

Add a log line to confirm the fix is deployed:

```typescript
console.log("Resolution mapping - Quality:", quality, "-> Size:", size, "(max 720p supported)");
```

---

## Technical Details

The edge function code at lines 76-77 calculates the size:
```typescript
const qualityConfig = QUALITY_SIZES[quality] || QUALITY_SIZES["1080p"];
const size = legacySize || qualityConfig[orientation];
```

This is correct in source but the **deployed function** still has the old values. A fresh deploy will resolve this.

---

## Expected Result

After redeployment:
- All quality tiers (720p, 1080p, 4k) will use `720x1280` for portrait videos
- CometAPI will accept the request without "invalid_size" errors
- Video generation will work for all models
