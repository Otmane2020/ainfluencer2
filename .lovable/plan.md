

# Plan: Enable All Video Models (Kling, Veo, MiniMax, etc.)

## Current Problem

The frontend correctly sends the model parameter:
```typescript
// VideoGenerator.tsx line 514
model: getInternalModel()?.id || "sora-2"  // Sends "kling-v2-master", "veo-3.1", etc.
```

But the edge function **ignores it** and always uses `sora-2`:
```typescript
// generate-video-sora/index.ts line 102
formData.append("model", "sora-2");  // Always hardcoded!
```

## All Available Models (Not Working)

| Model ID | Provider | API Name | Durations | Status |
|----------|----------|----------|-----------|--------|
| sora-2 | OpenAI | sora-2 | 4, 8, 12s | Working |
| sora-2-pro | OpenAI | sora-2 | 4, 8, 12s | Working |
| kling-v2-master | Kuaishou | kling-video | 5, 10s | NOT WORKING |
| minimax-hailuo | MiniMax | minimax-video-01 | 4, 6s | NOT WORKING |
| veo-3.1 | Google | veo-2 | 5, 10s | NOT WORKING |
| veo-3.1-pro | Google | veo-2 | 10, 20, 30s | NOT WORKING |

---

## Solution

### Step 1: Add Model Configuration Map

Add a configuration object that maps internal model IDs to CometAPI model names with their constraints:

```typescript
interface ModelConfig {
  apiModel: string;
  durations: number[];
  maxSize: { portrait: string; landscape: string };
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "sora-2": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "sora-2-pro": {
    apiModel: "sora-2",
    durations: [4, 8, 12],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "kling-v2-master": {
    apiModel: "kling-video",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "minimax-hailuo": {
    apiModel: "minimax-video-01",
    durations: [4, 6],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-3.1": {
    apiModel: "veo-2",
    durations: [5, 10],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
  "veo-3.1-pro": {
    apiModel: "veo-2",
    durations: [10, 20, 30],
    maxSize: { portrait: "720x1280", landscape: "1280x720" },
  },
};
```

### Step 2: Update VideoRequest Interface

```typescript
interface VideoRequest {
  prompt: string;
  avatarUrl?: string;
  duration?: number;
  size?: string;
  quality?: "720p" | "1080p" | "4k";
  orientation?: "portrait" | "landscape";
  startingFrameUrl?: string;
  model?: string;  // NEW: Accept model from frontend
}
```

### Step 3: Use Dynamic Model in API Call

```typescript
// Parse model from request body
const { 
  prompt, 
  model: requestedModel = "sora-2",  // NEW
  // ... other params
}: VideoRequest = await req.json();

// Get model configuration (fallback to sora-2)
const modelConfig = MODEL_CONFIGS[requestedModel] || MODEL_CONFIGS["sora-2"];
const apiModel = modelConfig.apiModel;

// Validate duration for this specific model
const validDurations = modelConfig.durations;
const duration = validDurations.includes(requestedDuration) 
  ? requestedDuration 
  : validDurations.reduce((prev, curr) => 
      Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev
    );

// Use model's max size
const size = legacySize || modelConfig.maxSize[orientation];

// Use dynamic model instead of hardcoded "sora-2"
formData.append("model", apiModel);  // Now uses correct API model

console.log("Model routing:", requestedModel, "->", apiModel);
```

---

## Technical Details

### CometAPI Model Names
The CometAPI uses these model identifiers:
- `sora-2` - OpenAI Sora 2
- `kling-video` - Kuaishou Kling V2
- `minimax-video-01` - MiniMax Hailuo
- `veo-2` - Google Veo

### Duration Constraints Per Model
Each model has specific supported durations - the edge function will automatically clamp to the nearest valid value.

### Resolution Cap
All models currently support max 720p via CometAPI:
- Portrait: `720x1280`
- Landscape: `1280x720`

---

## Files to Modify

### `supabase/functions/generate-video-sora/index.ts`
1. Add `MODEL_CONFIGS` object with per-model settings
2. Add `model` field to `VideoRequest` interface
3. Parse `model` from request body
4. Look up model configuration
5. Use dynamic `apiModel` in formData (line 102)
6. Apply model-specific duration validation
7. Add logging for model routing

---

## Expected Results

After implementation:
1. **AI Reel** will use Kling or MiniMax (faster, cheaper)
2. **AI Reel Pro** will use Sora-2 (current behavior)
3. **AI Cinema** will use Veo (longer durations: 10-30s)
4. All video products will work with correct models
5. Duration validation adapts to each model's constraints

