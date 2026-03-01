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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let searchTopic = query || "";

    if (mode === "trending") {
      const topics = [
        "AI marketing trends 2026",
        "SEO AEO answer engine optimization",
        "AI video generation for business",
        "LinkedIn personal branding tips",
        "SaaS growth hacking AI tools",
        "content marketing automation AI",
      ];
      searchTopic = topics[Math.floor(Math.random() * topics.length)];
    }

    console.log("Searching topic:", searchTopic);

    // Use Gemini with grounding to find real LinkedIn posts
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn post discovery assistant. Find 5-8 real, recent LinkedIn posts about the given topic.

For each post, return a JSON array with objects containing:
- "title": a short title summarizing the post (max 80 chars)
- "author": the author's name or handle
- "preview": the first 200 characters of the post content
- "fullText": a longer excerpt (up to 500 chars) of the post content
- "url": the LinkedIn post URL if available, or "" if not

Return ONLY the JSON array, no other text. If you cannot find real posts, generate realistic examples of the type of posts that would be trending on LinkedIn about this topic, with empty URLs.

IMPORTANT: Make the content realistic, insightful, and representative of high-engagement LinkedIn posts.`,
          },
          {
            role: "user",
            content: `Find recent LinkedIn posts about: ${searchTopic}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response (handle markdown code blocks)
    let results = [];
    try {
      const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      results = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Parse error:", e, "Raw:", raw.slice(0, 200));
      results = [];
    }

    // Ensure valid structure
    results = (Array.isArray(results) ? results : []).map((r: any) => ({
      url: r.url || "",
      title: r.title || "",
      author: r.author || "",
      preview: r.preview || "",
      fullText: r.fullText || r.preview || "",
    }));

    return new Response(
      JSON.stringify({ success: true, results, topic: searchTopic }),
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
