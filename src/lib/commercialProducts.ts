// ============================================================
// COMMERCIAL PRODUCTS CONFIGURATION
// Quality-based system - clients see quality levels, not AI model names
// NEW: Subscription = Access only | Credits = All generation
// ============================================================

// ============================================================
// QUALITY TIERS (Client-Facing)
// ============================================================

export type QualityTier = "standard" | "pro" | "cinema";
export type ContentType = "image" | "video";

export interface QualityTierConfig {
  id: QualityTier;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  costs: {
    image: number;
    video: number;
  };
  models: {
    image: string;
    video: string;
  };
}

export const QUALITY_TIERS: Record<QualityTier, QualityTierConfig> = {
  standard: {
    id: "standard",
    name: "Fast",
    description: "Sora • Quick (10s max)",
    icon: "⚡",
    gradient: "from-slate-500 to-zinc-600",
    costs: {
      image: 1,
      video: 5,
    },
    models: {
      image: "gemini-flash-image",
      video: "sora",
    },
  },
  pro: {
    id: "pro",
    name: "Medium",
    description: "Sora 2 • HD (20s max)",
    icon: "✨",
    gradient: "from-blue-500 to-indigo-600",
    costs: {
      image: 3,
      video: 10,
    },
    models: {
      image: "nano-banana-image",
      video: "sora-2",
    },
  },
  cinema: {
    id: "cinema",
    name: "High",
    description: "Nano Banana • Premium",
    icon: "🎬",
    gradient: "from-amber-500 to-orange-600",
    costs: {
      image: 5,
      video: 20,
    },
    models: {
      image: "gemini-pro-image",
      video: "nano-banana",
    },
  },
};

// ============================================================
// CREDIT COSTS - Quick accessors
// ============================================================

export const getCreditCost = (contentType: ContentType, quality: QualityTier): number => {
  return QUALITY_TIERS[quality]?.costs[contentType] || 1;
};

export const getModelForQuality = (contentType: ContentType, quality: QualityTier): string => {
  return QUALITY_TIERS[quality]?.models[contentType] || QUALITY_TIERS.standard.models[contentType];
};

// Legacy CREDIT_COSTS for backwards compatibility
export const CREDIT_COSTS: Record<string, number> = {
  // Standard tier
  "standard-image": 1,
  "standard-video": 5,
  // Pro tier
  "pro-image": 3,
  "pro-video": 10,
  // Cinema tier
  "cinema-image": 5,
  "cinema-video": 20,
  // Legacy mappings
  "smart-image": 1,
  "high-image": 3,
  "studio-image": 5,
  "smart-video": 5,
  "high-video": 10,
  "cinema-video-legacy": 20,
  "ai-image-smart": 1,
  "ai-image-standard": 1,
  "ai-image-pro": 3,
  "ai-image-studio": 5,
  "ai-cinema": 20,
  "ai-influencer-standard": 39,
  "ai-influencer-pro": 69,
};

// ============================================================
// SUBSCRIPTION PLANS - Access Only (No generation included)
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
    campaigns: number;
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
      "1 campaign",
      "AutoPost scheduling",
      "All quality tiers",
      "Email support",
    ],
    limits: {
      projects: 3,
      campaigns: 1,
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
      "Unlimited campaigns",
      "AutoPost scheduling",
      "All quality tiers",
      "Priority support",
      "Analytics dashboard",
    ],
    limits: {
      projects: 10,
      campaigns: -1, // Unlimited
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
      "Unlimited campaigns",
      "AutoPost scheduling",
      "All quality tiers",
      "Priority queue",
      "API access",
      "Dedicated support",
    ],
    limits: {
      projects: -1, // Unlimited
      campaigns: -1,
    },
    badge: "PRO",
  },
];

// ============================================================
// CREDIT PACKS - For purchase
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
// CAMPAIGN COST CALCULATOR
// ============================================================

export interface CampaignCostConfig {
  videosPerDay: number;
  imagesPerDay: number;
  videoQuality: QualityTier;
  imageQuality: QualityTier;
  campaignDays: number;
}

export const calculateCampaignCost = (config: CampaignCostConfig): number => {
  const videoCostPerDay = config.videosPerDay * getCreditCost("video", config.videoQuality);
  const imageCostPerDay = config.imagesPerDay * getCreditCost("image", config.imageQuality);
  const dailyCost = videoCostPerDay + imageCostPerDay;
  return dailyCost * config.campaignDays;
};

export const getCampaignCostBreakdown = (config: CampaignCostConfig) => {
  const videoUnitCost = getCreditCost("video", config.videoQuality);
  const imageUnitCost = getCreditCost("image", config.imageQuality);
  
  const totalVideos = config.videosPerDay * config.campaignDays;
  const totalImages = config.imagesPerDay * config.campaignDays;
  
  const videoCost = totalVideos * videoUnitCost;
  const imageCost = totalImages * imageUnitCost;
  
  return {
    totalVideos,
    totalImages,
    videoUnitCost,
    imageUnitCost,
    videoCost,
    imageCost,
    totalCost: videoCost + imageCost,
  };
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find(p => p.id === planId);
};

export const getQualityTierById = (quality: QualityTier): QualityTierConfig => {
  return QUALITY_TIERS[quality] || QUALITY_TIERS.standard;
};

export const formatPrice = (price: number, unit: string = "") => {
  return `$${price}${unit}`;
};

// ============================================================
// PLAN ACCESS CONTROL - Subscription grants feature access
// ============================================================

export interface PlanAccess {
  maxProjects: number;
  maxCampaigns: number;
  canAutopost: boolean;
  hasPriorityQueue: boolean;
  hasApiAccess: boolean;
}

export const PLAN_ACCESS: Record<string, PlanAccess> = {
  starter: {
    maxProjects: 3,
    maxCampaigns: 1,
    canAutopost: true,
    hasPriorityQueue: false,
    hasApiAccess: false,
  },
  pro: {
    maxProjects: 10,
    maxCampaigns: -1,
    canAutopost: true,
    hasPriorityQueue: false,
    hasApiAccess: false,
  },
  business: {
    maxProjects: -1,
    maxCampaigns: -1,
    canAutopost: true,
    hasPriorityQueue: true,
    hasApiAccess: true,
  },
};

export const getPlanAccess = (planId: string): PlanAccess => {
  return PLAN_ACCESS[planId] || {
    maxProjects: 0,
    maxCampaigns: 0,
    canAutopost: false,
    hasPriorityQueue: false,
    hasApiAccess: false,
  };
};

// ============================================================
// LEGACY COMPATIBILITY
// ============================================================

// Legacy quality access - now all tiers available to all subscribers
export const PLAN_QUALITY_ACCESS: Record<string, { image: string[]; video: string[]; maxProjects: number; maxCampaigns: number; autopostImagesPerDay: number; autopostVideosPerDay: number }> = {
  starter: {
    image: ["standard-image", "pro-image", "cinema-image"],
    video: ["standard-video", "pro-video", "cinema-video"],
    maxProjects: 3,
    maxCampaigns: 1,
    autopostImagesPerDay: -1, // Unlimited (credits-based)
    autopostVideosPerDay: -1, // Unlimited (credits-based)
  },
  pro: {
    image: ["standard-image", "pro-image", "cinema-image"],
    video: ["standard-video", "pro-video", "cinema-video"],
    maxProjects: 10,
    maxCampaigns: -1,
    autopostImagesPerDay: -1,
    autopostVideosPerDay: -1,
  },
  business: {
    image: ["standard-image", "pro-image", "cinema-image"],
    video: ["standard-video", "pro-video", "cinema-video"],
    maxProjects: -1,
    maxCampaigns: -1,
    autopostImagesPerDay: -1,
    autopostVideosPerDay: -1,
  },
};

// Legacy types for backward compatibility
export type ImageQuality = "smart" | "high" | "studio";
export type VideoQuality = "smart" | "high" | "cinema";

export interface QualityLevel {
  id: string;
  name: string;
  internalModel: string;
  price: number;
  description: string;
  features: string[];
  supportedDurations?: number[];
}

export const IMAGE_QUALITY_LEVELS: QualityLevel[] = [
  {
    id: "fast-image",
    name: "Fast Image",
    internalModel: "gemini-flash-image",
    price: 1.00,
    description: "Quick AI image generation",
    features: ["HD Quality", "Fast generation", "All styles"],
  },
  {
    id: "medium-image",
    name: "Medium Image",
    internalModel: "nano-banana-image",
    price: 3.00,
    description: "Balanced quality and speed",
    features: ["Ultra HD", "Enhanced details", "All styles"],
  },
  {
    id: "high-image",
    name: "High Image",
    internalModel: "gemini-pro-image",
    price: 5.00,
    description: "Premium AI image generation",
    features: ["4K Quality", "Photorealistic", "Premium rendering"],
  },
];

export const VIDEO_QUALITY_LEVELS: QualityLevel[] = [
  {
    id: "fast-video",
    name: "Fast Video",
    internalModel: "sora",
    price: 5.00,
    description: "Quick AI video generation",
    features: ["HD 720p", "10s max", "AI Voice included"],
    supportedDurations: [4, 5, 8, 10],
  },
  {
    id: "medium-video",
    name: "Medium Video",
    internalModel: "sora-2",
    price: 10.00,
    description: "Professional AI video generation",
    features: ["Full HD 1080p", "20s max", "AI Voice included"],
    supportedDurations: [4, 5, 8, 10, 12, 15, 20],
  },
  {
    id: "high-video",
    name: "High Video",
    internalModel: "nano-banana",
    price: 20.00,
    description: "Premium cinematic AI video",
    features: ["Full HD 1080p", "30s max", "Premium quality"],
    supportedDurations: [5, 10, 15, 20, 30],
  },
];

export const COMETAPI_MODEL_ROUTING: Record<string, string> = {
  "flux-2-flex": "flux-2-flex",
  "nano-banana-pro": "nano-banana-pro",
  "flux-2-pro": "flux-2-pro",
  "gpt-image": "gpt-image-1",
  "gpt-image-hq": "gpt-image-1",
  // Video models
  "sora": "sora",
  "sora-2": "sora-2",
  "nano-banana": "nano-banana",
  // Legacy
  "kling-std": "kling-video",
  "kling-v2": "kling-video",
};

export interface CommercialProduct {
  id: string;
  name: string;
  category: "image" | "video" | "avatar";
  tier: "standard" | "pro" | "ultra" | "cinema";
  salePrice: number;
  salePriceUnit: string;
  description: string;
  features: string[];
  internalModels: string[];
  needsVoice: boolean;
  needsAvatar?: boolean;
  supportedDurations?: number[];
  badge?: string;
  popular?: boolean;
}

export const COMMERCIAL_PRODUCTS: CommercialProduct[] = [
  // Images - 3 tiers
  ...IMAGE_QUALITY_LEVELS.map((q, i) => ({
    id: q.id,
    name: q.name,
    category: "image" as const,
    tier: (i === 0 ? "standard" : i === 1 ? "pro" : "cinema") as CommercialProduct["tier"],
    salePrice: q.price,
    salePriceUnit: "/image",
    description: q.description,
    features: q.features,
    internalModels: [q.internalModel],
    needsVoice: false,
    popular: i === 1, // Medium is popular
  })),
  // Videos - 3 tiers
  ...VIDEO_QUALITY_LEVELS.map((q, i) => ({
    id: q.id,
    name: q.name,
    category: "video" as const,
    tier: (i === 0 ? "standard" : i === 1 ? "pro" : "cinema") as CommercialProduct["tier"],
    salePrice: q.price,
    salePriceUnit: "/video",
    description: q.description,
    features: q.features,
    internalModels: [q.internalModel],
    needsVoice: true,
    supportedDurations: q.supportedDurations || [5, 10],
    popular: i === 1, // Medium is popular
  })),
];

export const getQualityById = (qualityId: string): QualityLevel | undefined => {
  return [...IMAGE_QUALITY_LEVELS, ...VIDEO_QUALITY_LEVELS].find(q => q.id === qualityId);
};

export const getInternalModel = (qualityId: string): string | undefined => {
  const quality = getQualityById(qualityId);
  return quality?.internalModel;
};

export const getCometApiModel = (internalModel: string): string => {
  return COMETAPI_MODEL_ROUTING[internalModel] || internalModel;
};

export const canAccessQuality = (planId: string, qualityId: string): boolean => {
  const access = PLAN_QUALITY_ACCESS[planId];
  if (!access) return false;
  return access.image.includes(qualityId) || access.video.includes(qualityId);
};

export const canAccessVideo = (planId: string): boolean => {
  const access = PLAN_QUALITY_ACCESS[planId];
  return (access?.video.length || 0) > 0;
};

export const getAutopostLimit = (planId: string, contentType: "image" | "video"): number => {
  const access = PLAN_QUALITY_ACCESS[planId];
  if (!access) return 0;
  return contentType === "image" ? access.autopostImagesPerDay : access.autopostVideosPerDay;
};

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

import { AI_MODELS, type AIModel } from "@/components/ModelSelector";

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

export const getCommercialName = (internalModelId: string): string => {
  const product = COMMERCIAL_PRODUCTS.find((p) =>
    p.internalModels.includes(internalModelId)
  );
  return product?.name || "AI Generation";
};

// Legacy packs
export interface Pack {
  id: string;
  name: string;
  packType: "image" | "video";
  quality: string;
  quantity: number;
  price: number;
  popular?: boolean;
}

export const IMAGE_PACKS: Pack[] = [];
export const VIDEO_PACKS: Pack[] = [];
export const ALL_PACKS = [...IMAGE_PACKS, ...VIDEO_PACKS];

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

export const PRICING_PACKS: PricingPack[] = PRICING_PLANS.map(plan => ({
  id: plan.id,
  name: plan.name,
  price: plan.price,
  priceUnit: plan.priceUnit,
  description: plan.description,
  features: plan.features,
  included: {
    images: -1, // Credits-based
    videos: -1,
    influencerVideos: 0,
  },
  popular: plan.popular,
  badge: plan.badge,
}));
