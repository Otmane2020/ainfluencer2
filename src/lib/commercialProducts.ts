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
// PRICING PACKS
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

export const PRICING_PACKS: PricingPack[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    priceUnit: "/month",
    description: "Perfect for creators getting started",
    features: [
      "10 AI images/month",
      "2 short videos/month",
      "AI voiceover included",
      "Email support",
    ],
    included: {
      images: 10,
      videos: 2,
      influencerVideos: 0,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 149,
    priceUnit: "/month",
    description: "For brands and serious creators",
    features: [
      "30 AI images/month",
      "6 videos/month",
      "2 AI Influencer videos/month",
      "Pro & Ultra quality",
      "Priority support",
      "Advanced analytics",
    ],
    included: {
      images: 30,
      videos: 6,
      influencerVideos: 2,
    },
    popular: true,
    badge: "POPULAR",
  },
  {
    id: "agency",
    name: "Agency",
    price: 399,
    priceUnit: "/month",
    description: "Unlimited usage for agencies",
    features: [
      "Unlimited images (fair-use)",
      "Unlimited videos (fair-use)",
      "Unlimited AI Influencer",
      "Quality level selection",
      "API access",
      "Dedicated 24/7 support",
      "White-label available",
    ],
    included: {
      images: -1,
      videos: -1,
      influencerVideos: -1,
    },
    badge: "ENTERPRISE",
  },
];

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
