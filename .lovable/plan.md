

## Fix: Image Prompt Language Detection for Starlinko

### Problem Identified

When generating AI prompts for images, the `ImageGenerator.tsx` component is **not passing the `detectedLanguage` parameter** to the `suggest-content` edge function. This causes all image prompts to default to English, even for French websites like Starlinko.

The database shows Starlinko is correctly configured with `detected_language: fr`, but this value is never sent to the AI.

### Root Cause

In `ImageGenerator.tsx`, the `generateAIPrompt` function:
1. Fetches scraped content (which includes `detectedLanguage` from Firecrawl)
2. Stores `project.detected_language` in the project object
3. **But never passes either value** to the `suggest-content` call

### Solution

Apply the same fix that was done for `VideoGenerator.tsx`:
1. Capture the scraped language from Firecrawl response
2. Use priority: scraped language > project setting > default "en"
3. Pass `detectedLanguage` and `logoUrl` to the `suggest-content` edge function

### Technical Changes

**File: `src/components/ImageGenerator.tsx`**

Update the `generateAIPrompt` function (lines 134-193):

```typescript
const generateAIPrompt = async (project: Project) => {
  setIsGeneratingPrompt(true);
  setProjectSelectorOpen(false);
  setSelectedProject(project);

  try {
    let scrapedContent: string | undefined;
    let scrapedLanguage: string | undefined;
    
    if (project.url) {
      try {
        const { data: scrapeData } = await supabase.functions.invoke("scrape-project-url", {
          body: { url: project.url },
        });
        scrapedContent = scrapeData?.markdown?.slice(0, 3000);
        scrapedLanguage = scrapeData?.detectedLanguage; // Capture scraped language
      } catch (scrapeError) {
        console.log("Scraping skipped:", scrapeError);
      }
    }

    // Priority: scraped language > project setting > default
    const finalLanguage = scrapedLanguage || project.detected_language || "en";
    console.log("[ImageGenerator] Using language:", finalLanguage);

    const { data, error } = await supabase.functions.invoke("suggest-content", {
      body: {
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description || project.name,
        projectUrl: project.url,
        scrapedContent,
        contentType: "image_prompt",
        productName: selectedProduct.name,
        productCategory: selectedProduct.category,
        sectorId: selectedSector?.id,
        styleId: selectedStyle?.id,
        toneId: selectedTone?.id,
        detectedLanguage: finalLanguage,        // NEW: Pass language
        logoUrl: project.avatar_url,             // NEW: Pass avatar/logo
      },
    });
    // ... rest unchanged
  }
};
```

### Expected Result

After this fix:
- Starlinko image prompts will be generated in **French**
- All projects will respect their configured language
- Fresh scraping will update the language if the website content changes

### Files to Modify

| File | Change |
|------|--------|
| `src/components/ImageGenerator.tsx` | Add `scrapedLanguage` capture, priority logic, and pass `detectedLanguage` + `logoUrl` to suggest-content |

