

# Fix: scrape-project-url CORS Headers

## Problem

The `scrape-project-url` function has incomplete CORS headers (line 3):

```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

It is **missing** the required Supabase SDK headers:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

When the browser sends a preflight OPTIONS request, the server rejects headers the SDK automatically includes, causing the entire request to fail silently.

## Fix

Update line 3 of `supabase/functions/scrape-project-url/index.ts`:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

## Secondary Issue: Low-quality fallback scraping

The logs also show that **Firecrawl credits are exhausted** (402 error), and the internal scraper only extracted **39 characters** for viva-mag.com. This means the fallback scraper is returning almost no useful content for JavaScript-heavy sites.

No code change needed for this -- the CORS fix should resolve the "not working" issue. The fallback scraper quality is a separate improvement.

## Files to modify
- `supabase/functions/scrape-project-url/index.ts` -- fix CORS headers on line 3

## Testing
After deploying, test by creating a new project and entering a URL to analyze.

