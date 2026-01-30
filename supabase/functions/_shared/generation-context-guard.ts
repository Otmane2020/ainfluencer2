/**
 * GENERATION CONTEXT GUARD
 * 
 * This module ensures every AI generation has:
 * 1. Complete Marketing Context from the project
 * 2. The specific prompt for the generation task
 * 
 * It combines both into a rich, contextual prompt that produces
 * high-quality, brand-aligned content.
 */

export interface MarketingContext {
  visual_identity?: {
    primary_color?: string;
    secondary_colors?: string[];
    aesthetic_style?: string;
    logo_description?: string;
    mood?: string;
  };
  brand_personality?: {
    tone?: string;
    values?: string[];
    voice_keywords?: string[];
  };
  target_audience?: {
    primary?: string;
    demographics?: string;
    pain_points?: string[];
    desires?: string[];
  };
  products_services?: Array<{
    name: string;
    description?: string;
    key_benefit?: string;
  }>;
  competitive_positioning?: string;
  content_guidelines?: {
    banned_terms?: string[];
    preferred_terms?: string[];
    visual_banned?: string[];
    visual_preferred?: string[];
  };
}

export interface GenerationGuardInput {
  projectId?: string;
  projectName?: string;
  projectDescription?: string;
  projectUrl?: string;
  logoUrl?: string;
  avatarUrl?: string;
  themeColor?: string;
  detectedLanguage?: string;
  marketingContext?: MarketingContext | null;
  aiContextSummary?: string;
  scrapedMarkdown?: string;
  // The specific prompt for this generation
  generationPrompt: string;
  // Type of generation
  generationType: "image" | "video" | "script" | "social_post";
}

export interface GuardedContext {
  isValid: boolean;
  missingElements: string[];
  contextScore: number; // 0-100 - how complete is the context
  enhancedPrompt: string;
  brandContext: string;
  warnings: string[];
}

/**
 * Validates that the generation has sufficient context
 * and builds an enhanced prompt with full marketing context
 */
export function validateAndBuildContext(input: GenerationGuardInput): GuardedContext {
  const missingElements: string[] = [];
  const warnings: string[] = [];
  let contextScore = 0;

  // === CHECK REQUIRED ELEMENTS ===
  
  // Project basics (30 points)
  if (!input.projectName) {
    missingElements.push("Project name");
  } else {
    contextScore += 10;
  }
  
  if (!input.projectDescription && !input.aiContextSummary && !input.scrapedMarkdown) {
    missingElements.push("Project description or context");
  } else {
    contextScore += 10;
  }
  
  if (input.detectedLanguage) {
    contextScore += 10;
  }

  // Marketing context (50 points)
  const mc = input.marketingContext;
  if (mc) {
    // Target audience (15 points)
    if (mc.target_audience?.primary) {
      contextScore += 10;
      if (mc.target_audience.pain_points?.length) contextScore += 2;
      if (mc.target_audience.desires?.length) contextScore += 3;
    } else {
      warnings.push("No target audience defined - content may be too generic");
    }

    // Brand personality (10 points)
    if (mc.brand_personality?.tone) {
      contextScore += 5;
    }
    if (mc.brand_personality?.values?.length) {
      contextScore += 5;
    }

    // Products/Services (15 points)
    if (mc.products_services?.length) {
      contextScore += 15;
    } else {
      warnings.push("No products/services defined - cannot showcase specific offerings");
    }

    // Visual identity (5 points)
    if (mc.visual_identity?.aesthetic_style || mc.visual_identity?.mood) {
      contextScore += 5;
    }

    // Content guidelines (5 points)
    if (mc.content_guidelines?.visual_preferred?.length || mc.content_guidelines?.visual_banned?.length) {
      contextScore += 5;
    }
  } else {
    warnings.push("No marketing context - generation quality will be limited");
  }

  // Generation prompt (20 points)
  if (!input.generationPrompt || input.generationPrompt.trim().length < 10) {
    missingElements.push("Generation prompt");
  } else {
    contextScore += 20;
  }

  // === BUILD BRAND CONTEXT BLOCK ===
  const brandContextParts: string[] = [];

  // Language instruction
  const languageMap: Record<string, string> = {
    en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese"
  };
  const langName = languageMap[input.detectedLanguage || "en"] || "English";
  
  brandContextParts.push(`=== BRAND CONTEXT FOR ${input.projectName?.toUpperCase() || "BRAND"} ===`);
  brandContextParts.push(`[OUTPUT LANGUAGE: ${langName.toUpperCase()}]`);

  // Brand basics
  if (input.projectName) {
    brandContextParts.push(`BRAND NAME: ${input.projectName}`);
  }
  if (input.projectDescription) {
    brandContextParts.push(`BRAND DESCRIPTION: ${input.projectDescription}`);
  }
  if (input.projectUrl) {
    brandContextParts.push(`WEBSITE: ${input.projectUrl}`);
  }
  if (input.themeColor) {
    brandContextParts.push(`PRIMARY COLOR: ${input.themeColor}`);
  }

  // Marketing context
  if (mc) {
    // Target Audience
    if (mc.target_audience?.primary) {
      brandContextParts.push("");
      brandContextParts.push("=== TARGET AUDIENCE ===");
      brandContextParts.push(`WHO: ${mc.target_audience.primary}`);
      if (mc.target_audience.demographics) {
        brandContextParts.push(`DEMOGRAPHICS: ${mc.target_audience.demographics}`);
      }
      if (mc.target_audience.pain_points?.length) {
        brandContextParts.push(`THEIR PAIN POINTS: ${mc.target_audience.pain_points.join(", ")}`);
      }
      if (mc.target_audience.desires?.length) {
        brandContextParts.push(`THEIR DESIRES: ${mc.target_audience.desires.join(", ")}`);
      }
    }

    // Brand Personality
    if (mc.brand_personality?.tone || mc.brand_personality?.values?.length) {
      brandContextParts.push("");
      brandContextParts.push("=== BRAND PERSONALITY ===");
      if (mc.brand_personality.tone) {
        brandContextParts.push(`TONE: ${mc.brand_personality.tone}`);
      }
      if (mc.brand_personality.values?.length) {
        brandContextParts.push(`VALUES: ${mc.brand_personality.values.join(", ")}`);
      }
      if (mc.brand_personality.voice_keywords?.length) {
        brandContextParts.push(`VOICE KEYWORDS: ${mc.brand_personality.voice_keywords.join(", ")}`);
      }
    }

    // Products/Services to showcase
    if (mc.products_services?.length) {
      brandContextParts.push("");
      brandContextParts.push("=== PRODUCTS/SERVICES TO SHOWCASE ===");
      mc.products_services.slice(0, 5).forEach((product, i) => {
        let productLine = `${i + 1}. ${product.name}`;
        if (product.key_benefit) {
          productLine += ` - ${product.key_benefit}`;
        }
        brandContextParts.push(productLine);
        if (product.description) {
          brandContextParts.push(`   ${product.description}`);
        }
      });
    }

    // Visual Identity
    if (mc.visual_identity?.aesthetic_style || mc.visual_identity?.mood) {
      brandContextParts.push("");
      brandContextParts.push("=== VISUAL STYLE ===");
      if (mc.visual_identity.aesthetic_style) {
        brandContextParts.push(`AESTHETIC: ${mc.visual_identity.aesthetic_style}`);
      }
      if (mc.visual_identity.mood) {
        brandContextParts.push(`MOOD: ${mc.visual_identity.mood}`);
      }
      if (mc.visual_identity.logo_description) {
        brandContextParts.push(`LOGO: ${mc.visual_identity.logo_description}`);
      }
      if (mc.visual_identity.primary_color) {
        brandContextParts.push(`MAIN COLOR: ${mc.visual_identity.primary_color}`);
      }
    }

    // Content Guidelines
    if (mc.content_guidelines) {
      const hasGuidelines = 
        mc.content_guidelines.visual_preferred?.length || 
        mc.content_guidelines.visual_banned?.length ||
        mc.content_guidelines.preferred_terms?.length ||
        mc.content_guidelines.banned_terms?.length;
      
      if (hasGuidelines) {
        brandContextParts.push("");
        brandContextParts.push("=== CONTENT RULES ===");
        if (mc.content_guidelines.visual_preferred?.length) {
          brandContextParts.push(`VISUALLY PREFER: ${mc.content_guidelines.visual_preferred.join(", ")}`);
        }
        if (mc.content_guidelines.visual_banned?.length) {
          brandContextParts.push(`VISUALLY AVOID: ${mc.content_guidelines.visual_banned.join(", ")}`);
        }
        if (mc.content_guidelines.preferred_terms?.length) {
          brandContextParts.push(`USE TERMS: ${mc.content_guidelines.preferred_terms.join(", ")}`);
        }
        if (mc.content_guidelines.banned_terms?.length) {
          brandContextParts.push(`AVOID TERMS: ${mc.content_guidelines.banned_terms.join(", ")}`);
        }
      }
    }

    // Competitive positioning
    if (mc.competitive_positioning) {
      brandContextParts.push("");
      brandContextParts.push(`UNIQUE POSITIONING: ${mc.competitive_positioning}`);
    }
  }

  // Fallback to scraped content if no marketing context
  if (!mc && input.scrapedMarkdown) {
    brandContextParts.push("");
    brandContextParts.push("=== WEBSITE CONTENT ===");
    brandContextParts.push(input.scrapedMarkdown.substring(0, 800));
  }

  brandContextParts.push("");
  brandContextParts.push("=== END BRAND CONTEXT ===");

  const brandContext = brandContextParts.join("\n");

  // === BUILD ENHANCED PROMPT ===
  const enhancedPromptParts: string[] = [];

  // Add brand context first
  enhancedPromptParts.push(brandContext);
  enhancedPromptParts.push("");
  
  // Add generation-specific instructions
  enhancedPromptParts.push(`=== GENERATION TASK (${input.generationType.toUpperCase()}) ===`);
  enhancedPromptParts.push(input.generationPrompt);

  // Add type-specific enhancements
  if (input.generationType === "image") {
    enhancedPromptParts.push("");
    enhancedPromptParts.push("IMAGE REQUIREMENTS:");
    enhancedPromptParts.push("- Ultra high resolution, professional quality");
    enhancedPromptParts.push("- Must reflect the brand's visual style and mood");
    enhancedPromptParts.push("- Showcase actual products/services when relevant");
    enhancedPromptParts.push(`- Any text in image MUST be in ${langName}`);
  } else if (input.generationType === "video") {
    enhancedPromptParts.push("");
    enhancedPromptParts.push("VIDEO REQUIREMENTS:");
    enhancedPromptParts.push("- Dynamic, engaging visuals");
    enhancedPromptParts.push("- Match brand personality and tone");
    enhancedPromptParts.push("- Hook viewer in first 2 seconds");
    enhancedPromptParts.push(`- All dialogue/text in ${langName}`);
  } else if (input.generationType === "script") {
    enhancedPromptParts.push("");
    enhancedPromptParts.push("SCRIPT REQUIREMENTS:");
    enhancedPromptParts.push("- Match brand voice and tone");
    enhancedPromptParts.push("- Address target audience pain points");
    enhancedPromptParts.push("- Highlight key benefits of products/services");
    enhancedPromptParts.push(`- Write entirely in ${langName}`);
  } else if (input.generationType === "social_post") {
    enhancedPromptParts.push("");
    enhancedPromptParts.push("SOCIAL POST REQUIREMENTS:");
    enhancedPromptParts.push("- Match brand tone and values");
    enhancedPromptParts.push("- Include relevant hashtags");
    enhancedPromptParts.push("- Call-to-action aligned with audience desires");
    enhancedPromptParts.push(`- Write in ${langName}`);
  }

  const enhancedPrompt = enhancedPromptParts.join("\n");

  // Determine validity
  const isValid = missingElements.length === 0 && contextScore >= 30;

  return {
    isValid,
    missingElements,
    contextScore: Math.min(100, contextScore),
    enhancedPrompt,
    brandContext,
    warnings,
  };
}

/**
 * Quick helper to fetch project with marketing context from Supabase
 */
export async function fetchProjectContext(
  supabase: any,
  projectId: string
): Promise<{
  project: any | null;
  marketingContext: MarketingContext | null;
  error: string | null;
}> {
  if (!projectId) {
    return { project: null, marketingContext: null, error: "Project ID required" };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return { project: null, marketingContext: null, error: "Project not found" };
  }

  // Parse marketing context if available
  let marketingContext: MarketingContext | null = null;
  if (project.marketing_context && typeof project.marketing_context === "object") {
    marketingContext = project.marketing_context as MarketingContext;
  }

  return { project, marketingContext, error: null };
}

/**
 * Log the context validation for debugging
 */
export function logContextValidation(guard: GuardedContext, context: string = "Generation"): void {
  console.log(`[${context}] Context Score: ${guard.contextScore}/100`);
  
  if (guard.missingElements.length > 0) {
    console.warn(`[${context}] Missing: ${guard.missingElements.join(", ")}`);
  }
  
  if (guard.warnings.length > 0) {
    console.warn(`[${context}] Warnings: ${guard.warnings.join("; ")}`);
  }
  
  console.log(`[${context}] Enhanced prompt length: ${guard.enhancedPrompt.length} chars`);
}
