const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple HTML-to-markdown converter for fallback scraping
function htmlToMarkdown(html: string): string {
  let md = html;
  
  // Remove scripts, styles, and comments
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  
  // Convert headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');
  
  // Convert paragraphs and line breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  
  // Convert links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  
  // Convert bold and italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  
  // Convert list items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');
  
  // Remove all remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();
  
  return md;
}

// Extract metadata from HTML
function extractMetadata(html: string) {
  const getMetaContent = (name: string): string => {
    const match = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'));
    return match?.[1] || '';
  };

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || '';
  
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  const language = langMatch?.[1]?.substring(0, 2) || '';

  return {
    title,
    metaDescription: getMetaContent('description') || getMetaContent('og:description'),
    ogImage: getMetaContent('og:image'),
    language,
    favicon: (() => {
      const fav = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i);
      return fav?.[1] || '';
    })(),
  };
}

// Extract links from HTML
function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /<a[^>]*href=["']([^"'#][^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const href = match[1];
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      const absolute = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      if (!links.includes(absolute)) links.push(absolute);
    } catch {
      // skip invalid URLs
    }
  }
  return links.slice(0, 100);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, timeout: reqTimeout } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('[internal-scraper] Fetching:', formattedUrl);

    const controller = new AbortController();
    const timeoutMs = reqTimeout || 12000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NanoBananaBot/1.0; +https://nanobanana.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.error('[internal-scraper] HTTP error:', response.status);
      return new Response(
        JSON.stringify({ success: false, error: `HTTP ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('[internal-scraper] Received', html.length, 'chars');

    const metadata = extractMetadata(html);
    const markdown = htmlToMarkdown(html);
    const links = extractLinks(html, formattedUrl);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          markdown: markdown.substring(0, 50000),
          html: html.substring(0, 100000),
          title: metadata.title,
          metaDescription: metadata.metaDescription,
          ogImage: metadata.ogImage,
          language: metadata.language,
          favicon: metadata.favicon,
          links,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[internal-scraper] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
