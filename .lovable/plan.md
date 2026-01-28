
# Billing & Access Control Fix - Critical Financial Security

## Problem Summary

You have identified a critical security and financial issue: **you have access to all features (ClipMotion, Video, Images, Campaigns, Projects) without having paid**. 

### Root Causes Identified

1. **Orphan Stripe Subscription**: Your Stripe subscription uses price `price_1SrHtCEfti9t9nN9L8Fytsni` (299 cents = 2.99 EUR for "Starlinko Starter" - a completely different product), but the `check-subscription` edge function only recognizes these product IDs:
   - `prod_TsR9Pr6RC1wKB9` -> starter (19 EUR)
   - `prod_TsR9BN6zNpq8Rp` -> pro (49 EUR)
   - `prod_TsR93v9Am93N8O` -> business (99 EUR)

2. **No Feature Gating in UI**: The pages (ClipMotion, Videos, Images, Campaigns) have **zero access controls** - they render content for everyone regardless of subscription status.

3. **Default "Starter" Fallback Grants Access**: When the subscription check cannot map the price, it defaults to "starter" plan with `subscribed: true`, which still grants access to features.

4. **No Checkout Redirect**: Users who haven't paid are never redirected to checkout - they just get default access.

---

## Implementation Plan

### Phase 1: Fix Stripe Product Mapping (Backend - Critical)

**File: `supabase/functions/check-subscription/index.ts`**

Update the product-to-plan mapping to handle unknown products correctly:

```typescript
// CURRENT (broken):
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TsR9Pr6RC1wKB9": "starter",
  "prod_TsR9BN6zNpq8Rp": "pro",
  "prod_TsR93v9Am93N8O": "business",
};

// FIXED: Also map by price ID as fallback
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1SugHFEfti9t9nN9b36Qye6L": "starter",
  "price_1SugHGEfti9t9nN9luP2Qtj9": "pro",
  "price_1SugHIEfti9t9nN9eJMHoewy": "business",
};

// If product not recognized AND price not recognized = NO valid subscription
```

**Logic Change:**
- If subscription exists but product/price is not in our mapping -> treat as `subscribed: false`
- This ensures legacy/orphan subscriptions don't grant unearned access

---

### Phase 2: Create Paywall Guard Component (Frontend)

**New File: `src/components/PaywallGuard.tsx`**

A reusable component that blocks access to premium features:

```typescript
interface PaywallGuardProps {
  feature: "video" | "clipmotion" | "campaigns" | "images" | "projects";
  children: React.ReactNode;
  requiredPlan?: "starter" | "pro" | "business";
}

// Shows upgrade prompt if user doesn't have access
// Redirects to checkout if clicked
```

---

### Phase 3: Protect All Feature Pages (Frontend - Critical)

Add paywall guards to these pages:

| Page | File | Required Access |
|------|------|-----------------|
| ClipMotion | `src/pages/ClipMotionPage.tsx` | Pro or higher (video access) |
| Videos | `src/pages/Videos.tsx` | Pro or higher (video access) |
| Images | `src/pages/Images.tsx` | Starter or higher (but verify subscription) |
| Campaigns | `src/pages/CampaignsPage.tsx` | Check campaign limits |

**Example Protection:**
```typescript
const ClipMotionPage = () => {
  const { canAccessFeature, startCheckout, isLoading } = useSubscription();
  
  if (isLoading) return <LoadingSpinner />;
  
  if (!canAccessFeature("video")) {
    return <PaywallUpgrade feature="ClipMotion" requiredPlan="pro" />;
  }
  
  return <VideoGenerator ... />;
};
```

---

### Phase 4: Add Generation-Time Credit Checks (Backend)

**Edge Functions to Update:**
- `generate-video-sora` 
- `generate-image`
- `run-campaigns-cron`

Before generating content, verify:
1. User has active, valid subscription
2. User has sufficient credits/quota
3. Plan allows the requested quality level

```typescript
// Check subscription before expensive API calls
const subCheck = await checkUserSubscription(userId);
if (!subCheck.valid) {
  return { error: "Subscription required", redirect_to_checkout: true };
}
```

---

### Phase 5: Upgrade/Checkout Flow (Frontend)

**Update: `src/components/CreditsDisplay.tsx`**

When user has no valid subscription:
- Show "Subscribe" button instead of credits
- Clicking triggers checkout for starter plan

**New: Upgrade Prompt Modal**

When blocked by paywall, show:
- Current plan limitations
- What they'll get with upgrade
- One-click checkout button

---

## Database Cleanup Required

Your current subscription record has an orphan `stripe_subscription_id` that doesn't match our products:

```sql
-- Query to identify orphan subscriptions
SELECT * FROM subscriptions 
WHERE stripe_subscription_id IS NOT NULL 
AND plan_id = 'starter';
```

The subscription with `sub_1SrpUqEfti9t9nN9pfMLpJDO` is for product `prod_TovkM38DxsrZVX` ("Starlinko Starter" at 2.99 EUR) - this is NOT one of the ClipMotion plans.

---

## Technical Details

### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/PaywallGuard.tsx` | Reusable access control component |
| Create | `src/components/PaywallUpgrade.tsx` | Upgrade prompt UI |
| Modify | `supabase/functions/check-subscription/index.ts` | Fix product mapping, strict validation |
| Modify | `src/pages/ClipMotionPage.tsx` | Add paywall guard |
| Modify | `src/pages/Videos.tsx` | Add paywall guard |
| Modify | `src/pages/Images.tsx` | Add paywall guard |
| Modify | `src/pages/CampaignsPage.tsx` | Add paywall guard |
| Modify | `src/pages/Projects.tsx` | Add project limit check |
| Modify | `supabase/functions/generate-video-sora/index.ts` | Add subscription check |
| Modify | `supabase/functions/generate-image/index.ts` | Add subscription check |
| Modify | `src/hooks/useSubscription.ts` | Add `redirectToCheckout` helper |

### Security Considerations

1. **Never trust client-side checks alone** - Always verify subscription in edge functions before expensive operations
2. **Fail secure** - If subscription check fails, deny access rather than grant it
3. **Log payment events** - Add logging for audit trail
4. **Webhook verification** - Ensure `stripe-webhook` properly validates signatures

---

## Expected Outcome

After implementation:
- Users without valid subscription will see upgrade prompts
- ClipMotion/Videos blocked for Starter plan
- Each generation verifies subscription server-side
- Orphan subscriptions will not grant access
- Clear path from paywall to checkout

