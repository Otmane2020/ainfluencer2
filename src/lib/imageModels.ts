/**
 * Centralized Image Model Configuration
 * All available AI image generation models with pricing and metadata
 */

export type ModelType = "text-to-image" | "image-to-image" | "utility";
export type CostLevel = "ultra-low" | "low" | "medium" | "high";
export type ModelProvider = "kie" | "openai" | "replicate";

export interface ImageModel {
  id: string;
  name: string;
  type: ModelType;
  quality: number; // 1-6 stars
  credits: number;
  costLevel: CostLevel;
  costPerImage?: number; // Dollar cost for display
  usage: string;
  provider: ModelProvider;
  apiEndpoint?: string;
  requiresImage: boolean;
  resolution?: string;
  imagesPerGeneration?: number;
}

// ============================================================
// TEXT → IMAGE MODELS
// ============================================================

const TEXT_TO_IMAGE_MODELS: ImageModel[] = [
  // Budget / Volume
  {
    id: "qwen-zimage",
    name: "Qwen z-image",
    type: "text-to-image",
    quality: 3,
    credits: 0.8,
    costLevel: "ultra-low",
    costPerImage: 0.004,
    usage: "Testing, volume",
    provider: "kie",
    apiEndpoint: "/qwen/z-image",
    requiresImage: false,
  },
  {
    id: "grok-imagine-text",
    name: "Grok Imagine",
    type: "text-to-image",
    quality: 3,
    credits: 4,
    costLevel: "ultra-low",
    costPerImage: 0.0033,
    usage: "Volume generation",
    provider: "kie",
    apiEndpoint: "/grok/imagine",
    requiresImage: false,
    imagesPerGeneration: 6,
  },
  
  // Standard Quality
  {
    id: "flux-kontext-pro",
    name: "Flux1-Kontext Pro",
    type: "text-to-image",
    quality: 4,
    credits: 5,
    costLevel: "low",
    costPerImage: 0.025,
    usage: "Clean generation",
    provider: "kie",
    apiEndpoint: "/flux/kontext",
    requiresImage: false,
  },
  {
    id: "flux-2-pro-1k",
    name: "Flux-2 Pro (1K)",
    type: "text-to-image",
    quality: 4,
    credits: 5,
    costLevel: "low",
    costPerImage: 0.025,
    usage: "Ads, products",
    provider: "kie",
    apiEndpoint: "/flux/2-pro",
    requiresImage: false,
    resolution: "1K",
  },
  {
    id: "openai-4o-image",
    name: "OpenAI 4o Image",
    type: "text-to-image",
    quality: 4,
    credits: 6,
    costLevel: "low",
    costPerImage: 0.03,
    usage: "Polyvalent",
    provider: "openai",
    requiresImage: false,
  },
  
  // Pro Quality
  {
    id: "flux-2-pro-2k",
    name: "Flux-2 Pro (2K)",
    type: "text-to-image",
    quality: 5,
    credits: 7,
    costLevel: "low",
    costPerImage: 0.035,
    usage: "Photorealism",
    provider: "kie",
    apiEndpoint: "/flux/2-pro",
    requiresImage: false,
    resolution: "2K",
  },
  {
    id: "flux-kontext-max",
    name: "Flux1-Kontext Max",
    type: "text-to-image",
    quality: 5,
    credits: 10,
    costLevel: "medium",
    costPerImage: 0.05,
    usage: "Stable quality",
    provider: "kie",
    apiEndpoint: "/flux/kontext",
    requiresImage: false,
  },
  {
    id: "flux-2-flex-1k",
    name: "Flux 2 Flex (1K)",
    type: "text-to-image",
    quality: 4,
    credits: 14,
    costLevel: "medium",
    costPerImage: 0.07,
    usage: "Ads / e-commerce",
    provider: "kie",
    apiEndpoint: "/flux/2-flex",
    requiresImage: false,
    resolution: "1K",
  },
  {
    id: "nano-banana-pro-2k",
    name: "Nano Banana Pro (2K)",
    type: "text-to-image",
    quality: 5,
    credits: 18,
    costLevel: "medium",
    costPerImage: 0.09,
    usage: "Social ads",
    provider: "openai",
    requiresImage: false,
    resolution: "2K",
  },
  
  // Premium Quality
  {
    id: "flux-2-flex-2k",
    name: "Flux 2 Flex (2K)",
    type: "text-to-image",
    quality: 5,
    credits: 24,
    costLevel: "high",
    costPerImage: 0.12,
    usage: "Premium ads",
    provider: "kie",
    apiEndpoint: "/flux/2-flex",
    requiresImage: false,
    resolution: "2K",
  },
  {
    id: "nano-banana-pro-4k",
    name: "Nano Banana Pro (4K)",
    type: "text-to-image",
    quality: 6,
    credits: 24,
    costLevel: "high",
    costPerImage: 0.12,
    usage: "Hero / branding",
    provider: "openai",
    requiresImage: false,
    resolution: "4K",
  },
];

// ============================================================
// IMAGE → IMAGE MODELS (Transformations)
// ============================================================

const IMAGE_TO_IMAGE_MODELS: ImageModel[] = [
  // Utilities
  {
    id: "recraft-crisp-upscale",
    name: "Recraft Crisp Upscale",
    type: "image-to-image",
    quality: 4,
    credits: 0.5,
    costLevel: "ultra-low",
    costPerImage: 0.0025,
    usage: "Upscale",
    provider: "kie",
    apiEndpoint: "/recraft/upscale",
    requiresImage: true,
  },
  {
    id: "recraft-remove-bg",
    name: "Recraft Remove Background",
    type: "image-to-image",
    quality: 4,
    credits: 1,
    costLevel: "ultra-low",
    usage: "E-commerce cutouts",
    provider: "kie",
    apiEndpoint: "/recraft/remove-background",
    requiresImage: true,
  },
  
  // Remix / Transform
  {
    id: "ideogram-v3-remix-turbo",
    name: "Ideogram v3 Remix – TURBO",
    type: "image-to-image",
    quality: 3,
    credits: 3.5,
    costLevel: "low",
    costPerImage: 0.0175,
    usage: "Fast remix",
    provider: "kie",
    apiEndpoint: "/ideogram/v3-remix",
    requiresImage: true,
  },
  {
    id: "grok-imagine-img",
    name: "Grok Imagine (img→img)",
    type: "image-to-image",
    quality: 3,
    credits: 4,
    costLevel: "low",
    costPerImage: 0.01,
    usage: "Fun, remix",
    provider: "kie",
    apiEndpoint: "/grok/imagine",
    requiresImage: true,
    imagesPerGeneration: 2,
  },
  {
    id: "ideogram-v3-remix-balanced",
    name: "Ideogram v3 Remix – BALANCED",
    type: "image-to-image",
    quality: 4,
    credits: 7,
    costLevel: "low",
    costPerImage: 0.035,
    usage: "Good balance",
    provider: "kie",
    apiEndpoint: "/ideogram/v3-remix",
    requiresImage: true,
  },
  
  // Pro Transform
  {
    id: "ideogram-v3-remix-quality",
    name: "Ideogram v3 Remix – QUALITY",
    type: "image-to-image",
    quality: 5,
    credits: 10,
    costLevel: "medium",
    costPerImage: 0.05,
    usage: "Clean visuals",
    provider: "kie",
    apiEndpoint: "/ideogram/v3-remix",
    requiresImage: true,
  },
  {
    id: "ideogram-v3-edit-quality",
    name: "Ideogram v3 Edit – QUALITY",
    type: "image-to-image",
    quality: 5,
    credits: 10,
    costLevel: "medium",
    costPerImage: 0.05,
    usage: "Pro retouching",
    provider: "kie",
    apiEndpoint: "/ideogram/v3-edit",
    requiresImage: true,
  },
  {
    id: "ideogram-v3-reframe",
    name: "Ideogram V3 Reframe",
    type: "image-to-image",
    quality: 5,
    credits: 10,
    costLevel: "medium",
    costPerImage: 0.05,
    usage: "Reframing",
    provider: "kie",
    apiEndpoint: "/ideogram/v3-reframe",
    requiresImage: true,
  },
];

// ============================================================
// COMBINED & EXPORTS
// ============================================================

export const IMAGE_MODELS: ImageModel[] = [
  ...TEXT_TO_IMAGE_MODELS,
  ...IMAGE_TO_IMAGE_MODELS,
];

export const TEXT_MODELS = TEXT_TO_IMAGE_MODELS;
export const TRANSFORM_MODELS = IMAGE_TO_IMAGE_MODELS;

// Get models by type
export const getModelsByType = (type: ModelType): ImageModel[] => {
  return IMAGE_MODELS.filter((m) => m.type === type);
};

// Get model by ID
export const getModelById = (id: string): ImageModel | undefined => {
  return IMAGE_MODELS.find((m) => m.id === id);
};

// Default model
export const DEFAULT_MODEL_ID = "flux-2-pro-1k";

// Get cost level color class
export const getCostLevelColor = (level: CostLevel): string => {
  switch (level) {
    case "ultra-low":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "high":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

// Get cost level label
export const getCostLevelLabel = (level: CostLevel): string => {
  switch (level) {
    case "ultra-low":
      return "Ultra Low";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default:
      return level;
  }
};

// Render star rating
export const renderStars = (quality: number): string => {
  return "⭐".repeat(Math.min(quality, 6));
};

// Credit cost mapping for backend
export const MODEL_CREDIT_COSTS: Record<string, number> = IMAGE_MODELS.reduce(
  (acc, model) => {
    acc[model.id] = model.credits;
    return acc;
  },
  {} as Record<string, number>
);
