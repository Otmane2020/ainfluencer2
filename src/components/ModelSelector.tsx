import { motion } from "framer-motion";
import { Video, Image, Music, Volume2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIModel {
  id: string;
  name: string;
  category: "video" | "image" | "music";
  provider: string;
  price: string;
  priceValue: number;
  priceUnit: string;
  description: string;
  needsVoice: boolean;
  quality: "standard" | "pro" | "ultra";
  features?: string[];
}

export const AI_MODELS: AIModel[] = [
  // Video Models
  {
    id: "sora-2",
    name: "Sora 2",
    category: "video",
    provider: "OpenAI",
    price: "$0.08",
    priceValue: 0.08,
    priceUnit: "/seconde",
    description: "Vidéos cinématographiques HD avec voix",
    needsVoice: true,
    quality: "standard",
    features: ["720p/1080p", "4-12s", "Voix IA incluse"],
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    category: "video",
    provider: "OpenAI",
    price: "$0.24",
    priceValue: 0.24,
    priceUnit: "/seconde",
    description: "Qualité maximale, détails ultra-réalistes",
    needsVoice: true,
    quality: "pro",
    features: ["4K", "4-20s", "Voix IA incluse", "HDR"],
  },
  {
    id: "veo-3.1",
    name: "Veo 3.1",
    category: "video",
    provider: "Google",
    price: "$0.40",
    priceValue: 0.40,
    priceUnit: "/requête",
    description: "Vidéos réalistes avec physique avancée",
    needsVoice: true,
    quality: "standard",
    features: ["1080p", "5-10s", "Motion fluide"],
  },
  {
    id: "veo-3.1-pro",
    name: "Veo 3.1 Pro",
    category: "video",
    provider: "Google",
    price: "$2.00",
    priceValue: 2.00,
    priceUnit: "/requête",
    description: "Qualité cinéma, continuité parfaite",
    needsVoice: true,
    quality: "ultra",
    features: ["4K", "10-30s", "Cinematic", "HDR"],
  },
  {
    id: "kling-v2-master",
    name: "Kling V2 Master",
    category: "video",
    provider: "Kuaishou",
    price: "$0.05",
    priceValue: 0.05,
    priceUnit: "/seconde",
    description: "Excellent rapport qualité-prix",
    needsVoice: true,
    quality: "standard",
    features: ["1080p", "5-10s", "Fast"],
  },
  {
    id: "kling-lip-sync",
    name: "Kling Lip-Sync",
    category: "video",
    provider: "Kuaishou",
    price: "$0.10",
    priceValue: 0.10,
    priceUnit: "/seconde",
    description: "Avatar parlant avec sync labiale",
    needsVoice: true,
    quality: "pro",
    features: ["Lip-sync", "5-10s", "Avatar animé"],
  },
  {
    id: "minimax-hailuo",
    name: "MiniMax Hailuo",
    category: "video",
    provider: "MiniMax",
    price: "$0.04",
    priceValue: 0.04,
    priceUnit: "/seconde",
    description: "Vidéos courtes rapides et économiques",
    needsVoice: true,
    quality: "standard",
    features: ["720p", "4-6s", "Budget-friendly"],
  },
  // Image Models
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    category: "image",
    provider: "Google",
    price: "$0.03",
    priceValue: 0.03,
    priceUnit: "/image",
    description: "Images haute qualité pour posts",
    needsVoice: false,
    quality: "pro",
    features: ["1024x1024", "Rapide", "Édition incluse"],
  },
  {
    id: "flux-2-pro",
    name: "FLUX 2 Pro",
    category: "image",
    provider: "Black Forest",
    price: "$0.08",
    priceValue: 0.08,
    priceUnit: "/image",
    description: "Images photoréalistes premium",
    needsVoice: false,
    quality: "pro",
    features: ["2048x2048", "Photoréaliste", "Styles variés"],
  },
  {
    id: "flux-2-flex",
    name: "FLUX 2 Flex",
    category: "image",
    provider: "Black Forest",
    price: "$0.01",
    priceValue: 0.01,
    priceUnit: "/image",
    description: "Images rapides et économiques",
    needsVoice: false,
    quality: "standard",
    features: ["1024x1024", "Ultra-rapide", "Low-cost"],
  },
  {
    id: "gpt-image-1.5",
    name: "GPT Image 1.5",
    category: "image",
    provider: "OpenAI",
    price: "$0.04",
    priceValue: 0.04,
    priceUnit: "/image",
    description: "Images créatives avec DALL-E",
    needsVoice: false,
    quality: "pro",
    features: ["1024x1024", "Créatif", "Texte dans image"],
  },
  {
    id: "kling-image",
    name: "Kling Image",
    category: "image",
    provider: "Kuaishou",
    price: "$0.02",
    priceValue: 0.02,
    priceUnit: "/image",
    description: "Optimisé pour le contenu asiatique",
    needsVoice: false,
    quality: "standard",
    features: ["1024x1024", "Chinois SOTA", "Rapide"],
  },
  // Music Models
  {
    id: "suno-v5",
    name: "Suno V5",
    category: "music",
    provider: "Suno",
    price: "$0.05",
    priceValue: 0.05,
    priceUnit: "/morceau",
    description: "Musique de fond pour vidéos",
    needsVoice: false,
    quality: "pro",
    features: ["30-120s", "Tous genres", "Royalty-free"],
  },
  {
    id: "kling-tts",
    name: "Kling TTS",
    category: "music",
    provider: "Kuaishou",
    price: "$0.01",
    priceValue: 0.01,
    priceUnit: "/requête",
    description: "Synthèse vocale économique",
    needsVoice: false,
    quality: "standard",
    features: ["Multi-voix", "Rapide", "Low-cost"],
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
  showVoiceIndicator?: boolean;
}

export const ModelSelector = ({
  selectedModel,
  onModelChange,
  category,
  showVoiceIndicator = true,
}: ModelSelectorProps) => {
  const filteredModels = category
    ? AI_MODELS.filter((m) => m.category === category)
    : AI_MODELS;

  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.category]) acc[model.category] = [];
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  const categoryLabels = {
    video: "🎬 Vidéos",
    image: "🖼️ Images",
    music: "🎵 Audio",
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedModels).map(([cat, models]) => (
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
                  {/* Selected indicator */}
                  {isSelected && (
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

                  {/* Price & Voice */}
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-primary">{model.price}</span>
                      <span className="text-xs text-muted-foreground">{model.priceUnit}</span>
                    </div>
                    {showVoiceIndicator && (
                      <div className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        model.needsVoice
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Volume2 className="h-3 w-3" />
                        {model.needsVoice ? "Voix IA" : "Sans voix"}
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
