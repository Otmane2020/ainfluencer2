# Stripe Setup Guide - Emo Robot Product

## Product Details

**Product Name:** Emo Robot Premium
**Description:** Complete AI content automation system with free worldwide shipping
**Price:** €599 (EUR)
**Billing Type:** One-time payment
**Credits Included:** 5000 lifetime credits

## Setup Instructions

### 1. Create the Product in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**
3. Fill in the details:
   - **Name:** `Emo Robot Premium`
   - **Description:** `Complete AI content automation system. 5000 lifetime credits, unlimited projects, VIP support, API access, team collaboration (up to 5 users). Free shipping worldwide.`
   - **Type:** Standard pricing
   - **Tax code:** Digital Service - EU VAT

### 2. Create the Price

1. In the product details, click **Add price**
2. Fill in the pricing:
   - **Currency:** EUR (€)
   - **Price:** 599.00
   - **Billing period:** One-time (not recurring)
3. Enable **Tax behavior:** Tax exclusive

### 3. Update Configuration

Once created, update `src/lib/stripeProducts.ts`:

```typescript
export const STRIPE_PLAN_PRICES: Record<string, { priceId: string; productId: string }> = {
  // ... existing plans ...
  emo: {
    priceId: "price_YOUR_PRICE_ID_HERE",      // Replace with actual price ID
    productId: "prod_YOUR_PRODUCT_ID_HERE",   // Replace with actual product ID
  },
};
```

### 4. Test the Integration

1. Use Stripe test mode keys
2. Navigate to `/pricing` page
3. Click "Get Emo Robot" button
4. Complete test checkout with test card: `4242 4242 4242 4242`

### 5. Additional Configuration

**Shipping Configuration (Optional):**
- Go to **Settings** → **Shipping rates**
- Create a shipping rate: "FREE - Worldwide Delivery"
- Price: €0
- Coverage: All countries

**Tax Configuration:**
- Enable EU VAT collection
- Configure tax rates per jurisdiction
- Set digital service rate for EU customers (typically 19-21%)

## Live Mode Activation

Once tested successfully:

1. Switch to **Live mode** in Stripe Dashboard
2. Update environment variables:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   VITE_STRIPE_SECRET_KEY=sk_live_...
   ```
3. Deploy to production

## Product Features in Database

Update user subscription records with plan benefits:

```sql
INSERT INTO subscription_benefits (plan_id, feature)
VALUES 
  ('emo', 'lifetime_credits'),
  ('emo', 'unlimited_projects'),
  ('emo', 'vip_support'),
  ('emo', 'api_access'),
  ('emo', 'team_collaboration'),
  ('emo', 'free_shipping');
```

## Testing Checklist

- [ ] Stripe product created with correct details
- [ ] Price set to €599 EUR (one-time)
- [ ] Test checkout flow successful
- [ ] Test email confirmation sent
- [ ] Webhook configured for `payment_intent.succeeded`
- [ ] Credits awarded to user account after purchase
- [ ] Plan access granted immediately
- [ ] Invoice generated and sent
- [ ] Tax calculation correct for different regions

## Support

For issues:
1. Check Stripe Dashboard logs
2. Review webhook delivery history
3. Verify API keys in environment variables
4. Check Supabase subscription records
