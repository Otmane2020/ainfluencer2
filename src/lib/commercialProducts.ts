// ============================================================
// COMMERCIAL PRODUCTS CONFIGURATION
// Quality-based system - clients see quality levels, not AI model names
// "ClipMotion uses quality levels instead of AI model names.
//  We automatically select the best engine for performance, quality, and cost."
// ============================================================

// ============================================================
// QUALITY LEVELS (Client-Facing)
// ============================================================

export type ImageQuality = "smart" | "high" | "studio";
export type VideoQuality = "smart" | "high" | "cinema";
export type ContentType = "image" | "video";

export interface QualityLevel {
  id: string;
  name: string;
  internalModel: string;
  price: number;
  description: string;
  features: string[];
}

export const IMAGE_QUALITY_LEVELS: QualityLevel[] = [
  {
    id: "smart-image",
    name: "Smart Image",
    internalModel: "pool:smart-image", // Pool: gemini-flash, flux-2-flex
    price: 1.50,
    description: "Fast AI-powered image generation",
    features: ["HD Quality", "Fast generation", "All styles"],
  },
  {
    id: "high-image",
    name: "High Image",
    internalModel: "pool:high-image", // Pool: nano-banana-pro, flux-2-pro
    price: 2.50,
    description: "Premium photorealistic images",
    features: ["Ultra HD 2K", "Photorealistic", "Premium styles"],
  },
  {
    id: "studio-image",
    name: "Studio Image",
    internalModel: "pool:studio-image", // Pool: flux-2-pro, gemini-pro
    price: 4.00,
    description: "Professional studio quality",
    features: ["4K Ultra HD", "Perfect consistency", "Brand identity"],
  },
];

export const VIDEO_QUALITY_LEVELS: QualityLevel[] = [
  {
    id: "smart-video",
    name: "Smart Video",
    internalModel: "pool:smart-video", // Pool: veo-3.1, kling-v2, minimax
    price: 9.90,
    description: "Short videos for your social networks",
    features: ["HD 1080p", "5-10s", "AI Voice included"],
  },
  {
    id: "high-video",
    name: "High Video",
    internalModel: "pool:high-video", // Pool: sora-2, veo-3.1-pro
    price: 12.90,
    description: "Ultra-smooth premium videos",
    features: ["Full HD", "4-12s", "Natural voice", "Smooth motion"],
  },
  {
    id: "cinema-video",
    name: "Cinema Video",
    internalModel: "pool:cinema-video", // Pool: sora-2-pro, veo-ultra
    price: 19.90,
    description: "Professional cinema quality",
    features: ["4K HDR", "5-10s", "Cinematic rendering", "Premium audio"],
  },
];

// ============================================================
// COMETAPI MODEL ROUTING (Internal - Never exposed to clients)
// ============================================================

// ============================================================
// COMETAPI MODEL ROUTING (Internal - Legacy mappings)
// Now handled by model pools in Edge Functions
// ============================================================

export const COMETAPI_MODEL_ROUTING: Record<string, string> = {
  // Images - Now using pool system
  "flux-2-flex": "flux-2-flex",
  "nano-banana-pro": "nano-banana-pro",
  "flux-2-pro": "flux-2-pro",
  "gpt-image": "gpt-image-1",
  "gpt-image-hq": "gpt-image-1",
  // Videos - Now using pool system
  "kling-std": "kling-video",
  "kling-v2": "kling-video",
  "veo-fast": "veo-2",
  "veo-3.1": "veo-2",
  "veo-3.1-pro": "veo-2",
  "veo-3.1-ultra": "veo-2",
  "sora-2": "sora-2",
  "sora-2-pro": "sora-2",
  "veo-pro": "veo-2",
  "minimax-02": "minimax-video-01",
  // Legacy mappings
  "kling-v2-master": "kling-video",
  "minimax-hailuo": "minimax-video-01",
};

// ============================================================
// PLAN ACCESS CONTROL
// ============================================================

export interface PlanQualityAccess {
  image: string[];
  video: string[];
  maxProjects: number;
  maxCampaigns: number;
  autopostImagesPerDay: number;
  autopostVideosPerDay: number;
}

export const PLAN_QUALITY_ACCESS: Record<string, PlanQualityAccess> = {
  starter: {
    image: ["smart-image"],
    video: [], // NO video access
    maxProjects: 3,
    maxCampaigns: 1,
    autopostImagesPerDay: 30,
    autopostVideosPerDay: 0,
  },
  pro: {
    image: ["smart-image", "high-image"],
    video: ["smart-video", "high-video"],
    maxProjects: 10,
    maxCampaigns: -1, // Unlimited
    autopostImagesPerDay: -1, // Unlimited
    autopostVideosPerDay: 1,
  },
  business: {
    image: ["smart-image", "high-image", "studio-image"],
    video: ["smart-video", "high-video", "cinema-video"],
    maxProjects: -1, // Unlimited
    maxCampaigns: -1,
    autopostImagesPerDay: -1,
    autopostVideosPerDay: 3,
  },
};

// ============================================================
// SUBSCRIPTION PLANS
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
    autopostImages: number; // per day (-1 = unlimited)
    autopostVideos: number; // per day (-1 = unlimited)
  };
  imageQualities: string[];
  videoQualities: string[];
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
      "1 campaign max",
      "AutoPost AI Images (up to 30/day)",
      "Smart quality images",
      "Email support",
    ],
    limits: {
      projects: 3,
      campaigns: 1,
      autopostImages: 30,
      autopostVideos: 0,
    },
    imageQualities: ["smart-image"],
    videoQualities: [],
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
      "AutoPost AI Images (unlimited)",
      "AutoPost AI Videos (1/day)",
      "Smart & High quality",
      "Priority support",
    ],
    limits: {
      projects: 10,
      campaigns: -1,
      autopostImages: -1,
      autopostVideos: 1,
    },
    imageQualities: ["smart-image", "high-image"],
    videoQualities: ["smart-video", "high-video"],
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
      "AutoPost AI Images (unlimited)",
      "AutoPost AI Videos (3/day)",
      "All quality levels",
      "Priority queue",
      "API access",
    ],
    limits: {
      projects: -1,
      campaigns: -1,
      autopostImages: -1,
      autopostVideos: 3,
    },
    imageQualities: ["smart-image", "high-image", "studio-image"],
    videoQualities: ["smart-video", "high-video", "cinema-video"],
    badge: "PRO",
  },
];

// ============================================================
// PACKS CONFIGURATION
// ============================================================

export interface Pack {
  id: string;
  name: string;
  packType: "image" | "video";
  quality: string; // Quality ID (e.g., "smart-image", "high-video")
  quantity: number;
  price: number;
  popular?: boolean;
}

export const IMAGE_PACKS: Pack[] = [
  { id: "img-s-smart", name: "Pack S", packType: "image", quality: "smart-image", quantity: 10, price: 15 },
  { id: "img-m-smart", name: "Pack M", packType: "image", quality: "smart-image", quantity: 50, price: 65 },
  { id: "img-l-smart", name: "Pack L", packType: "image", quality: "smart-image", quantity: 200, price: 220 },
  { id: "img-s-high", name: "Pack S High", packType: "image", quality: "high-image", quantity: 10, price: 25 },
  { id: "img-m-high", name: "Pack M High", packType: "image", quality: "high-image", quantity: 50, price: 110 },
  { id: "img-studio", name: "Pack Studio", packType: "image", quality: "studio-image", quantity: 50, price: 180 },
];

export const VIDEO_PACKS: Pack[] = [
  { id: "vid-s-smart", name: "Pack Video S", packType: "video", quality: "smart-video", quantity: 10, price: 99 },
  { id: "vid-m-mixed", name: "Pack Video M", packType: "video", quality: "high-video", quantity: 30, price: 249, popular: true },
  { id: "vid-l-smart", name: "Pack Video L", packType: "video", quality: "smart-video", quantity: 100, price: 699 },
  { id: "vid-cinema", name: "Pack Cinema", packType: "video", quality: "cinema-video", quantity: 20, price: 399 },
];

export const ALL_PACKS = [...IMAGE_PACKS, ...VIDEO_PACKS];

// ============================================================
// CREDIT COSTS (per generation - fallback system)
// ============================================================

export const CREDIT_COSTS: Record<string, number> = {
  // Images (price in credits = price in USD)
  "smart-image": 2,
  "high-image": 3,
  "studio-image": 4,
  
  // Videos
  "smart-video": 10,
  "high-video": 13,
  "cinema-video": 20,
  
  // Legacy product IDs (backwards compatibility)
  "ai-image-smart": 2,
  "ai-image-standard": 2,
  "ai-image-pro": 3,
  "ai-image-studio": 4,
  "ai-reel": 10,
  "ai-reel-pro": 13,
  "ai-cinema": 20,
  "ai-influencer-standard": 39,
  "ai-influencer-pro": 69,
};

// ============================================================
// CREDIT PACKS (for purchase - fallback system)
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
// LEGACY SUPPORT - CommercialProduct interface
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
  internalModels: string[];
  needsVoice: boolean;
  needsAvatar?: boolean;
  supportedDurations?: number[];
  badge?: string;
  popular?: boolean;
}

// Map quality levels to legacy CommercialProduct format
export const COMMERCIAL_PRODUCTS: CommercialProduct[] = [
  // Images
  ...IMAGE_QUALITY_LEVELS.map((q, i) => ({
    id: q.id,
    name: q.name,
    category: "image" as const,
    tier: (i === 0 ? "standard" : i === 1 ? "pro" : "ultra") as CommercialProduct["tier"],
    salePrice: q.price,
    salePriceUnit: "/image",
    description: q.description,
    features: q.features,
    internalModels: [q.internalModel],
    needsVoice: false,
    badge: i === 2 ? "STUDIO" : undefined,
    popular: i === 1,
  })),
  // Videos
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
    supportedDurations: i === 0 ? [5, 10] : i === 1 ? [5, 10] : [4, 8, 12],
    badge: i === 2 ? "CINEMA" : undefined,
    popular: i === 1,
  })),
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

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
  return access?.video.length > 0;
};

export const getAutopostLimit = (planId: string, contentType: "image" | "video"): number => {
  const access = PLAN_QUALITY_ACCESS[planId];
  if (!access) return 0;
  return contentType === "image" ? access.autopostImagesPerDay : access.autopostVideosPerDay;
};

export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find(p => p.id === planId);
};

export const getCreditCost = (qualityId: string): number => {
  return CREDIT_COSTS[qualityId] || 0;
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

export const formatPrice = (price: number, unit: string) => {
  return `$${price}${unit}`;
};

// Legacy compatibility - Import AIModel type for backwards compat
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

// Legacy pricing packs compatibility
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
    images: plan.limits.autopostImages,
    videos: plan.limits.autopostVideos,
    influencerVideos: plan.id === "business" ? 3 : plan.id === "pro" ? 1 : 0,
  },
  popular: plan.popular,
  badge: plan.badge,
}));
