/**
 * Video Model Configuration
 * All available video generation models with pricing and capabilities
 */

export type VideoModelType = "text-to-video" | "image-to-video" | "video-to-video";
export type CostLevel = "ultra-low" | "low" | "medium" | "high";

export interface VideoModel {
  id: string;
  name: string;
  type: VideoModelType;
  quality: 1 | 2 | 3 | 4 | 5 | 6; // Star rating
  duration: number; // seconds
  resolution: "720p" | "1080p";
  credits: number;
  costPerVideo: number; // USD
  costLevel: CostLevel;
  usage: string;
  provider: "kie" | "comet" | "openai";
  hasAudio?: boolean; // Audio generation support
  apiEndpoint?: string;
}

// ============================================================
// WAN 2.6 MODELS (KIE API)
// ============================================================
const WAN_MODELS: VideoModel[] = [
  // 5s - 720p
  {
    id: "wan-2.6-text-5s-720p",
    name: "Wan 2.6 (5s 720p)",
    type: "text-to-video",
    quality: 3,
    duration: 5,
    resolution: "720p",
    credits: 70,
    costPerVideo: 0.35,
    costLevel: "low",
    usage: "Volume generation",
    provider: "kie",
  },
  {
    id: "wan-2.6-img-5s-720p",
    name: "Wan 2.6 (5s 720p)",
    type: "image-to-video",
    quality: 4,
    duration: 5,
    resolution: "720p",
    credits: 70,
    costPerVideo: 0.35,
    costLevel: "low",
    usage: "Product animation",
    provider: "kie",
  },
  {
    id: "wan-2.6-vid-5s-720p",
    name: "Wan 2.6 (5s 720p)",
    type: "video-to-video",
    quality: 4,
    duration: 5,
    resolution: "720p",
    credits: 70,
    costPerVideo: 0.35,
    costLevel: "low",
    usage: "Test, simple UGC",
    provider: "kie",
  },
  // 5s - 1080p
  {
    id: "wan-2.6-vid-5s-1080p",
    name: "Wan 2.6 (5s 1080p)",
    type: "video-to-video",
    quality: 4,
    duration: 5,
    resolution: "1080p",
    credits: 105,
    costPerVideo: 0.52,
    costLevel: "low",
    usage: "Short ads",
    provider: "kie",
  },
  // 10s - 720p
  {
    id: "wan-2.6-text-10s-720p",
    name: "Wan 2.6 (10s 720p)",
    type: "text-to-video",
    quality: 3,
    duration: 10,
    resolution: "720p",
    credits: 140,
    costPerVideo: 0.70,
    costLevel: "medium",
    usage: "Social content",
    provider: "kie",
  },
  {
    id: "wan-2.6-img-10s-720p",
    name: "Wan 2.6 (10s 720p)",
    type: "image-to-video",
    quality: 4,
    duration: 10,
    resolution: "720p",
    credits: 140,
    costPerVideo: 0.70,
    costLevel: "medium",
    usage: "Product story",
    provider: "kie",
  },
  // 10s - 1080p
  {
    id: "wan-2.6-img-10s-1080p",
    name: "Wan 2.6 (10s 1080p)",
    type: "image-to-video",
    quality: 4,
    duration: 10,
    resolution: "1080p",
    credits: 210,
    costPerVideo: 1.05,
    costLevel: "medium",
    usage: "Clean ads",
    provider: "kie",
  },
  // 15s - 720p
  {
    id: "wan-2.6-vid-15s-720p",
    name: "Wan 2.6 (15s 720p)",
    type: "video-to-video",
    quality: 4,
    duration: 15,
    resolution: "720p",
    credits: 210,
    costPerVideo: 1.05,
    costLevel: "medium",
    usage: "Reels",
    provider: "kie",
  },
  // 15s - 1080p
  {
    id: "wan-2.6-all-15s-1080p",
    name: "Wan 2.6 (15s 1080p)",
    type: "image-to-video", // Can also be video-to-video
    quality: 4,
    duration: 15,
    resolution: "1080p",
    credits: 315,
    costPerVideo: 1.58,
    costLevel: "high",
    usage: "Long video",
    provider: "kie",
  },
];

// ============================================================
// KLING 2.6 MODELS (KIE API)
// ============================================================
const KLING_MODELS: VideoModel[] = [
  // Text-to-Video without audio
  {
    id: "kling-2.6-text-5s",
    name: "Kling 2.6 (5s)",
    type: "text-to-video",
    quality: 4,
    duration: 5,
    resolution: "720p",
    credits: 55,
    costPerVideo: 0.275,
    costLevel: "low",
    usage: "Quick test",
    provider: "kie",
    hasAudio: false,
  },
  {
    id: "kling-2.6-text-10s",
    name: "Kling 2.6 (10s)",
    type: "text-to-video",
    quality: 4,
    duration: 10,
    resolution: "720p",
    credits: 110,
    costPerVideo: 0.55,
    costLevel: "medium",
    usage: "Ads",
    provider: "kie",
    hasAudio: false,
  },
  // Image-to-Video without audio
  {
    id: "kling-2.6-img-10s",
    name: "Kling 2.6 (10s)",
    type: "image-to-video",
    quality: 4,
    duration: 10,
    resolution: "720p",
    credits: 110,
    costPerVideo: 0.55,
    costLevel: "medium",
    usage: "Product animation",
    provider: "kie",
    hasAudio: false,
  },
  // Text-to-Video WITH AUDIO (Talking avatar)
  {
    id: "kling-2.6-text-audio-10s",
    name: "Kling 2.6 + Audio (10s)",
    type: "text-to-video",
    quality: 5,
    duration: 10,
    resolution: "720p",
    credits: 110,
    costPerVideo: 0.55,
    costLevel: "medium",
    usage: "Talking avatar",
    provider: "kie",
    hasAudio: true,
  },
  // Image-to-Video WITH AUDIO
  {
    id: "kling-2.6-img-audio-5s",
    name: "Kling 2.6 + Audio (5s)",
    type: "image-to-video",
    quality: 5,
    duration: 5,
    resolution: "720p",
    credits: 110,
    costPerVideo: 0.55,
    costLevel: "medium",
    usage: "Face + voice",
    provider: "kie",
    hasAudio: true,
  },
  {
    id: "kling-2.6-img-audio-10s",
    name: "Kling 2.6 + Audio (10s)",
    type: "image-to-video",
    quality: 5,
    duration: 10,
    resolution: "720p",
    credits: 220,
    costPerVideo: 1.10,
    costLevel: "high",
    usage: "AI Influencer",
    provider: "kie",
    hasAudio: true,
  },
  // Text-to-Video WITH AUDIO - 15s
  {
    id: "kling-2.6-text-audio-15s",
    name: "Kling 2.6 + Audio (15s)",
    type: "text-to-video",
    quality: 5,
    duration: 15,
    resolution: "720p",
    credits: 220,
    costPerVideo: 1.10,
    costLevel: "high",
    usage: "Premium video",
    provider: "kie",
    hasAudio: true,
  },
];

// ============================================================
// ALL VIDEO MODELS
// ============================================================
export const VIDEO_MODELS: VideoModel[] = [
  ...WAN_MODELS,
  ...KLING_MODELS,
];

// Default model (cost-effective)
export const DEFAULT_VIDEO_MODEL_ID = "kling-2.6-text-5s";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getVideoModelById(id: string): VideoModel | undefined {
  return VIDEO_MODELS.find(m => m.id === id);
}

export function getDefaultVideoModel(): VideoModel {
  return VIDEO_MODELS.find(m => m.id === DEFAULT_VIDEO_MODEL_ID) || VIDEO_MODELS[0];
}

export function getCostLevelColor(level: CostLevel): string {
  switch (level) {
    case "ultra-low":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "high":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

export function getCostLevelLabel(level: CostLevel): string {
  switch (level) {
    case "ultra-low":
      return "Ultra Low";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
  }
}

export function getTypeIcon(type: VideoModelType): string {
  switch (type) {
    case "text-to-video":
      return "✍️";
    case "image-to-video":
      return "🖼️";
    case "video-to-video":
      return "🎬";
  }
}

export function getTypeLabel(type: VideoModelType): string {
  switch (type) {
    case "text-to-video":
      return "Text → Video";
    case "image-to-video":
      return "Img → Video";
    case "video-to-video":
      return "Video → Video";
  }
}

export function renderStars(quality: number): string {
  return "⭐".repeat(Math.min(quality, 6));
}

// Group models by type for dropdown
export function getGroupedVideoModels(): Record<VideoModelType, VideoModel[]> {
  return VIDEO_MODELS.reduce((acc, model) => {
    if (!acc[model.type]) acc[model.type] = [];
    acc[model.type].push(model);
    return acc;
  }, {} as Record<VideoModelType, VideoModel[]>);
}

// Parse model ID to get KIE API parameters
export function parseModelIdForKie(modelId: string): {
  model: "wan-2.6" | "kling-2.6";
  mode: "text-to-video" | "image-to-video" | "video-to-video";
  duration: 5 | 10 | 15;
  resolution: "720p" | "1080p";
  withAudio: boolean;
} {
  const model = VIDEO_MODELS.find(m => m.id === modelId);
  if (!model) {
    return { model: "kling-2.6", mode: "text-to-video", duration: 5, resolution: "720p", withAudio: false };
  }
  
  const isWan = modelId.startsWith("wan-");
  const isKling = modelId.startsWith("kling-");
  
  return {
    model: isWan ? "wan-2.6" : "kling-2.6",
    mode: model.type,
    duration: model.duration as 5 | 10 | 15,
    resolution: model.resolution,
    withAudio: model.hasAudio || false,
  };
}
