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
    description: "Sora 2 • Nano Banana",
    icon: "⚡",
    gradient: "from-slate-500 to-zinc-600",
    costs: {
      image: 1,
      video: 4,
    },
    models: {
      image: "nano-banana",
      video: "sora-2",
    },
  },
  pro: {
    id: "pro",
    name: "Medium",
    description: "Sora 2 Pro • GPT Image",
    icon: "✨",
    gradient: "from-blue-500 to-indigo-600",
    costs: {
      image: 1,
      video: 4,
    },
    models: {
      image: "gpt-image",
      video: "sora-2-pro",
    },
  },
  cinema: {
    id: "cinema",
    name: "High",
    description: "Sora 2 Pro • GPT Image",
    icon: "🎬",
    gradient: "from-amber-500 to-orange-600",
    costs: {
      image: 1,
      video: 4,
    },
    models: {
      image: "gpt-image",
      video: "sora-2-pro",
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
  // All tiers: 1 credit per image, 4 credits per video
  "standard-image": 1,
  "standard-video": 4,
  "pro-image": 1,
  "pro-video": 4,
  "cinema-image": 1,
  "cinema-video": 4,
  // Legacy mappings
  "smart-image": 1,
  "high-image": 1,
  "studio-image": 1,
  "smart-video": 4,
  "high-video": 4,
  "cinema-video-legacy": 4,
  "ai-image-smart": 1,
  "ai-image-standard": 1,
  "ai-image-pro": 1,
  "ai-image-studio": 1,
  "ai-cinema": 4,
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
  credits: number;
  creditValue: number; // USD value per credit
  features: string[];
  limits: {
    projects: number;
    campaigns: number;
  };
  popular?: boolean;
  badge?: string;
}

export const CREDIT_UNIT_PRICE = 0.65; // $0.65 per credit

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    priceUnit: "/month",
    description: "Perfect for creators getting started",
    credits: 30,
    creditValue: CREDIT_UNIT_PRICE,
    features: [
      "30 credits included",
      "1 credit per image · 4 per video",
      "3 projects",
      "1 campaign",
      "AutoPost scheduling",
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
    credits: 80,
    creditValue: CREDIT_UNIT_PRICE,
    features: [
      "80 credits included",
      "1 credit per image · 4 per video",
      "10 projects",
      "Unlimited campaigns",
      "AutoPost scheduling",
      "Priority support",
      "Analytics dashboard",
    ],
    limits: {
      projects: 10,
      campaigns: -1,
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
    credits: 200,
    creditValue: CREDIT_UNIT_PRICE,
    features: [
      "200 credits included",
      "1 credit per image · 4 per video",
      "Unlimited projects",
      "Unlimited campaigns",
      "AutoPost scheduling",
      "Priority queue",
      "API access",
      "Dedicated support",
    ],
    limits: {
      projects: -1,
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
    id: "nano-banana",
    name: "Nano Banana",
    internalModel: "google/gemini-2.5-flash-image",
    price: 1.00,
    description: "Fast AI images via Gemini Flash",
    features: ["1024x1024", "Fast", "Gemini"],
  },
  {
    id: "flux-schnell",
    name: "FLUX Schnell",
    internalModel: "black-forest-labs/flux-schnell",
    price: 1.00,
    description: "Ultra-fast FLUX for quick iterations",
    features: ["1024x1024", "Ultra Fast", "Replicate"],
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    internalModel: "google/gemini-3-pro-image-preview",
    price: 3.00,
    description: "Premium Gemini image generation",
    features: ["1024x1024", "High quality", "Gemini Pro"],
  },
  {
    id: "flux-dev",
    name: "FLUX Dev",
    internalModel: "black-forest-labs/flux-dev",
    price: 3.00,
    description: "High quality FLUX with great value",
    features: ["1024x1024", "High Quality", "Replicate"],
  },
  {
    id: "gpt-image",
    name: "GPT Image",
    internalModel: "openai/gpt-image-1",
    price: 4.00,
    description: "Premium OpenAI image generation",
    features: ["1024x1024", "Cinema", "OpenAI"],
  },
  {
    id: "flux-pro",
    name: "FLUX Pro",
    internalModel: "black-forest-labs/flux-pro",
    price: 5.00,
    description: "Top-tier FLUX for premium visuals",
    features: ["1024x1024", "Cinema", "Replicate"],
  },
];

// ============================================================
// VIDEO QUALITY LEVELS - Duration-Based Pricing Strategy
// 
// STRATEGY:
// • Social Boost   → 4-6s (TikTok/Reels/Shorts optimal)
// • Pro Engagement → 8-12s (Ads, professional content)
// • Cinema Premium → 12-20s (Brand films, high-end)
// 
// Cost scales with duration (GPU time + complexity)
// ============================================================

export interface VideoDurationTier {
  id: string;
  label: string;
  minDuration: number;
  maxDuration: number;
  durations: number[];
  creditMultiplier: number;
  description: string;
}

export const VIDEO_DURATION_TIERS: VideoDurationTier[] = [
  {
    id: "social",
    label: "Social Boost",
    minDuration: 4,
    maxDuration: 6,
    durations: [4, 5, 6],
    creditMultiplier: 1,
    description: "Optimal for TikTok, Reels, Shorts",
  },
  {
    id: "pro",
    label: "Pro Engagement",
    minDuration: 8,
    maxDuration: 12,
    durations: [8, 10, 12],
    creditMultiplier: 2,
    description: "Perfect for ads and professional content",
  },
  {
    id: "cinema",
    label: "Cinema Premium",
    minDuration: 12,
    maxDuration: 20,
    durations: [12, 15, 20],
    creditMultiplier: 4,
    description: "Brand films, high-end productions",
  },
];

// ============================================================
// VIDEO RESOLUTION OPTIONS (Sora 2)
// ============================================================

export interface VideoResolution {
  id: string;
  label: string;
  width: number;
  height: number;
  pricePerSecond: number; // USD per second
  description: string;
}

export const VIDEO_RESOLUTIONS: Record<string, VideoResolution[]> = {
  "sora-2": [
    {
      id: "720p",
      label: "720p",
      width: 1280,
      height: 720,
      pricePerSecond: 0.10,
      description: "Standard HD",
    },
    {
      id: "720p-vertical",
      label: "720p Vertical",
      width: 720,
      height: 1280,
      pricePerSecond: 0.10,
      description: "Standard HD (9:16)",
    },
  ],
  "sora-2-pro": [
    {
      id: "720p",
      label: "720p",
      width: 1280,
      height: 720,
      pricePerSecond: 0.30,
      description: "HD Quality",
    },
    {
      id: "720p-vertical",
      label: "720p Vertical",
      width: 720,
      height: 1280,
      pricePerSecond: 0.30,
      description: "HD (9:16)",
    },
    {
      id: "1080p",
      label: "1080p HD",
      width: 1024,
      height: 1792,
      pricePerSecond: 0.50,
      description: "Full HD Premium",
    },
  ],
};

// Get resolution options for a model
export const getResolutionsForModel = (modelId: string): VideoResolution[] => {
  return VIDEO_RESOLUTIONS[modelId] || VIDEO_RESOLUTIONS["sora-2"];
};

// Get default resolution for a model
export const getDefaultResolution = (modelId: string): VideoResolution => {
  const resolutions = getResolutionsForModel(modelId);
  return resolutions[0];
};

export const VIDEO_QUALITY_LEVELS: QualityLevel[] = [
  {
    id: "standard-video",
    name: "Sora 2",
    internalModel: "sora-2",
    price: 5.00, // Base price for 4-6s at 720p
    description: "OpenAI HD videos • $0.10/s",
    features: ["720p", "Up to 12s", "$0.10/sec"],
    supportedDurations: [4, 5, 6, 8, 10, 12],
  },
  {
    id: "pro-video",
    name: "Sora 2 Pro",
    internalModel: "sora-2-pro",
    price: 10.00, // Base price for 4-6s at 720p
    description: "OpenAI max quality • $0.30-0.50/s",
    features: ["Up to 1080p", "Up to 20s", "$0.30-0.50/sec"],
    supportedDurations: [4, 5, 6, 8, 10, 12, 15, 20],
  },
];

// ============================================================
// PRICING CALCULATION (based on actual OpenAI rates)
// ============================================================

// Calculate credit cost based on duration and resolution
export const getVideoCreditCost = (
  modelId: string,
  duration: number,
  resolutionId?: string
): number => {
  const resolutions = getResolutionsForModel(modelId);
  const resolution = resolutions.find(r => r.id === resolutionId) || resolutions[0];
  
  // Cost in USD = price per second × duration
  const costUSD = resolution.pricePerSecond * duration;
  
  // Convert to credits (1 credit = ~$0.10)
  // Round up to nearest integer
  return Math.ceil(costUSD * 10);
};

// Get price estimate in USD
export const getVideoPriceUSD = (
  modelId: string,
  duration: number,
  resolutionId?: string
): number => {
  const resolutions = getResolutionsForModel(modelId);
  const resolution = resolutions.find(r => r.id === resolutionId) || resolutions[0];
  return resolution.pricePerSecond * duration;
};

// Format price for display
export const formatVideoPrice = (
  modelId: string,
  duration: number,
  resolutionId?: string
): string => {
  const priceUSD = getVideoPriceUSD(modelId, duration, resolutionId);
  return `$${priceUSD.toFixed(2)}`;
};

// Get duration tier for a given duration
export const getDurationTier = (duration: number): VideoDurationTier => {
  if (duration <= 6) return VIDEO_DURATION_TIERS[0];
  if (duration <= 12) return VIDEO_DURATION_TIERS[1];
  return VIDEO_DURATION_TIERS[2];
};

// Get all valid durations for a model
export const getValidDurations = (modelId: string): number[] => {
  const model = VIDEO_QUALITY_LEVELS.find(m => m.internalModel === modelId);
  return model?.supportedDurations || [4, 8, 12];
};

// Clamp to nearest valid duration
export const clampToValidDuration = (duration: number, modelId: string): number => {
  const validDurations = getValidDurations(modelId);
  
  // Find closest valid duration
  let closest = validDurations[0];
  let minDiff = Math.abs(duration - closest);
  
  for (const valid of validDurations) {
    const diff = Math.abs(duration - valid);
    if (diff < minDiff) {
      minDiff = diff;
      closest = valid;
    }
  }
  
  return closest;
};

export const COMETAPI_MODEL_ROUTING: Record<string, string> = {
  // Image models
  "flux-2-flex": "flux-2-flex",
  "nano-banana-pro": "nano-banana-pro",
  "flux-2-pro": "flux-2-pro",
  "gpt-image-1.5": "gpt-image-1.5",
  "midjourney-v6": "midjourney-v6",
  "kling-image": "kling-image",
  "bria-image": "bria-image",
  "flux-kontext-pro": "flux-kontext-pro",
  // Video models
  "kling-v2.5-turbo": "kling-v2.5-turbo",
  "kling-v2-master": "kling-v2-master",
  "sora-2": "sora-2",
  "sora-2-pro": "sora-2-pro",
  "veo-3.1": "veo-3.1",
  "veo-3.1-pro": "veo-3.1-pro",
  "minimax-hailuo": "minimax-hailuo",
  "minimax-hailuo-02": "minimax-hailuo-02",
  "runway-gen4": "runway-gen4",
  // Legacy mappings
  "sora": "sora-2",
  "nano-banana": "nano-banana-pro",
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
