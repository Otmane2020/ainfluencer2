// ============================================================
// STRIPE PRODUCTS CONFIGURATION (USD)
// Maps internal plan/pack IDs to Stripe price IDs
// ============================================================

export const STRIPE_PLAN_PRICES: Record<string, { priceId: string; productId: string }> = {
  starter: {
    priceId: "price_1SuiszEfti9t9nN9qEGnwrdT",
    productId: "prod_TsTqynweuSksG3",
  },
  pro: {
    priceId: "price_1Suit0Efti9t9nN9jKws1R3q",
    productId: "prod_TsTqUdBfAHdNCi",
  },
  business: {
    priceId: "price_1Suit1Efti9t9nN9F5g8iTGq",
    productId: "prod_TsTqxdl9cpZNJg",
  },
};

export const STRIPE_CREDIT_PACKS: Record<string, { priceId: string; productId: string; credits: number }> = {
  "pack-50": {
    priceId: "price_1Suit2Efti9t9nN9idG07kAf",
    productId: "prod_TsTqPqpRkZl5xU",
    credits: 50,
  },
  "pack-100": {
    priceId: "price_1Suit3Efti9t9nN9vPGwwfWa",
    productId: "prod_TsTqBhW2FrVOFu",
    credits: 100,
  },
  "pack-250": {
    priceId: "price_1Suit5Efti9t9nN9cjaee5yZ",
    productId: "prod_TsTqKyDZmBTUSO",
    credits: 250,
  },
  "pack-500": {
    priceId: "price_1Suit5Efti9t9nN96jaDSp7j",
    productId: "prod_TsTq72QeGDinYk",
    credits: 500,
  },
  "pack-1000": {
    priceId: "price_1Suit6Efti9t9nN9ynTRmA7o",
    productId: "prod_TsTqRrKlNQJys6",
    credits: 1000,
  },
};

// Reverse lookup: price ID to plan ID
export const getPlanIdFromStripePrice = (priceId: string): string | null => {
  for (const [planId, config] of Object.entries(STRIPE_PLAN_PRICES)) {
    if (config.priceId === priceId) return planId;
  }
  return null;
};

// Reverse lookup: product ID to plan ID
export const getPlanIdFromStripeProduct = (productId: string): string | null => {
  for (const [planId, config] of Object.entries(STRIPE_PLAN_PRICES)) {
    if (config.productId === productId) return planId;
  }
  return null;
};

// Get credits for a credit pack price
export const getCreditsFromStripePrice = (priceId: string): number | null => {
  for (const config of Object.values(STRIPE_CREDIT_PACKS)) {
    if (config.priceId === priceId) return config.credits;
  }
  return null;
};
