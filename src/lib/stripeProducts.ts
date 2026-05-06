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
    priceId: "price_1TTuBVEfti9t9nN9hzt4y7my",
    productId: "prod_USprVpRujDGSPw",
    credits: 5,
  },
  "pack-20": {
    priceId: "price_1TTuBXEfti9t9nN983Z27xhq",
    productId: "prod_USprcdvw4CBnR1",
    credits: 20,
  },
  "pack-50": {
    priceId: "price_1TTuBXEfti9t9nN9a6lJ0vRa",
    productId: "prod_USprG7R0yBCpuY",
    credits: 50,
  },
  "pack-100": {
    priceId: "price_1TTuBYEfti9t9nN9ygzXExWW",
    productId: "prod_USprnweuLgGJ9t",
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
