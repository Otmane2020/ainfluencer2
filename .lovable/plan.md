

## New Pricing & Credits System for ClipMotion

Based on your strategic discussion, I'll implement a complete **Subscription + Credits** system that separates Image and Video campaigns, with cost-controlled AutoPost.

---

### Overview

**Business Model:**
- **Subscriptions** = Access + Features (monthly fee)
- **Credits** = Consumption (1 credit = 1€)
- **AutoPost** = Orchestration engine (consumes credits)

---

### 1. Database Schema

#### New Tables

**`subscriptions`** - Track user plans
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth |
| plan_id | text | starter/pro/business |
| status | text | active/paused/cancelled |
| started_at | timestamp | Plan start date |
| renews_at | timestamp | Next billing date |
| created_at | timestamp | Created |

**`credits`** - Track user credit balance
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth |
| balance | integer | Current credits |
| updated_at | timestamp | Last update |

**`credit_transactions`** - Credit history
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth |
| amount | integer | +/- credits |
| type | text | purchase/consumption/bonus |
| description | text | "Image Pro generation" |
| created_at | timestamp | Transaction time |

---

### 2. Pricing Plans (Updated)

```typescript
// src/lib/commercialProducts.ts

export const PRICING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    priceUnit: "/month",
    description: "Perfect for creators getting started",
    features: [
      "3 projects",
      "AutoPost AI Images (up to 30/day)",
      "Standard quality images",
      "Email support",
    ],
    limits: {
      projects: 3,
      autopostImages: 30,    // per day
      autopostVideos: 0,      // no videos in AutoPost
      imageQuality: "standard",
      videoQuality: null,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    priceUnit: "/month",
    description: "For brands and serious creators",
    features: [
      "10 projects",
      "AutoPost AI Images (unlimited)",
      "AutoPost AI Videos (1/day)",
      "Pro & Ultra quality",
      "Priority support",
    ],
    limits: {
      projects: 10,
      autopostImages: -1,     // unlimited
      autopostVideos: 1,      // 1 per day
      imageQuality: "pro",
      videoQuality: "pro",
    },
    popular: true,
    badge: "POPULAR",
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    priceUnit: "/month",
    description: "For agencies and power users",
    features: [
      "Unlimited projects",
      "AutoPost AI Images (unlimited)",
      "AutoPost AI Videos (3/day)",
      "AI Cinema & Influencer",
      "Priority queue",
      "API access",
    ],
    limits: {
      projects: -1,
      autopostImages: -1,
      autopostVideos: 3,
      imageQuality: "studio",
      videoQuality: "cinema",
    },
    badge: "PRO",
  },
];
```

---

### 3. Credit Pricing

```typescript
// Per-generation credit costs
export const CREDIT_COSTS = {
  // Images
  "ai-image-smart": 1,      // Lovable AI
  "ai-image-standard": 2,   // Flux Flex
  "ai-image-pro": 5,        // Nano Banana Pro
  "ai-image-studio": 12,    // GPT Image 1.5
  
  // Videos
  "ai-reel": 15,            // Kling
  "ai-reel-pro": 29,        // Sora 2
  "ai-cinema": 69,          // Veo 3.1
  
  // Avatars
  "ai-influencer-standard": 39,
  "ai-influencer-pro": 69,
};

// Credit packs for purchase
export const CREDIT_PACKS = [
  { id: "pack-50", credits: 50, price: 50, bonus: 0, label: "50 Credits" },
  { id: "pack-100", credits: 100, price: 95, bonus: 5, label: "100 Credits (+5%)" },
  { id: "pack-250", credits: 250, price: 225, bonus: 10, label: "250 Credits (+10%)" },
  { id: "pack-500", credits: 500, price: 425, bonus: 15, label: "500 Credits (+15%)" },
  { id: "pack-1000", credits: 1000, price: 800, bonus: 20, label: "1000 Credits (+20%)" },
];
```

---

### 4. Campaign Types (Separated)

Update the wizard to have **Image Campaign** and **Video Campaign** as distinct types:

**Image Campaign** (low cost, high volume)
- Up to 30 images/day via AutoPost
- Standard quality for Starter, Pro for Pro+
- Each image consumes credits

**Video Campaign** (premium, limited)
- Limited by plan (0/1/3 per day)
- Consumes higher credits
- Optional add-on for Starter

```typescript
const CAMPAIGN_TYPES = [
  { 
    id: "image", 
    label: "Image Campaign", 
    icon: ImageIcon, 
    description: "AutoPost up to 30 images/day",
    availableFrom: "starter" 
  },
  { 
    id: "video", 
    label: "Video Campaign", 
    icon: Video, 
    description: "Premium AI videos (plan limits apply)",
    availableFrom: "pro"  // Not for Starter by default
  },
];
```

---

### 5. AutoPost Credit Consumption Logic

```typescript
// In run-campaigns-cron edge function

// Before generating, check:
// 1. User has enough credits
// 2. User hasn't exceeded daily limits based on plan

const checkCanGenerate = async (userId: string, contentType: 'image' | 'video') => {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .single();
    
  const { data: credits } = await supabase
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .single();
    
  const plan = PRICING_PLANS.find(p => p.id === subscription.plan_id);
  const cost = CREDIT_COSTS[productId];
  
  // Check credits
  if (credits.balance < cost) {
    return { allowed: false, reason: 'insufficient_credits' };
  }
  
  // Check daily limits for videos
  if (contentType === 'video') {
    const todayCount = await getTodayVideoCount(userId);
    if (plan.limits.autopostVideos !== -1 && todayCount >= plan.limits.autopostVideos) {
      return { allowed: false, reason: 'daily_limit_reached' };
    }
  }
  
  return { allowed: true };
};

// After generation, deduct credits
const deductCredits = async (userId: string, amount: number, description: string) => {
  // Update balance
  await supabase.rpc('deduct_credits', { user_id: userId, amount });
  
  // Log transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'consumption',
    description,
  });
};
```

---

### 6. UI Updates

#### Pricing Page (New Design)
- Show 3 plans: Starter ($19), Pro ($49), Business ($99)
- Clear feature comparison table
- Credit pack purchase section
- AutoPost limits clearly displayed

#### Settings Page (Credit Display)
- Current plan badge
- Credit balance with "Buy Credits" button
- Recent transactions
- Usage statistics

#### Campaign Wizard
- Show "Video Campaign" as locked for Starter
- Display credit cost estimate before creation
- Warning if low credits

---

### 7. Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/commercialProducts.ts` | Update with new PRICING_PLANS, CREDIT_COSTS, CREDIT_PACKS |
| `src/components/PricingPacks.tsx` | Redesign for new plan structure |
| `src/pages/PricingPage.tsx` | Add credit packs section |
| `src/pages/Settings.tsx` | Real credit balance display, transactions |
| `src/components/campaigns/CampaignWizardModal.tsx` | Add plan limit checks, credit cost preview |
| `supabase/migrations/` | Create subscriptions, credits, credit_transactions tables |
| `supabase/functions/run-campaigns-cron/index.ts` | Add credit deduction logic |
| `src/hooks/useCredits.ts` | NEW: Hook for credit balance + operations |
| `src/components/CreditPacks.tsx` | NEW: Credit pack purchase UI |

---

### 8. Key Messages (Marketing)

For the app UI:
> "ClipMotion works with credits. Each generation consumes credits based on quality. Recharge anytime. No commitment."

> "Images are automated, videos are premium."

> "AutoPost automatically pauses when credits are depleted."

---

### Technical Notes

1. **RLS Policies**: All new tables need user-based RLS
2. **Stripe Integration**: Credit pack purchases will use Stripe (enable later)
3. **Default Credits**: New users get 10 free credits to try
4. **AutoPost Pause**: Cron checks credits before each generation

