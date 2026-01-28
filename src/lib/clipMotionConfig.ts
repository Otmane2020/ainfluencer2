// ============================================================
// CLIPMOTION CONFIGURATION
// Social-first video generation mode for dynamic, engaging content
// ============================================================

export type VideoMode = "standard" | "clipmotion";

export interface ClipMotionConfig {
  enabled: boolean;
  scenePacing: "fast" | "medium";
  textAnimations: boolean;
  cameraMovements: boolean;
  hookIntensity: "high" | "ultra";
}

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

// Default durations for ClipMotion mode (shorter, punchier)
export const CLIPMOTION_DURATIONS = [5, 8, 10];

// ClipMotion always uses vertical format
export const CLIPMOTION_DEFAULT_FORMAT = "reel";
