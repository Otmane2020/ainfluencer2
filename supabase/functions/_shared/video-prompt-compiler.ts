/**
 * VIDEO PROMPT COMPILER
 * 
 * Transforms brand context (marketing_context) into clean, 
 * structured video prompts optimized for Sora 2.
 * 
 * Pattern: Brand Context Document → LLM Compiler → Clean Video Prompt → Sora
 * 
 * Sora understands ONLY visual descriptions in the prompt.
 * ❌ No JSON
 * ❌ No URLs
 * ❌ No technical instructions
 * ✅ Pure descriptive text
 */

export interface BrandContext {
  brand_name?: string;
  website?: string;
  logo_url?: string;
  logo_description?: string;
  primary_color?: string;
  secondary_colors?: string[];
  tone?: string;
  values?: string[];
  target_audience?: string;
  target_demographics?: string;
  pain_points?: string[];
  desires?: string[];
  products?: Array<{
    name: string;
    description?: string;
    key_benefit?: string;
  }>;
  aesthetic_style?: string;
  mood?: string;
  visual_preferred?: string[];
  visual_banned?: string[];
  competitive_positioning?: string;
  detected_language?: string;
}

export interface VideoPromptConfig {
  scenarioType?: "promotional" | "product" | "testimonial" | "educational" | "viral" | "generic";
  duration: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  isClipMotion?: boolean;
  customPrompt?: string;
  includeEndBranding?: boolean;
}

export interface CompiledVideoPrompt {
  prompt: string;
  brandContext: BrandContext;
  metadata: {
    hasLogo: boolean;
    hasBrandColors: boolean;
    hasTargetAudience: boolean;
    completenessScore: number;
  };
}

// ============================================================
// COLOR UTILITY
// ============================================================

const COLOR_NAMES: Record<string, string> = {
  "#3B82F6": "bright blue",
  "#2563EB": "royal blue",
  "#1D4ED8": "deep blue",
  "#0F172A": "dark navy",
  "#EF4444": "vibrant red",
  "#DC2626": "bold red",
  "#F97316": "bright orange",
  "#F59E0B": "warm amber",
  "#EAB308": "golden yellow",
  "#84CC16": "lime green",
  "#22C55E": "fresh green",
  "#10B981": "emerald green",
  "#14B8A6": "teal",
  "#06B6D4": "cyan",
  "#0EA5E9": "sky blue",
  "#8B5CF6": "violet purple",
  "#A855F7": "bright purple",
  "#D946EF": "magenta",
  "#EC4899": "hot pink",
  "#F43F5E": "rose red",
  "#6B7280": "neutral gray",
  "#1F2937": "dark charcoal",
  "#111827": "near black",
  "#FFFFFF": "pure white",
  "#000000": "pure black",
  "#8A96A8": "steel blue",
};

function getColorName(hex: string): string {
  if (!hex) return "";
  const upper = hex.toUpperCase();
  return COLOR_NAMES[upper] || `${hex} color`;
}

// ============================================================
// LANGUAGE MAP
// ============================================================

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
};

// ============================================================
// EXTRACT BRAND CONTEXT FROM PROJECT
// ============================================================

export function extractBrandContext(project: any): BrandContext {
  const mc = project?.marketing_context || {};
  
  return {
    brand_name: project?.name || undefined,
    website: project?.url || undefined,
    logo_url: project?.logo_url || mc?.visual_identity?.logo_url || undefined,
    logo_description: mc?.visual_identity?.logo_description || undefined,
    primary_color: mc?.visual_identity?.primary_color || project?.theme_color || undefined,
    secondary_colors: mc?.visual_identity?.secondary_colors || undefined,
    tone: mc?.brand_personality?.tone || undefined,
    values: mc?.brand_personality?.values || undefined,
    target_audience: mc?.target_audience?.primary || undefined,
    target_demographics: mc?.target_audience?.demographics || undefined,
    pain_points: mc?.target_audience?.pain_points || undefined,
    desires: mc?.target_audience?.desires || undefined,
    products: mc?.products_services || undefined,
    aesthetic_style: mc?.visual_identity?.aesthetic_style || undefined,
    mood: mc?.visual_identity?.mood || undefined,
    visual_preferred: mc?.content_guidelines?.visual_preferred || undefined,
    visual_banned: mc?.content_guidelines?.visual_banned || undefined,
    competitive_positioning: mc?.competitive_positioning || undefined,
    detected_language: project?.detected_language || "en",
  };
}

// ============================================================
// BUILD VISUAL STYLE DESCRIPTION
// ============================================================

function buildVisualStyleBlock(ctx: BrandContext): string {
  const parts: string[] = [];
  
  // Aesthetic
  if (ctx.aesthetic_style) {
    parts.push(`Visual style: ${ctx.aesthetic_style}`);
  }
  
  // Mood
  if (ctx.mood) {
    parts.push(`Mood: ${ctx.mood}`);
  }
  
  // Colors
  if (ctx.primary_color) {
    const colorName = getColorName(ctx.primary_color);
    parts.push(`Dominant color accent: ${colorName} (${ctx.primary_color})`);
  }
  if (ctx.secondary_colors?.length) {
    const secondaryNames = ctx.secondary_colors.map(c => getColorName(c)).filter(Boolean).join(", ");
    if (secondaryNames) {
      parts.push(`Secondary colors: ${secondaryNames}`);
    }
  }
  
  // Preferred visuals
  if (ctx.visual_preferred?.length) {
    parts.push(`Use: ${ctx.visual_preferred.slice(0, 5).join(", ")}`);
  }
  
  // Banned visuals
  if (ctx.visual_banned?.length) {
    parts.push(`Avoid: ${ctx.visual_banned.slice(0, 5).join(", ")}`);
  }
  
  // Tone influences visuals
  if (ctx.tone) {
    parts.push(`Tone: ${ctx.tone}`);
  }
  
  return parts.length > 0 ? parts.join("\n") : "";
}

// ============================================================
// BUILD SCENE DESCRIPTION
// ============================================================

function buildSceneDescription(ctx: BrandContext, config: VideoPromptConfig): string {
  const audience = ctx.target_audience || "professionals and consumers";
  const products = ctx.products?.slice(0, 3).map(p => p.name).join(", ");
  
  const sceneParts: string[] = [];
  
  switch (config.scenarioType) {
    case "promotional":
      sceneParts.push(`Show ${audience} discovering and using ${products || "the brand's products"}.`);
      if (ctx.desires?.length) {
        sceneParts.push(`Visually convey: ${ctx.desires.slice(0, 2).join(", ")}.`);
      }
      sceneParts.push("The atmosphere is aspirational and inviting.");
      break;
      
    case "product":
      if (products) {
        sceneParts.push(`Close-up shots of ${products} in use.`);
      }
      sceneParts.push("Highlight product details, textures, and quality.");
      sceneParts.push("Clean, minimal background to focus on the product.");
      break;
      
    case "testimonial":
      sceneParts.push(`Show confident ${audience} sharing their positive experience.`);
      sceneParts.push("Natural lighting, authentic setting.");
      sceneParts.push("Genuine emotion and satisfaction visible on faces.");
      break;
      
    case "educational":
      sceneParts.push(`Demonstrate how ${products || "the solution"} works step-by-step.`);
      sceneParts.push("Clear, informative visuals with smooth transitions.");
      sceneParts.push("Professional but approachable presentation.");
      break;
      
    case "viral":
      sceneParts.push("Fast-paced, attention-grabbing visuals.");
      sceneParts.push("Unexpected transitions, dynamic camera movements.");
      if (ctx.target_audience) {
        sceneParts.push(`Content that resonates with ${ctx.target_audience}.`);
      }
      break;
      
    default:
      if (ctx.target_audience) {
        sceneParts.push(`Show ${ctx.target_audience} in a relatable, engaging scenario.`);
      }
      if (products) {
        sceneParts.push(`Feature ${products} naturally in the scene.`);
      }
  }
  
  return sceneParts.join("\n");
}

// ============================================================
// BUILD END BRANDING DESCRIPTION
// ============================================================

function buildEndBrandingBlock(ctx: BrandContext): string {
  if (!ctx.brand_name) return "";
  
  const parts: string[] = [
    `At the end of the video, subtly display the brand name "${ctx.brand_name}"`,
  ];
  
  if (ctx.website) {
    // Clean URL for display
    const cleanUrl = ctx.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
    parts[0] += ` and the website "${cleanUrl}"`;
  }
  
  parts.push("in a clean, modern sans-serif typography.");
  parts.push("Do not exaggerate the branding. Keep it elegant and minimal.");
  
  return parts.join(" ");
}

// ============================================================
// BUILD CLIPMOTION MODIFIERS
// ============================================================

function buildClipMotionBlock(): string {
  return `[CLIPMOTION - Social Media Optimized]
- Fast-paced editing with 1-2 second cuts
- Dynamic rhythm, quick transitions
- Frequent zoom effects, subtle pan movements
- Opening hook in first 2 seconds
- Immediate visual impact
- High energy throughout, never static
- TikTok/Reels aesthetic, trendy and modern`;
}

// ============================================================
// BUILD CAMERA & TECHNICAL DESCRIPTION
// ============================================================

function buildCameraBlock(config: VideoPromptConfig): string {
  const parts: string[] = [];
  
  if (config.isClipMotion) {
    parts.push("Camera: Frequent zoom ins, quick pans, shake effects for energy.");
  } else {
    parts.push("Camera: Smooth camera movements, cinematic angles, realistic motion.");
  }
  
  parts.push(`Duration: ${config.duration} seconds`);
  parts.push(`Aspect ratio: ${config.aspectRatio}`);
  
  return parts.join("\n");
}

// ============================================================
// MAIN COMPILER FUNCTION
// ============================================================

export function compileVideoPrompt(
  ctx: BrandContext,
  config: VideoPromptConfig
): CompiledVideoPrompt {
  
  const promptParts: string[] = [];
  
  // === HEADER ===
  if (ctx.brand_name) {
    if (config.isClipMotion) {
      promptParts.push(`Create a viral, ultra-dynamic social media video for ${ctx.brand_name}.`);
    } else {
      promptParts.push(`Create a cinematic, ultra-realistic promotional video for ${ctx.brand_name}.`);
    }
  } else {
    promptParts.push("Create a professional, high-quality promotional video.");
  }
  
  promptParts.push("");
  
  // === CLIPMOTION MODIFIERS (if applicable) ===
  if (config.isClipMotion) {
    promptParts.push(buildClipMotionBlock());
    promptParts.push("");
  }
  
  // === VISUAL STYLE ===
  const styleBlock = buildVisualStyleBlock(ctx);
  if (styleBlock) {
    promptParts.push("Visual style:");
    promptParts.push(styleBlock);
    promptParts.push("");
  }
  
  // === CUSTOM PROMPT / SCENE ===
  if (config.customPrompt) {
    promptParts.push("Scene:");
    promptParts.push(config.customPrompt);
    promptParts.push("");
  } else {
    const sceneBlock = buildSceneDescription(ctx, config);
    if (sceneBlock) {
      promptParts.push("Scene:");
      promptParts.push(sceneBlock);
      promptParts.push("");
    }
  }
  
  // === END BRANDING ===
  if (config.includeEndBranding !== false) {
    const brandingBlock = buildEndBrandingBlock(ctx);
    if (brandingBlock) {
      promptParts.push("Branding:");
      promptParts.push(brandingBlock);
      promptParts.push("");
    }
  }
  
  // === CAMERA & TECHNICAL ===
  promptParts.push(buildCameraBlock(config));
  
  // === LANGUAGE ===
  const langName = LANGUAGE_NAMES[ctx.detected_language || "en"] || "English";
  promptParts.push("");
  promptParts.push(`All text and dialogue in ${langName}.`);
  
  // === METADATA ===
  const metadata = {
    hasLogo: !!ctx.logo_url || !!ctx.logo_description,
    hasBrandColors: !!ctx.primary_color,
    hasTargetAudience: !!ctx.target_audience,
    completenessScore: calculateCompleteness(ctx),
  };
  
  return {
    prompt: promptParts.join("\n"),
    brandContext: ctx,
    metadata,
  };
}

// ============================================================
// CALCULATE CONTEXT COMPLETENESS
// ============================================================

function calculateCompleteness(ctx: BrandContext): number {
  let score = 0;
  
  if (ctx.brand_name) score += 15;
  if (ctx.website) score += 5;
  if (ctx.primary_color) score += 10;
  if (ctx.tone) score += 10;
  if (ctx.target_audience) score += 15;
  if (ctx.products?.length) score += 15;
  if (ctx.aesthetic_style) score += 10;
  if (ctx.mood) score += 5;
  if (ctx.visual_preferred?.length) score += 5;
  if (ctx.visual_banned?.length) score += 5;
  if (ctx.logo_description) score += 5;
  
  return Math.min(100, score);
}

// ============================================================
// QUICK COMPILE FROM PROJECT (Convenience Function)
// ============================================================

export function compileVideoPromptFromProject(
  project: any,
  config: Partial<VideoPromptConfig> & { customPrompt?: string }
): CompiledVideoPrompt {
  
  const brandContext = extractBrandContext(project);
  
  const fullConfig: VideoPromptConfig = {
    scenarioType: config.scenarioType || "promotional",
    duration: config.duration || 8,
    aspectRatio: config.aspectRatio || "9:16",
    isClipMotion: config.isClipMotion || false,
    customPrompt: config.customPrompt,
    includeEndBranding: config.includeEndBranding !== false,
  };
  
  return compileVideoPrompt(brandContext, fullConfig);
}

// ============================================================
// EXAMPLE OUTPUT
// ============================================================

/*
EXAMPLE: compileVideoPromptFromProject(project, { isClipMotion: true })

OUTPUT:
```
Create a viral, ultra-dynamic social media video for ClipMotion.

[CLIPMOTION - Social Media Optimized]
- Fast-paced editing with 1-2 second cuts
- Dynamic rhythm, quick transitions
- Frequent zoom effects, subtle pan movements
- Opening hook in first 2 seconds
- Immediate visual impact
- High energy throughout, never static
- TikTok/Reels aesthetic, trendy and modern

Visual style:
Visual style: premium, futuristic
Mood: innovative, energetic
Dominant color accent: steel blue (#8A96A8)
Tone: modern, premium, confident

Scene:
Show creators, marketers, ecommerce brands in a relatable, engaging scenario.
Feature AI Video Generator, Content Automation naturally in the scene.

Branding:
At the end of the video, subtly display the brand name "ClipMotion" and the website "clipmotion.ai" in a clean, modern sans-serif typography. Do not exaggerate the branding. Keep it elegant and minimal.

Camera: Frequent zoom ins, quick pans, shake effects for energy.
Duration: 8 seconds
Aspect ratio: 9:16

All text and dialogue in English.
```
*/
