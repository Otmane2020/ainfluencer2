// ============================================================
// STRIPE PRODUCTS CONFIGURATION (USD)
// Maps internal plan/pack IDs to Stripe price IDs
// ============================================================

export const STRIPE_PLAN_PRICES: Record<string, { priceId: string; productId: string }> = {
  // Starter is free — no Stripe price needed (signup only)
  pro: {
    priceId: "price_1Sw4JNEfti9t9nN9Z88uua20",
    productId: "prod_Tts3Yrv7nyBmxi",
  },
  business: {
    priceId: "price_1TToZ8Efti9t9nN9kA3w0Myp",
    productId: "prod_USk3Zi3Hhs42nn",
  },
};

export const STRIPE_CREDIT_PACKS: Record<string, { priceId: string; productId: string; credits: number }> = {
  "pack-5": {
    priceId: "price_1TTtsiEfti9t9nN9G51T8TIS",
    productId: "prod_USpXKw9DcVJRwS",
    credits: 5,
  },
  "pack-20": {
    priceId: "price_1TTtsjEfti9t9nN9VhqJ2S7v",
    productId: "prod_USpXSB4O0gHZTE",
    credits: 20,
  },
  "pack-50": {
    priceId: "price_1TTtskEfti9t9nN9furDfh1K",
    productId: "prod_USpXT9Pm7NJLsx",
    credits: 50,
  },
  "pack-100": {
    priceId: "price_1TTtslEfti9t9nN9uFXKcXrx",
    productId: "prod_USpXnDMBgwY0Tj",
    credits: 100,
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
