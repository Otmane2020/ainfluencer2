

# Reinforcing Brand Elements in AI Image Generation

## Problem Statement

The user reports that AI-generated images are missing critical brand elements:

1. **Text Quality** - Text overlays are not clear, large, or visible enough
2. **Logo** - Never appears in generated images (even when enabled)
3. **Website URL** - Never visible on photos (even when enabled)
4. **Brand Colors** - Never applied in the visuals

## Root Cause Analysis

After reviewing the codebase, here are the issues:

### Issue 1: Weak Text Instructions
The current prompt in `generate-image/index.ts` (line 503) only says:
```
"Include this text prominently in the image: [text]. Make the text bold, readable, and well-integrated"
```
This is too vague - AI models need **explicit typography specifications**.

### Issue 2: Logo Overlay Unreliable
The logo overlay function (lines 98-174) uses AI to composite the logo, but:
- It's a secondary pass that often fails silently
- AI-based compositing can distort or ignore the logo
- No explicit instruction in the main prompt to reserve space for the logo

### Issue 3: URL Instructions Too Subtle
The current instruction (line 508):
```
"Subtly include the website URL [url] in the composition"
```
"Subtly" means AI often makes it invisible or omits it entirely.

### Issue 4: Brand Colors Not Enforced
The `generation-context-guard.ts` mentions colors but doesn't **mandate** them:
- Line 236: `MAIN COLOR: ${mc.visual_identity.primary_color}` - just informational
- No instruction like "DOMINANT color scheme must use..."

---

## Technical Solution

### 1. Enhance Generation Context Guard with Mandatory Brand Rules

Update `supabase/functions/_shared/generation-context-guard.ts`:

**Add dedicated BRAND ENFORCEMENT section to the enhanced prompt:**

```typescript
// NEW: Mandatory visual branding rules
if (input.generationType === "image") {
  enhancedPromptParts.push("");
  enhancedPromptParts.push("=== MANDATORY VISUAL BRANDING RULES ===");
  
  // Color enforcement
  if (mc?.visual_identity?.primary_color) {
    enhancedPromptParts.push(`DOMINANT COLOR: The primary color ${mc.visual_identity.primary_color} MUST be prominently visible in the image (backgrounds, accents, objects, or text)`);
  }
  if (mc?.visual_identity?.secondary_colors?.length) {
    enhancedPromptParts.push(`ACCENT COLORS: Use these as secondary colors: ${mc.visual_identity.secondary_colors.join(", ")}`);
  }
  
  // Text quality enforcement
  if (input.includeLogo || input.includeUrl || input.includeText) {
    enhancedPromptParts.push("");
    enhancedPromptParts.push("TEXT/LOGO PLACEMENT (CRITICAL):");
    enhancedPromptParts.push("- Reserve the bottom 20% of the image for text/logo placement");
    enhancedPromptParts.push("- Text must be: LARGE (at least 8% of image height), HIGH CONTRAST, READABLE");
    enhancedPromptParts.push("- Use bold sans-serif font, white or brand color text with shadow/outline for visibility");
  }
}
```

### 2. Upgrade Image Prompt Instructions in generate-image

Update `supabase/functions/generate-image/index.ts`:

**Replace weak text instructions with explicit typography rules:**

```typescript
// Text overlay - REINFORCED instructions
if (includeText && overlayText) {
  finalPrompt += `
TEXT OVERLAY REQUIREMENTS (MANDATORY):
- Display this exact text: "${overlayText}"
- Size: LARGE, occupying at least 15-20% of image width
- Font: Bold sans-serif, modern, highly readable
- Color: High contrast against background (white with dark shadow, or ${themeColor || 'brand color'} if light background)
- Position: Center-bottom or lower-third of image
- Style: Clean, professional, eye-catching typography
- CRITICAL: Text must be the FIRST thing viewers notice
`;
}

// URL - REINFORCED instructions
if (includeUrl && projectUrl) {
  finalPrompt += `
WEBSITE URL REQUIREMENTS (MANDATORY):
- Display URL: "${projectUrl}"
- Position: Bottom of image, clearly visible
- Size: Readable but not dominant (5-8% of image height)
- Color: White text with subtle dark shadow for any background
- Style: Clean, modern font
`;
}

// Brand colors - ENFORCED
if (marketingContext?.visual_identity?.primary_color) {
  finalPrompt += `
BRAND COLOR REQUIREMENTS (MANDATORY):
- Primary brand color: ${marketingContext.visual_identity.primary_color}
- This color MUST appear prominently in the image (backgrounds, accents, objects, clothing, or UI elements)
- Do NOT use conflicting color schemes - the image should feel "on-brand"
`;
}
```

### 3. Improve Logo Overlay with Pre-Generation Instruction

Instead of relying only on post-processing, add logo instruction to the main prompt:

```typescript
// Logo - BOTH in prompt AND post-processing
if (includeLogo && logoUrl) {
  finalPrompt += `
LOGO SPACE REQUIREMENT:
- Reserve a clear, uncluttered area in the bottom-right corner (approximately 15% of image)
- This space will be used for brand logo overlay
- Ensure background in that area is simple (solid color or subtle gradient)
- Do NOT place important subjects in the bottom-right corner
`;
}
```

### 4. Add Explicit Quality Instructions for Text in IMAGE REQUIREMENTS

Update the generation-context-guard IMAGE REQUIREMENTS section:

```typescript
if (input.generationType === "image") {
  enhancedPromptParts.push("");
  enhancedPromptParts.push("IMAGE REQUIREMENTS:");
  enhancedPromptParts.push("- Ultra high resolution, professional advertising quality");
  enhancedPromptParts.push("- Must reflect the brand's visual style, mood, and COLOR PALETTE");
  enhancedPromptParts.push("- Showcase actual products/services when relevant");
  enhancedPromptParts.push(`- Any text in image MUST be in ${langName}, LARGE, BOLD, READABLE`);
  enhancedPromptParts.push("- Typography: Modern sans-serif, high contrast, with shadow or outline");
  enhancedPromptParts.push("- Text placement: Mobile-safe zones (not in top 10% or extreme edges)");
}
```

### 5. Update Campaign Content Generation

Update `supabase/functions/generate-campaign-content/index.ts` to include same reinforced brand instructions in the image prompt system message.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/generation-context-guard.ts` | Add MANDATORY VISUAL BRANDING RULES section, enhance text quality specs |
| `supabase/functions/generate-image/index.ts` | Replace weak instructions with explicit typography and color mandates |
| `supabase/functions/generate-campaign-content/index.ts` | Add brand enforcement rules to image prompt system message |

---

## Expected Results

### Before (Current)
- AI generates generic colors, ignoring brand palette
- Text is small, blurry, or missing
- Logo space not reserved, overlay often fails
- URL is invisible or omitted

### After (With Changes)
```
Prompt Example:
"...
MANDATORY VISUAL BRANDING RULES:
- DOMINANT COLOR: #3B82F6 (blue) MUST be prominently visible
- TEXT: Display 'Get 50% Off Today' - LARGE (20% width), BOLD sans-serif, white with shadow
- URL: Display 'www.mybrand.com' at bottom, white text, 6% height
- LOGO SPACE: Reserve bottom-right 15% with simple background
..."
```

Result: Images with consistent brand colors, readable text, visible URL, and proper logo placement.

---

## Technical Details

### Guard Input Interface Update

Add new fields to `GenerationGuardInput`:
```typescript
export interface GenerationGuardInput {
  // ... existing fields
  includeLogo?: boolean;
  includeUrl?: boolean;  
  includeText?: boolean;
  overlayText?: string;
}
```

### Color Conversion Helper

Add hex to color name helper for more natural prompts:
```typescript
function getColorDescription(hex: string): string {
  // Map common colors to descriptive names
  const colorMap: Record<string, string> = {
    "#3B82F6": "bright blue",
    "#EF4444": "vibrant red",
    "#10B981": "emerald green",
    // etc.
  };
  return colorMap[hex.toUpperCase()] || hex;
}
```

