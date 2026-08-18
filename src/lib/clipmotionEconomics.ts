// ClipMotion unit economics.
// Business rule requested by the product owner: 100% markup on variable AI cost.
// In accounting terms that means retail = API cost x 2 (50% gross margin before Stripe/infra).

export const API_COST_MARKUP_MULTIPLIER = 2;

// Higgsfield's public auto-refill benchmark is $1 = 20 provider credits.
// We keep a 1:1 numerical mapping between a ClipMotion generation credit and
// the estimated Higgsfield provider-credit consumption, then retail that credit
// at 2x the provider-credit cost.
export const HIGGSFIELD_PROVIDER_CREDIT_USD = 0.05;
export const CLIPMOTION_CREDIT_RETAIL_USD =
  HIGGSFIELD_PROVIDER_CREDIT_USD * API_COST_MARKUP_MULTIPLIER; // $0.10

// Deepgram Aura-2 PAYG public price: $0.030 / 1,000 characters.
export const DEEPGRAM_AURA2_USD_PER_1K_CHARS = 0.03;

export type ClipMotionResolution = "720p" | "1080p";
export type ClipMotionPlanId = "starter" | "pro" | "business";

export interface ClipMotionPlan {
  id: ClipMotionPlanId;
  name: string;
  price: number;
  priceUnit: string;
  description: string;
  credits: number;
  features: string[];
  limits: { projects: number };
  popular?: boolean;
  badge?: string;
}

// At full usage, included credits represent exactly 50% of subscription revenue
// at the $0.05/provider-credit benchmark: $19 -> $9.50 cost, etc.
export const CLIPMOTION_PLANS: ClipMotionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    priceUnit: "/month",
    description: "For creators testing product motion every month",
    credits: 190,
    features: [
      "190 generation credits / month",
      "Product Motion + Product Visuals",
      "Deepgram Aura-2 voiceovers",
      "All supported Higgsfield engines",
      "Up to 1080p on supported generations",
      "Generation library",
      "3 product projects",
    ],
    limits: { projects: 3 },
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    priceUnit: "/month",
    description: "For brands producing new creatives every week",
    credits: 490,
    features: [
      "490 generation credits / month",
      "Product Motion + Product Visuals",
      "Deepgram Aura-2 voiceovers",
      "All supported Higgsfield engines",
      "Up to 1080p on supported generations",
      "Generation library",
      "10 product projects",
    ],
    limits: { projects: 10 },
    popular: true,
    badge: "RECOMMENDED",
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    priceUnit: "/month",
    description: "For agencies and high-volume e-commerce teams",
    credits: 990,
    features: [
      "990 generation credits / month",
      "Product Motion + Product Visuals",
      "Deepgram Aura-2 voiceovers",
      "All supported Higgsfield engines",
      "Up to 1080p on supported generations",
      "Generation library",
      "Unlimited product projects",
    ],
    limits: { projects: -1 },
    badge: "HIGH VOLUME",
  },
];

export interface ClipMotionCreditPack {
  id: string;
  credits: number;
  price: number;
  label: string;
}

// No volume discount here: $0.10 retail / credit preserves the requested 2x API-cost rule.
export const CLIPMOTION_CREDIT_PACKS: ClipMotionCreditPack[] = [
  { id: "pack-100", credits: 100, price: 10, label: "100 Credits" },
  { id: "pack-300", credits: 300, price: 30, label: "300 Credits" },
  { id: "pack-700", credits: 700, price: 70, label: "700 Credits" },
  { id: "pack-1500", credits: 1500, price: 150, label: "1,500 Credits" },
];

// Conservative provider-credit estimates for the currently exposed Higgsfield flows.
// Video cost varies by engine, duration and resolution. The server is the source of truth
// and uses the same table before charging a request.
const MOTION_720P_BY_DURATION: Record<number, number> = {
  3: 18,
  5: 24,
  8: 36,
  10: 60,
};

export function getProductVisualCreditCost(resolution: ClipMotionResolution = "720p") {
  return resolution === "1080p" ? 8 : 5;
}

export function getProductMotionCreditCost(
  duration: number,
  resolution: ClipMotionResolution = "720p",
) {
  const supported = [3, 5, 8, 10];
  const nearest = supported.reduce((best, candidate) =>
    Math.abs(candidate - duration) < Math.abs(best - duration) ? candidate : best,
  );
  const base = MOTION_720P_BY_DURATION[nearest];
  return resolution === "1080p" ? base * 2 : base;
}

export function getVoiceoverCreditCost(characterCount: number) {
  // Aura-2 costs $0.03/1k chars. Retail at 2x is $0.06/1k chars.
  // One $0.10 ClipMotion credit safely covers up to 1,500 chars at the target markup.
  return Math.max(1, Math.ceil(Math.max(0, characterCount) / 1500));
}

export function creditsToRetailUsd(credits: number) {
  return Number((credits * CLIPMOTION_CREDIT_RETAIL_USD).toFixed(2));
}

export function creditsToEstimatedApiUsd(credits: number) {
  return Number((credits * HIGGSFIELD_PROVIDER_CREDIT_USD).toFixed(2));
}

export function getPlan(planId: string | null | undefined) {
  return CLIPMOTION_PLANS.find((plan) => plan.id === planId) ?? CLIPMOTION_PLANS[0];
}
