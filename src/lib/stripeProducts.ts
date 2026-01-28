// ============================================================
// STRIPE PRODUCTS CONFIGURATION
// Maps internal plan/pack IDs to Stripe price IDs
// ============================================================

export const STRIPE_PLAN_PRICES: Record<string, { priceId: string; productId: string }> = {
  starter: {
    priceId: "price_1SugHFEfti9t9nN9b36Qye6L",
    productId: "prod_TsR9Pr6RC1wKB9",
  },
  pro: {
    priceId: "price_1SugHGEfti9t9nN9luP2Qtj9",
    productId: "prod_TsR9BN6zNpq8Rp",
  },
  business: {
    priceId: "price_1SugHIEfti9t9nN9eJMHoewy",
    productId: "prod_TsR93v9Am93N8O",
  },
};

export const STRIPE_CREDIT_PACKS: Record<string, { priceId: string; productId: string; credits: number }> = {
  "pack-50": {
    priceId: "price_1SugHJEfti9t9nN9envQQFpb",
    productId: "prod_TsR9U5mSTTQdDK",
    credits: 50,
  },
  "pack-100": {
    priceId: "price_1SugHKEfti9t9nN99kdSOTBB",
    productId: "prod_TsR9fRV7yU3eqZ",
    credits: 100,
  },
  "pack-250": {
    priceId: "price_1SugHMEfti9t9nN9bYQWaV7u",
    productId: "prod_TsR9hqGLrDQbG3",
    credits: 250,
  },
  "pack-500": {
    priceId: "price_1SugHNEfti9t9nN9Fqd8PlP6",
    productId: "prod_TsR91tE3424VCB",
    credits: 500,
  },
  "pack-1000": {
    priceId: "price_1SugHOEfti9t9nN99vbXioV6",
    productId: "prod_TsR9hud9AgzgU8",
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
