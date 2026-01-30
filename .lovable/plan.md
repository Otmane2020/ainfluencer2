
# Marketing Context System for AI Generation Quality

## Problem Statement

Currently, AI-generated images and videos are "off-target" because the generation lacks comprehensive brand context. The current `ai_context_summary` only contains:
- Project name, description, language, URL, logo, avatar
- No visual identity (colors, fonts, aesthetic style)
- No target audience definition
- No brand values/tone/personality
- No product/service details for showcasing
- No competitive positioning

The AI assistant generating content has no "marketing manager" context, resulting in generic, irrelevant outputs.

---

## Solution Overview

Create a comprehensive **Marketing Context** system that acts as a "brand briefing document" for all AI generation, giving Gemini/Nano Banana the same context a marketing manager would have.

---

## Technical Implementation

### 1. Database Schema Update

Add new columns to the `projects` table to store rich marketing context:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS marketing_context JSONB DEFAULT '{}';
```

The `marketing_context` JSONB will contain:
```json
{
  "visual_identity": {
    "primary_color": "#3B82F6",
    "secondary_colors": ["#1E3A8A", "#60A5FA"],
    "aesthetic_style": "modern-minimal",
    "logo_description": "Blue diamond icon with gradient, clean sans-serif text",
    "mood": "professional yet approachable"
  },
  "brand_personality": {
    "tone": "friendly-expert",
    "values": ["innovation", "reliability", "simplicity"],
    "voice_keywords": ["smart", "effortless", "automated"]
  },
  "target_audience": {
    "primary": "Small business owners managing Google Business Profile",
    "demographics": "35-55 years old, tech-curious but not tech-savvy",
    "pain_points": ["No time for reviews", "Bad online reputation", "Competitor visibility"],
    "desires": ["More customers", "5-star reputation", "Automated marketing"]
  },
  "products_services": [
    {
      "name": "AI Review Responder",
      "description": "Automatic professional responses to Google reviews",
      "key_benefit": "Save 5 hours/week on review management"
    },
    {
      "name": "GMB Post Automation",
      "description": "AI-generated posts for Google Business Profile",
      "key_benefit": "Stay active on Google Maps without effort"
    }
  ],
  "competitive_positioning": "The only AI tool focused 100% on Google Business Profile automation",
  "content_guidelines": {
    "banned_terms": ["revolutionary", "game-changer", "innovative"],
    "preferred_terms": ["automated", "smart", "effortless"],
    "visual_banned": ["generic stock photos", "people with laptops in cafes"],
    "visual_preferred": ["real business owners", "actual Google interfaces", "5-star reviews"]
  }
}
```

### 2. Update Database Trigger

Modify the `rebuild_ai_context()` trigger to include marketing context in the summary:

```sql
CREATE OR REPLACE FUNCTION public.rebuild_ai_context()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.ai_context_summary := 
    'BRAND: ' || COALESCE(NEW.name, '') || E'\n' ||
    'DESCRIPTION: ' || COALESCE(NEW.description, '') || E'\n' ||
    'LANGUAGE: ' || COALESCE(NEW.detected_language, 'en') || E'\n' ||
    'WEBSITE: ' || COALESCE(NEW.url, '') || E'\n' ||
    'LOGO: ' || COALESCE(NEW.logo_url, '') || E'\n' ||
    'AVATAR: ' || COALESCE(NEW.avatar_url, '') || E'\n' ||
    'SCRAPED CONTENT: ' || COALESCE(LEFT(NEW.scraped_markdown, 1000), '') || E'\n' ||
    'MARKETING CONTEXT: ' || COALESCE(NEW.marketing_context::text, '{}');
  RETURN NEW;
END;
$function$;
```

### 3. UI Component: Marketing Context Editor

Create a new component `src/components/MarketingContextEditor.tsx`:

Features:
- **Visual Identity Section**: Primary/secondary colors, aesthetic style selector (minimal, bold, luxurious, playful, etc.), logo description field
- **Brand Personality Section**: Tone selector, brand values tags, voice keywords
- **Target Audience Section**: Primary audience textarea, demographics, pain points (tag input), desires (tag input)
- **Products/Services Section**: Add/edit/remove products with name, description, key benefit fields
- **Competitive Positioning**: Single textarea for positioning statement
- **Content Guidelines**: Banned terms, preferred terms, visual do's and don'ts

### 4. AI Context Auto-Generation

Add a button "Generate with AI" that:
1. Takes the scraped website content (`scraped_markdown`)
2. Sends it to Lovable AI with a structured prompt
3. Asks AI to extract and structure the marketing context
4. Pre-fills the form for user review/edit

Edge function `generate-marketing-context`:
```typescript
// Uses Lovable AI to analyze website and generate structured marketing context
// Input: scraped_markdown, project_name, project_description
// Output: Complete marketing_context JSON
```

### 5. Integration with Generation Functions

Update all generation edge functions to use the rich context:

**Files to update:**
- `supabase/functions/generate-image/index.ts` - Include marketing context in prompts
- `supabase/functions/suggest-content/index.ts` - Use target audience and brand voice
- `supabase/functions/generate-campaign-content/index.ts` - Apply product showcasing
- `supabase/functions/generate-script-nanobanana/index.ts` - Use brand personality

Example prompt enhancement:
```typescript
const brandContext = `
MARKETING CONTEXT FOR ${projectName}:

TARGET AUDIENCE: ${marketingContext.target_audience.primary}
Their pain points: ${marketingContext.target_audience.pain_points.join(', ')}
Their desires: ${marketingContext.target_audience.desires.join(', ')}

BRAND PERSONALITY: ${marketingContext.brand_personality.tone}
Values: ${marketingContext.brand_personality.values.join(', ')}

PRODUCTS TO SHOWCASE:
${marketingContext.products_services.map(p => `- ${p.name}: ${p.key_benefit}`).join('\n')}

VISUAL STYLE: ${marketingContext.visual_identity.aesthetic_style}
Logo description: ${marketingContext.visual_identity.logo_description}
Mood: ${marketingContext.visual_identity.mood}

CONTENT RULES:
- NEVER use: ${marketingContext.content_guidelines.banned_terms.join(', ')}
- AVOID visually: ${marketingContext.content_guidelines.visual_banned.join(', ')}
- PREFER: ${marketingContext.content_guidelines.preferred_terms.join(', ')}
`;
```

### 6. Project Detail Page Update

Add a new "Context" tab in the project edit modal (`src/pages/ProjectDetail.tsx`):
- Tab appears alongside Info, Style, Platforms
- Opens the MarketingContextEditor component
- Shows completion percentage indicator

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/MarketingContextEditor.tsx` | Full marketing context editing UI |
| `supabase/functions/generate-marketing-context/index.ts` | AI auto-generation of context |
| Migration file | Add `marketing_context` column + update trigger |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ProjectDetail.tsx` | Add "Context" tab to edit modal |
| `src/pages/ProjectNew.tsx` | Optional: Add simplified context step |
| `supabase/functions/generate-image/index.ts` | Inject marketing context into prompts |
| `supabase/functions/suggest-content/index.ts` | Use audience and brand personality |
| `supabase/functions/generate-campaign-content/index.ts` | Apply product showcasing |
| `supabase/functions/generate-script-nanobanana/index.ts` | Use brand voice |

---

## User Flow

1. **Project Creation**: User creates project, optionally entering URL
2. **Auto-Analysis**: Firecrawl scrapes website content
3. **Context Generation**: User clicks "Generate Context with AI" button
4. **AI Analysis**: System analyzes scraped content and generates structured marketing context
5. **User Review**: User reviews and adjusts the generated context
6. **Save**: Marketing context is stored in database
7. **Generation**: All subsequent AI generations use this rich context

---

## Expected Outcome

Before:
```
"Create an image for Starlinko"
→ Generic tech image with stars/links (literal interpretation)
```

After:
```
"Create an image for Starlinko"
→ Image showing a busy restaurant owner receiving 5-star Google reviews
→ Blue color scheme matching brand
→ Smartphone showing Google Business Profile interface
→ Happy customer expression (matching target audience desires)
```

---

## Credits/Cost Considerations

- Context generation is a one-time operation per project (1-2 credits)
- All subsequent generations benefit from improved quality
- No additional ongoing costs

