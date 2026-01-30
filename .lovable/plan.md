

# Monetization Strategy Overhaul: Subscription + Credit Packs

## Summary

Fundamental change to the business model:
- **Subscription ($19/$49/$99)**: Unlocks app features (projects, campaigns, auto-posting) - No direct generation included
- **Credits/Packs**: Required for ALL media generation (images, videos, reels) - Purchased separately

## Current System Analysis

```text
+------------------+     +-----------------+
|  Subscription    |     |     Credits     |
|  (Starter/Pro/   | --> | (Balance-based) |
|   Business)      |     |  50-1000 packs  |
+------------------+     +-----------------+
        |                        |
        v                        v
  Daily limits              Fallback for
  (30 img, 1-3 vid)        extra usage
```

The current system mixes subscription-based daily limits with credits as a fallback.

## New System Architecture

```text
+----------------------+      +---------------------+
|    SUBSCRIPTION      |      |    CREDIT PACKS     |
|  Access Only ($19+)  |      |  Generation Fuel    |
+----------------------+      +---------------------+
         |                            |
         v                            v
   - Create projects           - ALL generation
   - Create campaigns          - Pay per quality
   - Auto-posting infra        - Buy in bulk
   - No generation included    - Never expire
```

---

## Implementation Plan

### Phase 1: Update Commercial Products Configuration

**File: `src/lib/commercialProducts.ts`**

1. Define 3 quality tiers for generation:
   - **Standard** (NanoBanana / Kling Standard): Cheapest
   - **Pro** (Sora-2 / Flux Pro): Mid-tier  
   - **Cinema** (Sora-2 Pro): Premium

2. Update credit costs per quality:
   - Images: Standard (1 credit), Pro (3 credits), Cinema (5 credits)
   - Videos: Standard (5 credits), Pro (10 credits), Cinema (20 credits)
   - Reels: Standard (3 credits), Pro (8 credits), Cinema (15 credits)

3. Update subscription plans to be "access-only":
   - Remove daily generation limits from plan definitions
   - Focus on: projects, campaigns, auto-posting capability

4. Simplify credit packs (keep existing Stripe products):
   - 50 credits - $50
   - 100 credits (+5%) - $95
   - 250 credits (+10%) - $225
   - 500 credits (+15%) - $425
   - 1000 credits (+20%) - $800

---

### Phase 2: Update Campaign Wizard

**File: `src/components/campaigns/CampaignWizardModal.tsx`**

1. Change volume selection:
   - From "per month" to "per day" or "total for campaign"
   - Add quality selector for each content type

2. Add checkout step (Step 6):
   - Calculate total credits needed:
     ```
     Total = (videos × quality_cost) + (images × quality_cost)
     ```
   - Show current balance vs required
   - If insufficient: prompt to buy a credit pack

3. Add quality selector UI:
   ```
   Video Quality: [Standard ⚡] [Pro ✨] [Cinema 🎬]
                    5 cr         10 cr     20 cr
   ```

4. Campaign summary with cost breakdown:
   ```
   Campaign Summary:
   - 10 videos (Pro) = 100 credits
   - 30 images (Standard) = 30 credits
   Total: 130 credits

   Your balance: 50 credits
   [Buy 100 Credits Pack] or [Adjust Campaign]
   ```

---

### Phase 3: Update Database Schema

**New columns in `campaigns` table:**
- `video_quality` (text): 'standard' | 'pro' | 'cinema'
- `image_quality` (text): 'standard' | 'pro' | 'cinema'
- `estimated_cost` (integer): Total credits for campaign
- `videos_per_day` (integer): Replace videos_per_month
- `images_per_day` (integer): Replace images_per_month

---

### Phase 4: Update Credit System

**File: `src/hooks/useCredits.ts`**

1. Remove daily limit checks (no longer needed)
2. Add new function: `calculateCampaignCost(videos, images, videoQuality, imageQuality)`
3. Add new function: `hasEnoughCreditsFor(cost): boolean`

**File: `src/hooks/useSubscription.ts`**

1. Simplify access checks:
   - Subscription = access to create projects/campaigns
   - Remove video/image generation limits
   - Keep project/campaign count limits

---

### Phase 5: Update Generation Edge Functions

**Files: `generate-video-sora`, `generate-image`, `generate-reel-video`**

1. Always deduct credits before generation
2. Validate credit balance before starting
3. Return error if insufficient credits (not paywall)

**Flow:**
```
1. Check subscription (can they use the app?)
2. Check credits (can they afford this generation?)
3. Deduct credits
4. Start generation
5. Rollback credits if generation fails
```

---

### Phase 6: Update UI Components

**Files to update:**

1. `src/components/CreditsDisplay.tsx`:
   - Show balance prominently
   - Quick access to buy packs

2. `src/components/PaywallModal.tsx`:
   - Keep for subscription-gated features (projects, campaigns)

3. New: `src/components/InsufficientCreditsModal.tsx`:
   - "You need X more credits"
   - Direct pack purchase buttons

4. `src/pages/PricingPage.tsx`:
   - Separate subscription section (access)
   - Separate credit packs section (generation)
   - Clear cost breakdown

---

### Phase 7: Create Checkout Flow for Credits

**Existing: `supabase/functions/create-checkout/index.ts`**

Already supports credit pack purchases. Ensure integration with:
- Campaign wizard checkout step
- Direct purchase from Credits display
- Pricing page pack buttons

---

## Technical Details

### Credit Cost Matrix

| Content Type | Standard | Pro | Cinema |
|--------------|----------|-----|--------|
| Image        | 1 cr     | 3 cr| 5 cr   |
| Video        | 5 cr     | 10 cr| 20 cr |
| Reel         | 3 cr     | 8 cr| 15 cr  |

### Quality-to-Model Mapping

| Quality | Images | Videos | Reels |
|---------|--------|--------|-------|
| Standard | Gemini Flash | Kling Standard | Kling Standard |
| Pro | Flux-2-Pro | Sora-2 | Sora-2 |
| Cinema | GPT Image | Sora-2 Pro | Sora-2 Pro |

### Campaign Checkout Logic

```typescript
// Campaign cost calculation
function calculateCampaignCost(config) {
  const videoCost = VIDEO_COSTS[config.videoQuality] * config.videosTotal;
  const imageCost = IMAGE_COSTS[config.imageQuality] * config.imagesTotal;
  return videoCost + imageCost;
}

// Before launching campaign
const totalCost = calculateCampaignCost(campaignConfig);
const balance = await getCreditsBalance();

if (balance < totalCost) {
  // Show InsufficientCreditsModal
  // User must buy credits or reduce campaign
} else {
  // Proceed with campaign creation
}
```

---

## Files to Create/Modify

### New Files
- `src/components/InsufficientCreditsModal.tsx`
- `src/components/QualitySelector.tsx`
- `src/components/CampaignCheckoutStep.tsx`

### Modified Files
- `src/lib/commercialProducts.ts`
- `src/hooks/useCredits.ts`
- `src/hooks/useSubscription.ts`
- `src/components/campaigns/CampaignWizardModal.tsx`
- `src/components/CreditsDisplay.tsx`
- `src/pages/PricingPage.tsx`
- `supabase/functions/generate-image/index.ts`
- `supabase/functions/generate-video-sora/index.ts`
- `supabase/functions/generate-reel-video/index.ts`
- `supabase/functions/generate-campaign-content/index.ts`

### Database Migration
- Add columns to `campaigns` table

---

## Summary of Key Changes

1. **Subscription** = Access only (projects, campaigns, auto-posting infra)
2. **Credits** = Required for ALL generation (no freebies in subscription)
3. **Quality tiers** = 3 levels with clear pricing (Standard/Pro/Cinema)
4. **Campaign checkout** = Calculate cost upfront, validate balance, prompt purchase
5. **Daily limits removed** = Generation limited only by credit balance

