

# Fix Service Detection: Extract Real Business Services

## Problem Identified
The current extraction logic captures **marketing slogans** instead of **real sellable services**:
- **Currently detected**: "Deep Research on YOUR Business", "Write 1 Expert Article Daily", "Watch Traffic Explode" (marketing copy)
- **Should detect**: "AEO", "SEO", "Autoblogging", "Autoposting" (actual services)

## Root Cause Analysis
The `scrape-project-url` edge function uses generic pattern matching:
1. Captures ALL markdown headers (H1-H3) regardless of context
2. Grabs bold text patterns `**text**` which often contain marketing copy
3. Has insufficient noise filtering for promotional language

## Solution: AI-Powered Service Extraction

Replace heuristic extraction with AI analysis using Lovable AI (`google/gemini-2.5-flash`) to intelligently identify real services.

---

## Implementation Plan

### Step 1: Create New `extract-services-ai` Edge Function
Create a dedicated edge function that uses AI to extract services intelligently.

**Logic:**
```text
1. Receive markdown content from website scrape
2. Send to Gemini with specific prompt:
   - "Extract ONLY the sellable products/services from this content"
   - "Ignore marketing slogans, CTAs, and promotional text"
   - "Return as JSON array of 3-8 concise service names"
3. Parse response and return clean service list
```

### Step 2: Update `scrape-project-url` Function
Modify to call the AI extraction instead of heuristic parsing.

**Changes:**
- Remove `extractServicesFromMarkdown()` function
- After scraping, call `extract-services-ai` with the markdown
- Store AI-extracted services in response

### Step 3: Add Fallback Logic
If AI extraction fails, use minimal heuristic fallback:
- Extract only from navigation menus or footer links
- Look for explicit "Services" or "Products" sections only

---

## Technical Details

### AI Prompt Structure
```
Analyze this business website content and extract ONLY the actual products or services being sold.

RULES:
- Return ONLY sellable services/products (e.g., "SEO", "AEO", "Autoblogging")
- IGNORE marketing slogans (e.g., "Watch Traffic Explode", "Your Only Risk is NOT Trying")
- IGNORE CTAs (e.g., "Get Started", "Try Free", "Learn More")
- IGNORE testimonials, FAQ, pricing plan names
- Return 3-8 items maximum
- Keep names concise (1-4 words each)

Website content:
{markdown}

Return JSON array only: ["Service 1", "Service 2", ...]
```

### Files to Modify

| File | Action |
|------|--------|
| `supabase/functions/extract-services-ai/index.ts` | CREATE - AI-powered extraction |
| `supabase/functions/scrape-project-url/index.ts` | MODIFY - Use AI extraction |
| `supabase/config.toml` | UPDATE - Add new function |

### Expected Results
For the website mentioned:
- **Before**: "Deep Research on YOUR Business", "Write 1 Expert Article Daily"...
- **After**: "AEO for Companies", "SEO", "Autoblogging", "Autoposting"

---

## Cost & Performance
- Uses `google/gemini-2.5-flash` (fast, low-cost)
- Adds ~500ms to scrape time
- No additional API keys required (uses Lovable AI)

