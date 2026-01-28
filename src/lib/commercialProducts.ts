// ============================================================
// COMMERCIAL PRODUCTS CONFIGURATION
// This file contains all product definitions for client display
// Internal model mapping is hidden from end users
// ============================================================

export interface CommercialProduct {
  id: string;
  name: string;
  category: "image" | "video" | "avatar";
  tier: "standard" | "pro" | "ultra" | "cinema";
  salePrice: number;
  salePriceUnit: string;
  description: string;
  features: string[];
  internalModels: string[]; // API model IDs (NOT DISPLAYED)
  needsVoice: boolean;
  needsAvatar?: boolean;
  supportedDurations?: number[];
  badge?: string;
  popular?: boolean;
}

// ============================================================
// COMMERCIAL PRODUCTS - CLIENT FACING (ENGLISH)
// ============================================================

export const COMMERCIAL_PRODUCTS: CommercialProduct[] = [
  // === IMAGES ===
  {
    id: "ai-image-smart",
    name: "Smart Images",
    category: "image",
    tier: "standard",
    salePrice: 1,
    salePriceUnit: "/image",
    description: "Fast AI-powered image generation",
    features: ["HD Quality", "Fast generation", "Smart AI"],
    internalModels: ["lovable-ai-gemini"],
    needsVoice: false,
    badge: "AI Smart",
  },
  {
    id: "ai-image-standard",
    name: "AI Image Standard",
    category: "image",
    tier: "standard",
    salePrice: 2,
    salePriceUnit: "/image",
    description: "Quality images for your daily posts",
    features: ["HD Quality", "Fast generation", "All styles"],
    internalModels: ["flux-2-flex"], // ONE model only
    needsVoice: false,
  },
  {
    id: "ai-image-pro",
    name: "AI Image Pro",
    category: "image",
    tier: "pro",
    salePrice: 5,
    salePriceUnit: "/image",
    description: "Premium photorealistic images",
    features: ["Ultra HD 2K", "Photorealistic", "Premium styles"],
    internalModels: ["nano-banana-pro"], // ONE model only
    needsVoice: false,
    popular: true,
  },
  {
    id: "ai-image-studio",
    name: "AI Image Studio",
    category: "image",
    tier: "ultra",
    salePrice: 12,
    salePriceUnit: "/image",
    description: "Professional studio quality",
    features: ["4K Ultra HD", "Perfect consistency", "Brand identity"],
    internalModels: ["gpt-image-1.5"], // ONE model only
    needsVoice: false,
    badge: "PRO",
  },

  // === VIDEOS ===
  {
    id: "ai-reel",
    name: "AI Reel",
    category: "video",
    tier: "standard",
    salePrice: 15,
    salePriceUnit: "/video",
    description: "Short videos for your social networks",
    features: ["HD 1080p", "5-10s", "AI Voice included"],
    internalModels: ["kling-v2-master"], // ONE model: Kling
    needsVoice: true,
    supportedDurations: [5, 10],
  },
  {
    id: "ai-reel-pro",
    name: "AI Reel Pro",
    category: "video",
    tier: "pro",
    salePrice: 29,
    salePriceUnit: "/video",
    description: "Ultra-smooth premium videos",
    features: ["Full HD", "4-12s", "Natural voice", "Smooth motion"],
    internalModels: ["sora-2"], // ONE model: Sora 2
    needsVoice: true,
    supportedDurations: [4, 8, 12],
    popular: true,
  },
  {
    id: "ai-cinema",
    name: "AI Cinema",
    category: "video",
    tier: "cinema",
    salePrice: 69,
    salePriceUnit: "/video",
    description: "Professional cinema quality",
    features: ["4K HDR", "5-10s", "Cinematic rendering", "Premium audio"],
    internalModels: ["veo-3.1"], // ONE model: Veo
    needsVoice: true,
    supportedDurations: [5, 10],
    badge: "CINEMA",
  },

  // === TALKING AVATARS (AI INFLUENCER) ===
  {
    id: "ai-influencer-standard",
    name: "AI Influencer",
    category: "avatar",
    tier: "pro",
    salePrice: 39,
    salePriceUnit: "/video",
    description: "Realistic talking avatar for your content",
    features: ["HD Lip-sync", "5-10s", "Natural voice", "Expressions"],
    internalModels: ["kling-lip-sync"], // ONE model: Kling Lip-Sync
    needsVoice: true,
    needsAvatar: true,
    supportedDurations: [5, 10],
  },
  {
    id: "ai-influencer-pro",
    name: "AI Influencer Pro",
    category: "avatar",
    tier: "ultra",
    salePrice: 69,
    salePriceUnit: "/video",
    description: "Premium avatar with natural emotions",
    features: ["Ultra HD", "5-60s", "Multi-expressions", "Storytelling"],
    internalModels: ["hedra-avatar"], // ONE model: Hedra
    needsVoice: true,
    needsAvatar: true,
    supportedDurations: [5, 10, 15, 30, 60],
    badge: "PRO",
    popular: true,
  },
];

// ============================================================
// INTERNAL MODEL MAPPING (NEVER EXPOSED TO CLIENT)
// ============================================================

import { AIModel, AI_MODELS } from "@/components/ModelSelector";

export const getInternalModels = (productId: string): AIModel[] => {
  const product = COMMERCIAL_PRODUCTS.find((p) => p.id === productId);
  if (!product) return [];
  
  return product.internalModels
    .map((modelId) => AI_MODELS.find((m) => m.id === modelId))
    .filter((m): m is AIModel => m !== undefined);
};

export const getPrimaryInternalModel = (productId: string): AIModel | null => {
  const models = getInternalModels(productId);
  return models[0] || null;
};

// Get commercial name from internal model ID (for legacy displays)
export const getCommercialName = (internalModelId: string): string => {
  const product = COMMERCIAL_PRODUCTS.find((p) =>
    p.internalModels.includes(internalModelId)
  );
  return product?.name || "AI Generation";
};

// ============================================================
// SUBSCRIPTION PLANS (NEW)
// ============================================================

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  priceUnit: string;
  description: string;
  features: string[];
  limits: {
    projects: number;
    autopostImages: number; // per day (-1 = unlimited)
    autopostVideos: number; // per day (-1 = unlimited)
    imageQuality: "standard" | "pro" | "studio" | null;
    videoQuality: "standard" | "pro" | "cinema" | null;
  };
  popular?: boolean;
  badge?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
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
      autopostImages: 30,
      autopostVideos: 0,
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
      autopostImages: -1,
      autopostVideos: 1,
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

// ============================================================
// CREDIT COSTS (per generation)
// ============================================================

export const CREDIT_COSTS: Record<string, number> = {
  // Images
  "ai-image-smart": 1,
  "ai-image-standard": 2,
  "ai-image-pro": 5,
  "ai-image-studio": 12,
  
  // Videos
  "ai-reel": 15,
  "ai-reel-pro": 29,
  "ai-cinema": 69,
  
  // Avatars
  "ai-influencer-standard": 39,
  "ai-influencer-pro": 69,
};

// ============================================================
// CREDIT PACKS (for purchase)
// ============================================================

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  bonus: number;
  label: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack-50", credits: 50, price: 50, bonus: 0, label: "50 Credits" },
  { id: "pack-100", credits: 100, price: 95, bonus: 5, label: "100 Credits (+5%)" },
  { id: "pack-250", credits: 250, price: 225, bonus: 10, label: "250 Credits (+10%)" },
  { id: "pack-500", credits: 500, price: 425, bonus: 15, label: "500 Credits (+15%)" },
  { id: "pack-1000", credits: 1000, price: 800, bonus: 20, label: "1000 Credits (+20%)" },
];

// ============================================================
// LEGACY PRICING PACKS (for backwards compatibility)
// ============================================================

export interface PricingPack {
  id: string;
  name: string;
  price: number;
  priceUnit: string;
  description: string;
  features: string[];
  included: {
    images: number;
    videos: number;
    influencerVideos: number;
  };
  popular?: boolean;
  badge?: string;
}

// Map PRICING_PLANS to PRICING_PACKS for backwards compatibility
export const PRICING_PACKS: PricingPack[] = PRICING_PLANS.map(plan => ({
  id: plan.id,
  name: plan.name,
  price: plan.price,
  priceUnit: plan.priceUnit,
  description: plan.description,
  features: plan.features,
  included: {
    images: plan.limits.autopostImages,
    videos: plan.limits.autopostVideos,
    influencerVideos: plan.id === "business" ? 3 : plan.id === "pro" ? 1 : 0,
  },
  popular: plan.popular,
  badge: plan.badge,
}));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const getTierColor = (tier: CommercialProduct["tier"]) => {
  switch (tier) {
    case "standard":
      return "bg-muted text-muted-foreground";
    case "pro":
      return "bg-primary/20 text-primary";
    case "ultra":
      return "bg-accent/20 text-accent";
    case "cinema":
      return "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600";
  }
};

export const getCategoryLabel = (category: CommercialProduct["category"]) => {
  switch (category) {
    case "image":
      return "🖼️ Images";
    case "video":
      return "🎬 Videos";
    case "avatar":
      return "🎤 AI Influencer";
  }
};

export const getProductsByCategory = (category: CommercialProduct["category"]) => {
  return COMMERCIAL_PRODUCTS.filter((p) => p.category === category);
};

export const formatPrice = (price: number, unit: string) => {
  return `${price}€${unit}`;
};

export const getCreditCost = (productId: string): number => {
  return CREDIT_COSTS[productId] || 0;
};

export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find(p => p.id === planId);
};
