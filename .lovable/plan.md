
# Plan: Add AI Image Generator Page

## Overview
Add a new **Images** page between **Videos** and **Posts** in the navigation, with the same professional AI generation experience. Users will be able to generate AI images using prompts with full scenario support (Sector, Style, Tone), project context, and commercial product tiers.

---

## Architecture Summary

The Images page will mirror the VideoGenerator workflow:
1. **Project Selection** - Choose a project for context
2. **Scenario System** - Select Business Sector + Style + Tone
3. **Prompt Input** - Write or AI-generate the image prompt
4. **Product Selection** - Choose image quality tier (Standard, Pro, Studio)
5. **Generation** - Create image using Lovable AI

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Images Page Layout                          │
├─────────────────────────────────────────────────────────────────┤
│  Header: "Image Generator" + Project Selector                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  ┌──────────────────────┐ │
│  │   ImageGenerator Component       │  │  Preview & History   │ │
│  │                                  │  │                      │ │
│  │  [Scenario Selector Button]      │  │  Generated Image     │ │
│  │  [Quality: Standard/Pro/Studio]  │  │  Preview Card        │ │
│  │                                  │  │                      │ │
│  │  ┌──────────────────────────┐   │  │  Recent Images       │ │
│  │  │  Prompt Textarea         │   │  │  (mini gallery)      │ │
│  │  │  + AI Sparkles Button    │   │  │                      │ │
│  │  └──────────────────────────┘   │  │                      │ │
│  │                                  │  │  [Download] [Share]  │ │
│  │  [🎨 Generate Image]             │  │                      │ │
│  └─────────────────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. `src/pages/Images.tsx` (New Page)
Main page component following Videos.tsx structure:
- Project selector dropdown
- ImageGenerator component integration
- Image preview section
- Recent generations gallery

### 2. `src/components/ImageGenerator.tsx` (New Component)
Core generation component mirroring VideoGenerator:
- Prompt textarea with AI generation button
- ScenarioSelector integration (Sector/Style/Tone)
- ProductSelector for image quality tiers (filtered to `category: "image"`)
- Project context popover for AI prompt generation
- Loading states and progress feedback
- Integration with `generate-image` edge function

### 3. `src/components/ImagePreview.tsx` (New Component)
Preview and gallery component:
- Large preview of last generated image
- Download button
- Share button (opens SocialShareModal)
- Mini gallery of recent generations
- Delete functionality

### 4. `supabase/functions/generate-image/index.ts` (New Edge Function)
Dedicated image generation function:
- Accept prompt, scenario context, quality tier
- Map commercial products to internal models:
  - Standard → `google/gemini-2.5-flash-image`
  - Pro → `google/gemini-3-pro-image-preview`
  - Studio → `google/gemini-3-pro-image-preview` (with enhanced prompt)
- Apply scenario context to image prompt
- Return base64 image URL
- Handle rate limits (429) and credits (402)

### 5. `src/lib/imageScenarios.ts` (New - Optional)
Image-specific scenario presets (can reuse videoScenarios initially):
- Same Sector/Style/Tone system
- Image-focused prompt contexts
- Presets like "Product Shot", "Social Banner", "Profile Picture"

---

## Files to Modify

### 1. `src/App.tsx`
Add route:
```tsx
import Images from "./pages/Images";
// Inside AppLayout routes:
<Route path="/images" element={<Images />} />
```

### 2. `src/components/layout/AppSidebar.tsx`
Add Images to `contentNavItems`:
```tsx
const contentNavItems = [
  { title: "Videos", url: "/videos", icon: Video },
  { title: "Images", url: "/images", icon: ImageIcon },  // NEW
  { title: "Posts", url: "/posts", icon: FileText },
];
```

### 3. `src/components/layout/MobileHeader.tsx`
Add Images navigation item (if mobile header has nav items)

### 4. `supabase/config.toml`
Add new edge function configuration:
```toml
[functions.generate-image]
verify_jwt = false
```

---

## Technical Details

### ImageGenerator Component Features:
1. **Prompt Workspace**
   - Large textarea for image description
   - Sparkles button for AI-assisted prompt generation
   - Project context popover (same as VideoGenerator)

2. **Scenario Integration**
   - Reuse `ScenarioSelector` component
   - Apply scenario context to prompts automatically
   - Visual indicators showing active scenario

3. **Quality Selection**
   - Filter `COMMERCIAL_PRODUCTS` to `category: "image"`
   - Display 3 tiers: Standard (2€), Pro (5€), Studio (12€)
   - Visual product cards with features

4. **Generation Flow**
   - Show loading state during generation
   - Display generated image in preview
   - Save to Supabase storage (`media` bucket)
   - Update history automatically

### Edge Function Logic:
```typescript
// generate-image/index.ts structure
- Parse prompt, quality tier, scenario IDs
- Build enhanced prompt with scenario context
- Select model based on quality tier
- Call Lovable AI Gateway with image modalities
- Upload result to Supabase storage
- Return public URL
```

### Storage:
- Use existing `media` bucket
- Path: `images/{userId}/{timestamp}.png`
- Enable download via public URL

---

## UI/UX Details

### Design Consistency:
- Same dark theme as Videos page
- Same card styling and spacing
- Same button variants (gradient-primary for main CTA)
- Same mobile-first responsive layout

### Prompt AI Generation:
When user clicks Sparkles button:
1. Fetch project context (name, description, scraped content)
2. Apply selected scenario (Sector/Style/Tone)
3. Generate detailed image prompt via AI
4. Auto-fill the prompt textarea

### Quality Tier Display:
```text
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  AI Image        │  │  AI Image Pro    │  │  AI Image Studio │
│  Standard        │  │  ⭐ POPULAR      │  │  🏆 PRO          │
│                  │  │                  │  │                  │
│  HD Quality      │  │  Ultra HD 2K     │  │  4K Ultra HD     │
│  Fast generation │  │  Photorealistic  │  │  Perfect quality │
│                  │  │                  │  │                  │
│  2€/image        │  │  5€/image        │  │  12€/image       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Implementation Order

1. **Sidebar & Routing** - Add navigation and route
2. **Edge Function** - Create `generate-image` function
3. **ImageGenerator Component** - Core generation UI
4. **ImagePreview Component** - Preview and gallery
5. **Images Page** - Assemble components
6. **Testing** - Verify AI generation and storage

---

## Existing Assets to Reuse

| Asset | Usage |
|-------|-------|
| `ScenarioSelector` | Scenario selection UI |
| `ProductSelector` | Quality tier selection (filtered) |
| `COMMERCIAL_PRODUCTS` | Image product definitions |
| `videoScenarios.ts` | Sector/Style/Tone data |
| `SocialShareModal` | Share generated images |
| `media` bucket | Store generated images |
| Lovable AI Gateway | Image generation API |
