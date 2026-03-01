import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, mode } = await req.json();
    // mode: "search" (user keyword) or "trending" (auto curated topics)

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let searchQuery = query;

    if (mode === "trending") {
      // Curated trending topics for LinkedIn engagement
      const trendingTopics = [
        "AI marketing trends 2026",
        "SEO AEO answer engine optimization",
        "AI video generation business",
        "LinkedIn personal branding strategy",
        "SaaS growth hacking AI",
        "content marketing AI automation",
        "e-commerce AI tools",
      ];
      // Pick a random subset for variety
      const shuffled = trendingTopics.sort(() => Math.random() - 0.5);
      searchQuery = shuffled[0] + " site:linkedin.com";
    } else {
      searchQuery = (query || "") + " site:linkedin.com";
    }

    console.log("Searching:", searchQuery);

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        lang: "en",
        tbs: "qdr:w", // last week
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl search error:", data);
      return new Response(
        JSON.stringify({ error: data.error || "Search failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse results into clean post objects
    const results = (data.data || [])
      .filter((r: any) => r.url?.includes("linkedin.com"))
      .map((r: any) => {
        const markdown = r.markdown || "";
        // Extract a clean preview (first meaningful paragraph)
        const lines = markdown.split("\n").filter((l: string) => l.trim().length > 30);
        const preview = lines.slice(0, 3).join("\n").slice(0, 500);
        
        // Try to extract author from title or URL
        const urlMatch = r.url?.match(/linkedin\.com\/posts\/([^_]+)/);
        const author = urlMatch ? urlMatch[1].replace(/-/g, " ") : "";

        return {
          url: r.url,
          title: r.title || "",
          author,
          preview,
          fullText: markdown.slice(0, 3000),
        };
      })
      .filter((r: any) => r.preview.length > 50);

    return new Response(
      JSON.stringify({ success: true, results: results.slice(0, 8) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
