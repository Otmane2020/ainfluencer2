

## Problem Identified

The AI script generation in `VideoGenerator` is not receiving the scraped website content because of a **property name mismatch**:

| Component | What it accesses | What actually exists |
|-----------|------------------|----------------------|
| VideoGenerator.tsx (line 302) | `scrapeData?.content` | Does not exist |
| scrape-project-url returns | - | `scrapeData?.markdown` |

This is why the AI has no context - the `scrapedContent` variable is always `undefined`.

---

## Root Cause Analysis

In `src/components/VideoGenerator.tsx` (lines 299-302):
```typescript
const { data: scrapeData } = await supabase.functions.invoke("scrape-project-url", {
  body: { url: project.url },
});
scrapedContent = scrapeData?.content?.slice(0, 3000); // WRONG - should be .markdown
```

But `scrape-project-url/index.ts` returns (line 69-77):
```typescript
const scrapedData = {
  success: true,
  markdown: data.data?.markdown || "",  // This is the actual property name
  // ... other fields
};
```

---

## Fix Required

### File: `src/components/VideoGenerator.tsx`

**Change line 302 from:**
```typescript
scrapedContent = scrapeData?.content?.slice(0, 3000);
```

**To:**
```typescript
scrapedContent = scrapeData?.markdown?.slice(0, 3000);
```

---

## Technical Details

This single-line fix will:
1. Correctly extract the website markdown content from the Firecrawl scraping response
2. Pass that content to the `suggest-content` edge function via the `scrapedContent` parameter
3. Enable the AI to generate contextual scripts using the project's website information (just like Planning does)

---

## Expected Result

After fixing, when you click the AI sparkles button:
- The system will scrape the project URL
- Extract the markdown content (up to 3000 characters)
- Pass it to the AI along with the project name, description, and scenario
- Generate detailed scripts with scenes and context (matching Planning output)

