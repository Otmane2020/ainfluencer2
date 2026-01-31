// ============================================================
// CLIPMOTION CONFIGURATION
// Social-first video generation mode for dynamic, engaging content
// 
// DURATION STRATEGY:
// • Social Boost   → 4-6s (TikTok/Reels/Shorts optimal, BASE cost)
// • Pro Engagement → 8-10s (Ads, CTR max, 2x cost)
// • Cinema Premium → 12-15s (Brand films, 4x cost - NOT default)
// ============================================================

export type VideoMode = "standard" | "clipmotion";

export interface ClipMotionConfig {
  enabled: boolean;
  scenePacing: "fast" | "medium";
  textAnimations: boolean;
  cameraMovements: boolean;
  hookIntensity: "high" | "ultra";
}

// ============================================================
// CLIPMOTION FEATURES (for UI display)
// ============================================================

export interface ClipMotionFeature {
  id: string;
  label: string;
  description: string;
}

export const CLIPMOTION_FEATURES: ClipMotionFeature[] = [
  { id: "vertical", label: "9:16 Vertical", description: "Optimized for mobile viewing" },
  { id: "fast-paced", label: "Fast Cuts", description: "1-2 second scene transitions" },
  { id: "hooks", label: "Viral Hooks", description: "Attention-grabbing openings" },
  { id: "short", label: "4-10 Seconds", description: "Optimal for social engagement" },
  { id: "animated", label: "Dynamic Motion", description: "Zoom, pan & parallax effects" },
];

// ============================================================
// CLIPMOTION DURATION TIERS & PRICING
// ============================================================

export interface ClipMotionDurationTier {
  id: string;
  label: string;
  durations: number[];
  baseCredits: number;
  description: string;
  recommended?: boolean;
  badge?: string;
}

export const CLIPMOTION_DURATION_TIERS: ClipMotionDurationTier[] = [
  {
    id: "social",
    label: "Social Boost",
    durations: [4, 5, 6],
    baseCredits: 5,
    description: "Optimal for TikTok, Reels, Shorts",
    recommended: true,
    badge: "BEST ROI",
  },
  {
    id: "pro",
    label: "Pro Engagement",
    durations: [8, 10],
    baseCredits: 10,
    description: "Perfect for ads and brand content",
  },
  {
    id: "cinema",
    label: "Cinema Premium",
    durations: [12, 15, 20],
    baseCredits: 20,
    description: "High-end brand films (Sora 2 Pro only)",
    badge: "PREMIUM",
  },
];

// All available ClipMotion durations (flattened)
export const CLIPMOTION_DURATIONS = CLIPMOTION_DURATION_TIERS.flatMap(t => t.durations);

// Default duration for ClipMotion (social-optimized)
export const CLIPMOTION_DEFAULT_DURATION = 6;

// Get credit cost for a specific duration
export const getClipMotionCreditCost = (duration: number): number => {
  if (duration <= 6) return 5;  // Social tier
  if (duration <= 10) return 10; // Pro tier
  return 20; // Cinema tier
};

// Get duration tier for UI display
export const getClipMotionDurationTier = (duration: number): ClipMotionDurationTier => {
  if (duration <= 6) return CLIPMOTION_DURATION_TIERS[0];
  if (duration <= 10) return CLIPMOTION_DURATION_TIERS[1];
  return CLIPMOTION_DURATION_TIERS[2];
};

// ============================================================
// CLIPMOTION PACKS (for à la carte purchase)
// ============================================================

export interface ClipMotionPack {
  id: string;
  name: string;
  quantity: number;
  price: number;
  popular?: boolean;
  badge?: string;
}

export const CLIPMOTION_PACKS: ClipMotionPack[] = [
  { id: "clip-5", name: "Starter", quantity: 5, price: 39 },
  { id: "clip-15", name: "Creator", quantity: 15, price: 99, popular: true },
  { id: "clip-30", name: "Pro", quantity: 30, price: 179 },
  { id: "clip-50", name: "Agency", quantity: 50, price: 269, badge: "BEST VALUE" },
];

// Base credit cost for ClipMotion (4-6s tier)
export const CLIPMOTION_CREDIT_COST = 5;

// ClipMotion uses Sora-2 model (Sora-2-Pro for 15-20s)
export const CLIPMOTION_MODEL = "sora-2";
export const CLIPMOTION_MODEL_PREMIUM = "sora-2-pro";

// Get appropriate model for duration
export const getClipMotionModel = (duration: number): string => {
  // Only Sora 2 Pro supports 15-20s
  if (duration > 12) return CLIPMOTION_MODEL_PREMIUM;
  return CLIPMOTION_MODEL;
};

// Default ClipMotion configuration
export const DEFAULT_CLIPMOTION_CONFIG: ClipMotionConfig = {
  enabled: false,
  scenePacing: "fast",
  textAnimations: true,
  cameraMovements: true,
  hookIntensity: "high",
};

// Prompt modifiers that get prepended to video prompts in ClipMotion mode
export const CLIPMOTION_PROMPT_MODIFIERS = {
  pacing: "Fast-paced editing with 1-2 second cuts. Dynamic rhythm. Quick transitions.",
  camera: "Frequent zoom effects, subtle pan movements, smooth parallax. Camera always moving.",
  hook: "Opening hook in first 2 seconds. Immediate visual impact. Attention-grabbing start.",
  text: "Animated text overlays. Kinetic typography. Punchlines emphasized with motion.",
  style: "Social media optimized. TikTok/Reels aesthetic. Trendy and modern. Viral potential.",
  energy: "High energy throughout. Never static. Constant visual interest.",
};

// Build the full ClipMotion prompt prefix
export const buildClipMotionPrefix = (): string => {
  return `[CLIPMOTION - Social Media Optimized Video]
- ${CLIPMOTION_PROMPT_MODIFIERS.pacing}
- ${CLIPMOTION_PROMPT_MODIFIERS.camera}
- ${CLIPMOTION_PROMPT_MODIFIERS.hook}
- ${CLIPMOTION_PROMPT_MODIFIERS.text}
- ${CLIPMOTION_PROMPT_MODIFIERS.style}
- ${CLIPMOTION_PROMPT_MODIFIERS.energy}

CONTENT TO VISUALIZE:
`;
};

// ClipMotion-specific scenario generation instructions
export const CLIPMOTION_SCENARIO_INSTRUCTIONS = `
Generate SHORT, PUNCHY scenarios optimized for social media virality:
- Hook in first 2 seconds (question, shocking stat, or bold statement)
- Maximum 5 scenes, 1-2 seconds each for fast-paced rhythm
- Include text overlay suggestions for each scene (animated typography)
- End with a call-to-action or engagement hook (comment, share, follow)
- Use trending formats: POV, quick tips, hot takes, behind-the-scenes
- Camera movements: zoom ins, pans, shake effects for energy
- Style: TikTok/Reels native aesthetic
`;

// ClipMotion always uses vertical format
export const CLIPMOTION_DEFAULT_FORMAT = "vertical";

// ============================================================
// UI HELPER: Format duration with tier label
// ============================================================

export const formatDurationWithTier = (duration: number): string => {
  const tier = getClipMotionDurationTier(duration);
  return `${duration}s (${tier.label})`;
};

// ============================================================
// UI HELPER: Get pricing summary for display
// ============================================================

export const getClipMotionPricingSummary = (duration: number): {
  credits: number;
  tier: string;
  description: string;
} => {
  const tierInfo = getClipMotionDurationTier(duration);
  return {
    credits: getClipMotionCreditCost(duration),
    tier: tierInfo.label,
    description: tierInfo.description,
  };
};
