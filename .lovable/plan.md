
# Fix Image Generation Context in Scheduled Post Modal

## Problem Identified

The **ScheduledPostModal** generates mediocre images because it passes **minimal context** to the generation function:

| What Modal Sends | What's Needed |
|------------------|---------------|
| name, logo_url, url, description | ✅ Marketing Context (audiences, products, colors) |
| ❌ No `marketing_context` | ✅ `ai_context_summary` |
| ❌ No `detected_language` | ✅ `theme_color` |
| ❌ No `scraped_markdown` | ✅ All branding data |

The **Campaign Generator** works well because it fetches the **full project** with `select("*")` and passes everything to the Generation Context Guard.

---

## Solution Overview

Update `ScheduledPostModal.tsx` to:
1. Fetch the **complete project data** including `marketing_context`
2. Pass **all context** to `generate-image` function
3. Let the Context Guard build **rich, brand-aligned prompts**

---

## Implementation Steps

### Step 1: Expand Project Context Interface

Update the `projectContext` state to include all necessary fields:

```typescript
const [projectContext, setProjectContext] = useState<{
  name: string;
  logo_url: string | null;
  url: string | null;
  description: string | null;
  // NEW fields for rich context
  marketing_context: any | null;
  ai_context_summary: string | null;
  detected_language: string | null;
  theme_color: string | null;
  avatar_url: string | null;
  scraped_markdown: string | null;
} | null>(null);
```

### Step 2: Fetch Full Project Data

Change the project query to retrieve all needed fields:

```typescript
const { data } = await supabase
  .from("projects")
  .select(`
    name, logo_url, url, description,
    marketing_context, ai_context_summary,
    detected_language, theme_color, 
    avatar_url, scraped_markdown
  `)
  .eq("id", post.project_id)
  .single();
```

### Step 3: Pass Full Context to generate-image

Update the `handleGenerate` function to send complete branding data:

```typescript
const { data, error } = await supabase.functions.invoke("generate-image", {
  body: {
    prompt: post.ai_prompt || "Create engaging social media image",
    aspectRatio: "1:1",
    quality: imageQuality.id === "fast-image" ? "standard" : 
             imageQuality.id === "medium-image" ? "pro" : "cinema",
    // Full brand context (NEW)
    logoUrl: projectContext?.logo_url,
    brandName: projectContext?.name,
    projectUrl: projectContext?.url,
    detectedLanguage: projectContext?.detected_language || "en",
    marketingContext: projectContext?.marketing_context,
    aiContextSummary: projectContext?.ai_context_summary,
    themeColor: projectContext?.theme_color,
    avatarUrl: projectContext?.avatar_url,
  },
});
```

### Step 4: Remove Manual Prompt Enhancement

The current code manually builds a basic prompt:
```typescript
if (projectContext) {
  const brandInfo = [];
  if (projectContext.name) brandInfo.push(`Brand: ${projectContext.name}`);
  // ...
  enhancedPrompt = `${enhancedPrompt}\n\nBrand Context:\n${brandInfo.join('\n')}`;
}
```

This should be **removed** because the `generate-image` Edge Function already has the **Generation Context Guard** which builds a much richer prompt with:
- Target audience pain points and desires
- Products/services to showcase
- Visual identity and color palette
- Brand personality and tone
- Content guidelines

---

## Expected Results

### Before (Current - Poor Context)
```
Prompt: "Create a promotional social media post"
Brand Context:
  Brand: MyBrand
  About: We sell products...
```
→ Generic, bland images

### After (With Full Context)
```
=== BRAND CONTEXT FOR MYBRAND ===
[OUTPUT LANGUAGE: FRENCH]
BRAND NAME: MyBrand
WEBSITE: https://mybrand.com
PRIMARY COLOR: #3B82F6

=== TARGET AUDIENCE ===
WHO: Small business owners
THEIR PAIN POINTS: Lack of time, no marketing skills
THEIR DESIRES: More customers, professional content

=== PRODUCTS/SERVICES TO SHOWCASE ===
1. AEO - Get found on AI search engines
2. Autoblogging - Daily expert articles

=== VISUAL STYLE ===
AESTHETIC: Modern, tech-forward
MOOD: Professional yet approachable

=== GENERATION TASK (IMAGE) ===
Create a promotional social media post

=== MANDATORY VISUAL BRANDING RULES ===
DOMINANT COLOR (CRITICAL): bright blue (#3B82F6) MUST be visible...
```
→ Rich, on-brand, conversion-focused images

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ScheduledPostModal.tsx` | Expand project fetch & pass full context to generate-image |

---

## Technical Details

The `generate-image` Edge Function already has:
- `generation-context-guard.ts` integration
- `validateAndBuildContext()` function
- Support for all marketing context fields

The only change needed is on the **frontend** to send this data that's already being fetched but not passed.
