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
  salePrice: number; // Prix de vente en €
  salePriceUnit: string;
  description: string;
  features: string[];
  internalModels: string[]; // IDs des modèles API (NON AFFICHÉ)
  needsVoice: boolean;
  needsAvatar?: boolean;
  supportedDurations?: number[];
  badge?: string;
  popular?: boolean;
}

// ============================================================
// COMMERCIAL PRODUCTS - CLIENT FACING
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
    description: "Images de qualité pour vos posts quotidiens",
    features: ["Qualité HD", "Génération rapide", "Tous styles"],
    internalModels: ["flux-2-flex", "kling-image"],
    needsVoice: false,
  },
  {
    id: "ai-image-pro",
    name: "AI Image Pro",
    category: "image",
    tier: "pro",
    salePrice: 5,
    salePriceUnit: "/image",
    description: "Images premium photoréalistes",
    features: ["Ultra HD 2K", "Photoréaliste", "Styles premium"],
    internalModels: ["flux-2-pro", "nano-banana-pro"],
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
    description: "Qualité studio professionnelle",
    features: ["4K Ultra HD", "Cohérence parfaite", "Brand identity"],
    internalModels: ["gpt-image-1.5"],
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
    salePriceUnit: "/vidéo",
    description: "Vidéos courtes pour vos réseaux sociaux",
    features: ["HD 1080p", "4-10s", "Voix IA incluse"],
    internalModels: ["kling-v2-master", "minimax-hailuo"],
    needsVoice: true,
    supportedDurations: [4, 6, 10],
  },
  {
    id: "ai-reel-pro",
    name: "AI Reel Pro",
    category: "video",
    tier: "pro",
    salePrice: 29,
    salePriceUnit: "/vidéo",
    description: "Vidéos premium ultra-fluides",
    features: ["Full HD", "4-12s", "Voix naturelle", "Motion fluide"],
    internalModels: ["sora-2", "sora-2-pro"],
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
    salePriceUnit: "/vidéo",
    description: "Qualité cinéma professionnelle",
    features: ["4K HDR", "10-30s", "Rendu cinématique", "Son premium"],
    internalModels: ["veo-3.1", "veo-3.1-pro"],
    needsVoice: true,
    supportedDurations: [10, 20, 30],
    badge: "CINEMA",
  },

  // === AVATARS PARLANTS (AI INFLUENCER) ===
  {
    id: "ai-influencer-standard",
    name: "AI Influencer",
    category: "avatar",
    tier: "pro",
    salePrice: 39,
    salePriceUnit: "/vidéo",
    description: "Avatar parlant réaliste pour vos contenus",
    features: ["Lip-sync HD", "5-15s", "Voix naturelle", "Expressions"],
    internalModels: ["kling-lip-sync", "sync-labs"],
    needsVoice: true,
    needsAvatar: true,
    supportedDurations: [5, 10, 15],
  },
  {
    id: "ai-influencer-pro",
    name: "AI Influencer Pro",
    category: "avatar",
    tier: "ultra",
    salePrice: 69,
    salePriceUnit: "/vidéo",
    description: "Avatar premium avec émotions naturelles",
    features: ["Ultra HD", "10-60s", "Multi-expressions", "Storytelling"],
    internalModels: ["kling-lip-sync-pro", "hedra-avatar"],
    needsVoice: true,
    needsAvatar: true,
    supportedDurations: [10, 20, 30, 60],
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
    priceUnit: "/mois",
    description: "Parfait pour les créateurs débutants",
    features: [
      "10 images IA / mois",
      "2 vidéos courtes / mois",
      "Voix IA incluse",
      "Support email",
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
    priceUnit: "/mois",
    description: "Pour les marques et créateurs sérieux",
    features: [
      "30 images IA / mois",
      "6 vidéos / mois",
      "2 vidéos AI Influencer / mois",
      "Qualité Pro & Ultra",
      "Support prioritaire",
      "Analytics avancés",
    ],
    included: {
      images: 30,
      videos: 6,
      influencerVideos: 2,
    },
    popular: true,
    badge: "POPULAIRE",
  },
  {
    id: "agency",
    name: "Agency",
    price: 399,
    priceUnit: "/mois",
    description: "Usage illimité pour les agences",
    features: [
      "Images illimitées (fair-use)",
      "Vidéos illimitées (fair-use)",
      "AI Influencer illimité",
      "Choix du niveau qualité",
      "API access",
      "Support dédié 24/7",
      "White-label disponible",
    ],
    included: {
      images: -1, // -1 = unlimited
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
      return "🎬 Vidéos";
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
