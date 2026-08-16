import { motion } from "framer-motion";
import { Video, Image, Music, Volume2, Check, User, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIModel {
  id: string;
  name: string;
  category: "video" | "image" | "music" | "avatar";
  provider: string;
  price: string;
  priceValue: number;
  priceUnit: string;
  originalPrice?: number;
  discount?: number;
  description: string;
  needsVoice: boolean;
  needsAvatar?: boolean;
  quality: "standard" | "pro" | "ultra";
  features?: string[];
  supportedDurations?: number[]; // Durées supportées en secondes
}

export const AI_MODELS: AIModel[] = [
  // ============================================================
  // VIDEO MODELS (CometAPI)
  // ============================================================
  {
    id: "sora-2",
    name: "Sora 2",
    category: "video",
    provider: "OpenAI",
    price: "$0.08",
    priceValue: 0.08,
    priceUnit: "/second",
    description: "Cinematic HD videos with detailed scenes",
    needsVoice: true,
    quality: "standard",
    features: ["720p/1080p", "4-12s", "Audio-visual sync"],
    supportedDurations: [4, 8, 12],
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    category: "video",
    provider: "OpenAI",
    price: "$0.24",
    priceValue: 0.24,
    priceUnit: "/second",
    description: "Maximum quality, ultra-realistic details",
    needsVoice: true,
    quality: "ultra",
    features: ["4K", "4-20s", "HDR", "Premium"],
    supportedDurations: [4, 8, 12, 20],
  },
  {
    id: "veo-3.1",
    name: "Veo 3.1",
    category: "video",
    provider: "Google",
    price: "$0.40",
    priceValue: 0.40,
    priceUnit: "/request",
    description: "Visual realism and motion continuity",
    needsVoice: true,
    quality: "pro",
    features: ["1080p", "5-10s", "Fluid motion"],
    supportedDurations: [5, 10],
  },
  {
    id: "veo-3.1-pro",
    name: "Veo 3.1 Pro",
    category: "video",
    provider: "Google",
    price: "$2.00",
    priceValue: 2.00,
    priceUnit: "/request",
    description: "Cinema quality, perfect continuity",
    needsVoice: true,
    quality: "ultra",
    features: ["4K", "10-30s", "Cinematic", "HDR"],
    supportedDurations: [10, 20, 30],
  },
  {
    id: "kling-v2-master",
    name: "Kling V2 Master",
    category: "video",
    provider: "Kuaishou",
    price: "$0.05",
    priceValue: 0.05,
    priceUnit: "/second",
    originalPrice: 0.08,
    discount: 38,
    description: "Excellent speed and cost balance",
    needsVoice: true,
    quality: "standard",
    features: ["1080p", "5-10s", "Fast"],
    supportedDurations: [5, 10],
  },
  {
    id: "kling-v2.5-turbo",
    name: "Kling V2.5 Turbo",
    category: "video",
    provider: "Kuaishou",
    price: "$0.04",
    priceValue: 0.04,
    priceUnit: "/second",
    originalPrice: 0.06,
    discount: 33,
    description: "Fastest Kling model for quick videos",
    needsVoice: true,
    quality: "standard",
    features: ["720p", "5-10s", "Ultra-fast"],
    supportedDurations: [5, 10],
  },
  {
    id: "minimax-hailuo",
    name: "MiniMax Hailuo",
    category: "video",
    provider: "MiniMax",
    price: "$0.04",
    priceValue: 0.04,
    priceUnit: "/second",
    description: "370M+ videos generated, NCR architecture",
    needsVoice: true,
    quality: "standard",
    features: ["1080p", "4-6s", "Budget-friendly"],
    supportedDurations: [4, 6],
  },
  {
    id: "minimax-hailuo-02",
    name: "MiniMax Hailuo 02",
    category: "video",
    provider: "MiniMax",
    price: "$0.06",
    priceValue: 0.06,
    priceUnit: "/second",
    description: "Latest version with SOTA performance",
    needsVoice: true,
    quality: "pro",
    features: ["1080p", "4-8s", "NCR 3x params"],
    supportedDurations: [4, 6, 8],
  },
  {
    id: "runway-gen4",
    name: "Runway Gen-4",
    category: "video",
    provider: "Runway",
    price: "$0.10",
    priceValue: 0.10,
    priceUnit: "/second",
    description: "Character consistency, latest gen",
    needsVoice: true,
    quality: "pro",
    features: ["1080p", "5-10s", "Consistent"],
    supportedDurations: [5, 10],
  },
  // ============================================================
  // AVATAR MODELS (Lip-Sync)
  // ============================================================
  {
    id: "kling-lip-sync",
    name: "Kling Lip-Sync",
    category: "avatar",
    provider: "Kuaishou",
    price: "$0.10",
    priceValue: 0.10,
    priceUnit: "/second",
    description: "Talking avatar with realistic lip-sync",
    needsVoice: true,
    needsAvatar: true,
    quality: "pro",
    features: ["Lip-sync", "5-10s", "AI Voice"],
    supportedDurations: [5, 10],
  },
  {
    id: "kling-lip-sync-pro",
    name: "Kling Lip-Sync Pro",
    category: "avatar",
    provider: "Kuaishou",
    price: "$0.18",
    priceValue: 0.18,
    priceUnit: "/second",
    originalPrice: 0.25,
    discount: 28,
    description: "Premium quality, natural expressions",
    needsVoice: true,
    needsAvatar: true,
    quality: "ultra",
    features: ["HD Lip-sync", "10-30s", "Multi-angle"],
    supportedDurations: [10, 20, 30],
  },
  {
    id: "hedra-avatar",
    name: "Hedra Avatar",
    category: "avatar",
    provider: "Hedra",
    price: "$0.15",
    priceValue: 0.15,
    priceUnit: "/second",
    description: "Realistic AI avatar, dynamic expressions",
    needsVoice: true,
    needsAvatar: true,
    quality: "pro",
    features: ["1080p", "5-60s", "Multi-styles"],
    supportedDurations: [5, 10, 15, 30, 60],
  },
  {
    id: "sync-labs",
    name: "Sync Labs",
    category: "avatar",
    provider: "Sync Labs",
    price: "$0.08",
    priceValue: 0.08,
    priceUnit: "/second",
    originalPrice: 0.12,
    discount: 33,
    description: "Affordable and fast lip-sync",
    needsVoice: true,
    needsAvatar: true,
    quality: "standard",
    features: ["720p", "5-30s", "Fast render"],
    supportedDurations: [5, 10, 15, 30],
  },
  // ============================================================
  // IMAGE MODELS (CometAPI)
  // ============================================================
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    category: "image",
    provider: "Google",
    price: "$0.03",
    priceValue: 0.03,
    priceUnit: "/image",
    description: "Best Chinese understanding, SOTA effects",
    needsVoice: false,
    quality: "pro",
    features: ["1024x1024", "Fast", "Text rendering"],
  },
  {
    id: "gpt-image-1.5",
    name: "GPT Image 1.5",
    category: "image",
    provider: "OpenAI",
    price: "$0.04",
    priceValue: 0.04,
    priceUnit: "/image",
    description: "Creative images with text in image",
    needsVoice: false,
    quality: "pro",
    features: ["1024x1024", "Creative", "DALL-E"],
  },
  {
    id: "flux-2-pro",
    name: "FLUX 2 Pro",
    category: "image",
    provider: "Black Forest",
    price: "$0.08",
    priceValue: 0.08,
    priceUnit: "/request",
    description: "Premium photorealistic images",
    needsVoice: false,
    quality: "ultra",
    features: ["2048x2048", "Photorealistic", "Best quality"],
  },
  {
    id: "flux-2-flex",
    name: "FLUX 2 Flex",
    category: "image",
    provider: "Black Forest",
    price: "$0.008",
    priceValue: 0.008,
    priceUnit: "/request",
    originalPrice: 0.02,
    discount: 60,
    description: "Ultra-fast and affordable images",
    needsVoice: false,
    quality: "standard",
    features: ["1024x1024", "Ultra-fast", "Low-cost"],
  },
  {
    id: "flux-kontext-pro",
    name: "FLUX Kontext Pro",
    category: "image",
    provider: "Black Forest",
    price: "$0.05",
    priceValue: 0.05,
    priceUnit: "/request",
    description: "Text-driven editing, style consistency",
    needsVoice: false,
    quality: "pro",
    features: ["High-res", "Edit mode", "12B params"],
  },
  {
    id: "kling-image",
    name: "Kling Image",
    category: "image",
    provider: "Kuaishou",
    price: "$0.02",
    priceValue: 0.02,
    priceUnit: "/image",
    originalPrice: 0.03,
    discount: 33,
    description: "Best for Chinese/Asian content",
    needsVoice: false,
    quality: "standard",
    features: ["1024x1024", "Chinese SOTA", "Fast"],
  },
  {
    id: "midjourney-v6",
    name: "Midjourney V6",
    category: "image",
    provider: "Midjourney",
    price: "$0.10",
    priceValue: 0.10,
    priceUnit: "/image",
    description: "Artistic images, inpainting, face swap",
    needsVoice: false,
    quality: "ultra",
    features: ["High-res", "Artistic", "Inpainting"],
  },
  {
    id: "bria-image",
    name: "Bria AI",
    category: "image",
    provider: "Bria",
    price: "$0.02",
    priceValue: 0.02,
    priceUnit: "/image",
    description: "Brand-safe, controllable visuals",
    needsVoice: false,
    quality: "standard",
    features: ["1024x1024", "Brand-safe", "Controllable"],
  },
  // ============================================================
  // AUDIO & VOICE MODELS
  // ============================================================
  {
    id: "elevenlabs-tts",
    name: "ElevenLabs TTS",
    category: "music",
    provider: "ElevenLabs",
    price: "$0.024",
    priceValue: 0.024,
    priceUnit: "/1K chars",
    description: "Ultra-realistic voices, natural emotions",
    needsVoice: false,
    quality: "ultra",
    features: ["29+ voices", "Emotions", "Multi-language"],
  },
  {
    id: "openai-tts",
    name: "OpenAI TTS",
    category: "music",
    provider: "OpenAI",
    price: "$0.012",
    priceValue: 0.012,
    priceUnit: "/1K chars",
    description: "Natural text-to-speech synthesis",
    needsVoice: false,
    quality: "pro",
    features: ["6 voices", "Natural", "Fast"],
  },
  {
    id: "kling-tts",
    name: "Kling TTS",
    category: "music",
    provider: "Kuaishou",
    price: "$0.007",
    priceValue: 0.007,
    priceUnit: "/request",
    originalPrice: 0.01,
    discount: 30,
    description: "Affordable voice synthesis",
    needsVoice: false,
    quality: "standard",
    features: ["Multi-voice", "Fast", "Low-cost"],
  },
  {
    id: "whisper-1",
    name: "Whisper-1",
    category: "music",
    provider: "OpenAI",
    price: "$0.024",
    priceValue: 0.024,
    priceUnit: "/min",
    description: "Speech-to-text transcription",
    needsVoice: false,
    quality: "pro",
    features: ["Transcription", "Multi-language", "Accurate"],
  },
  {
    id: "suno-v5",
    name: "Suno V5",
    category: "music",
    provider: "Suno",
    price: "$0.05",
    priceValue: 0.05,
    priceUnit: "/track",
    description: "Latest Suno for premium music",
    needsVoice: false,
    quality: "ultra",
    features: ["30-120s", "All genres", "Royalty-free"],
  },
  {
    id: "suno-v4.5",
    name: "Suno V4.5+",
    category: "music",
    provider: "Suno",
    price: "$0.03",
    priceValue: 0.03,
    priceUnit: "/track",
    originalPrice: 0.05,
    discount: 40,
    description: "Fast and affordable music",
    needsVoice: false,
    quality: "standard",
    features: ["30-60s", "Popular genres", "Royalty-free"],
  },
];

const getCategoryIcon = (category: AIModel["category"]) => {
  switch (category) {
    case "video":
      return Video;
    case "image":
      return Image;
    case "music":
      return Music;
    case "avatar":
      return User;
  }
};

const getQualityColor = (quality: AIModel["quality"]) => {
  switch (quality) {
    case "standard":
      return "bg-muted text-muted-foreground";
    case "pro":
      return "bg-primary/20 text-primary";
    case "ultra":
      return "bg-accent/20 text-accent";
  }
};

interface ModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  category?: AIModel["category"];
  categories?: AIModel["category"][];
  showVoiceIndicator?: boolean;
}

export const ModelSelector = ({
  selectedModel,
  onModelChange,
  category,
  categories,
  showVoiceIndicator = true,
}: ModelSelectorProps) => {
  // Filter by single category, multiple categories, or show all
  const filteredModels = categories
    ? AI_MODELS.filter((m) => categories.includes(m.category))
    : category
    ? AI_MODELS.filter((m) => m.category === category)
    : AI_MODELS;

  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.category]) acc[model.category] = [];
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  const categoryLabels = {
    video: "🎬 Videos",
    avatar: "👤 Talking Avatars",
    image: "🖼️ Images",
    music: "🎵 Audio & Voice",
  };

  const categoryOrder = ["video", "avatar", "image", "music"];
  const sortedCategories = Object.entries(groupedModels).sort(
    ([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div className="space-y-4">
      {sortedCategories.map(([cat, models]) => (
        <div key={cat}>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
            {categoryLabels[cat as keyof typeof categoryLabels]}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {models.map((model) => {
              const Icon = getCategoryIcon(model.category);
              const isSelected = selectedModel.id === model.id;

              return (
                <motion.button
                  key={model.id}
                  onClick={() => onModelChange(model)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative flex flex-col rounded-xl border-2 p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  {/* Discount badge */}
                  {model.discount && (
                    <div className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-xs">
                      <TrendingDown className="h-2.5 w-2.5" />
                      -{model.discount}%
                    </div>
                  )}

                  {/* Selected indicator */}
                  {isSelected && !model.discount && (
                    <div className="absolute right-2 top-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className={cn("rounded-lg p-1.5", getQualityColor(model.quality))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">{model.name}</span>
                        {model.quality !== "standard" && (
                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            getQualityColor(model.quality)
                          )}>
                            {model.quality}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{model.provider}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
                    {model.description}
                  </p>

                  {/* Features */}
                  {model.features && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {model.features.slice(0, 3).map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Voice & Avatar indicators (prices hidden) */}
                  <div className="mt-auto flex items-center justify-end gap-1">
                    {model.needsAvatar && (
                      <div className="flex items-center gap-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        <User className="h-2.5 w-2.5" />
                        Avatar
                      </div>
                    )}
                    {showVoiceIndicator && (
                      <div className={cn(
                        "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        model.needsVoice
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Volume2 className="h-2.5 w-2.5" />
                        {model.needsVoice ? "Voice" : "No voice"}
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModelSelector;
