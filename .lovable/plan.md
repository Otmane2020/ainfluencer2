## Goal

Align the entire app with the new "Product Shot AI" positioning (1 photo → 10 pro images). This includes:
1. Rebuild the **landing page** to match the uploaded HTML 1:1 (English copy, current violet/cyan theme — no gold).
2. Update **pricing plans** everywhere (Starter / Pro / Business — USD).
3. Refactor the **Settings** page to remove obsolete sections.
4. Refactor the **mobile menu** to surface only what's still relevant.

Theme stays violet/cyan. No file in `src/index.css` / `tailwind.config.ts` is touched.

---

## 1. Landing page — `src/pages/LandingPage.tsx`

Full rewrite, section-by-section, matching the uploaded HTML order and copy (translated to English).

| # | Section | Content |
|---|---|---|
| 1 | Sticky nav | Logo + "Start Free →" CTA |
| 2 | Hero | Pulsing badge "AI built for E-commerce" · H1 `1 product photo → 10 pro images in 2 minutes` · Sub copy · Primary CTA "Try Free" + ghost "Watch demo →" · Radial `bg-primary/10` glow |
| 3 | Stats bar | `10x` images / `2 min` generation / `+67%` conversion / `$0` photographer |
| 4 | Before / After demo | Original photo card → arrow circle → 4-thumb generated grid. Use existing `/public/showcase/sofa-*.png` and `watch-*.png`. Caption: "Lifestyle · Studio · Multi-color · Detail zoom · Square & portrait" |
| 5 | How it works | 3 numbered cards (Upload · Pick style · Download HD) |
| 6 | Features | 4 cards (Auto bg removal · Lifestyle scenes · Multi-platform formats · Batch up to 20) |
| 7 | Pricing | Reuse `<PricingPacks />` (already wired to Stripe USD prices) |
| 8 | Testimonials | 3 cards: Kofi A. (fashion), Aminata D. (cosmetics), Mohamed S. (Shopify) |
| 9 | Final CTA box | "Ready to sell more?" + "Start free" + "5 free products · No credit card · Result in 2 minutes" |
| 10 | Footer | Keep current footer |

Theme mapping: gold → `text-primary`; gold CTA → existing primary gradient `Button`; `var(--card)` → `bg-card`; `var(--muted)` → `text-muted-foreground`. All grids collapse to 1 col below `md`.

Removes: `coreProducts`, `platformFeatures`, `VideoShowcase`, `MobileLandingPage` split (single responsive page).
Keeps: `MobileStickyCta`, OAuth-callback redirect effect, `SEOHead`.

---

## 2. Pricing — already updated, verify only

`src/lib/commercialProducts.ts`, `src/lib/stripeProducts.ts`, and `supabase/functions/create-checkout/index.ts` already reflect:
- **Starter** — Free, 5 products
- **Pro** — $29/mo, 50 products, popular
- **Business** — $79/mo, unlimited

Action: audit `PricingPacks.tsx` to ensure 3-column layout, no leftover flash-sale UI, and CTAs route correctly (Starter → `/auth`, Pro/Business → Stripe checkout).

---

## 3. Settings page — `src/pages/Settings.tsx` (and tabs under it)

Remove sections that no longer apply to the Product Shot AI pivot:
- Video render preferences (Remotion / Sora / HeyGen tabs)
- AI influencer / talking-portrait settings
- LinkedIn reaction frames
- Auto-publish cron toggles per platform (only relevant for the campaigns module — gate it behind a `Campaigns` tab kept for power users)

Keep / rework:
- **Account** — email, password, language (lock to English), delete account
- **Brand** — brand name, logo, primary color, brand voice (used by product-shot prompts)
- **Subscription** — current plan, credit balance, "Manage billing" → Stripe portal
- **Product Shot defaults** — default styles, default formats (square/portrait/landscape), watermark on/off
- **Connected stores** — Shopify / WooCommerce connect buttons (placeholder cards if integrations not yet wired)
- **API access** — visible only on Business plan

Implementation: prune the `<Tabs>` list in `Settings.tsx` and delete unused tab components (or keep files but unmount routes). No DB schema changes needed — extra rows just stop being read.

---

## 4. Mobile menu — `src/components/layout/MobileHeader.tsx` + `MobileBottomNav` if present

New mobile nav (max 5 items, bottom tab bar style):
1. **Home** → `/dashboard`
2. **Product Shots** → `/product-shots` (flagship)
3. **AI Image** → `/images`
4. **History** → `/post-history`
5. **More** → drawer with: Campaigns, Integrations, Settings, Billing, Logout

Hamburger drawer on top header keeps: project switcher, notifications, help, sign out.

Removes from primary mobile surface: Videos, Calendar, Cinema, ClipMotion Videos, Nano Banana — these stay reachable via the "More" drawer only.

---

## Files touched

- `src/pages/LandingPage.tsx` — full rewrite
- `src/components/PricingPacks.tsx` — verify/clean 3-col layout
- `src/pages/Settings.tsx` — prune tabs, add Product Shot defaults + Connected stores tabs
- `src/components/layout/MobileHeader.tsx` — new bottom-tab structure + More drawer
- (possibly) `src/components/layout/MobileBottomNav.tsx` if it exists

## Out of scope

- No theme / token changes
- No Stripe price-ID changes (already done)
- No DB migrations
- Sidebar (desktop) already simplified — leave as is

## Verification

After build:
- `/` at 1322px and 390px — sections appear in HTML order, English copy, violet/cyan theme intact
- `/settings` — only the 5 tabs above, old tabs gone
- Mobile bottom nav shows 5 items, "More" drawer opens with secondary links
- Stripe checkout still works for Pro & Business
