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
    const { postUrl, postText, tone, brandContext } = await req.json();

    if (!postUrl && !postText) {
      return new Response(
        JSON.stringify({ error: "Post URL or text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: If only URL provided, scrape the post text
    let scrapedText = postText || "";

    if (!scrapedText && postUrl) {
      // Try Firecrawl first
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlKey) {
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: postUrl,
              formats: ["markdown"],
              onlyMainContent: true,
              waitFor: 3000,
            }),
          });

          const scrapeData = await scrapeRes.json();
          scrapedText = scrapeData?.data?.markdown || scrapeData?.markdown || "";
          console.log("Scraped text length:", scrapedText.length);
        } catch (e) {
          console.error("Firecrawl scrape error:", e);
        }
      }

      // Fallback: simple fetch
      if (!scrapedText) {
        try {
          const res = await fetch(postUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ClipMotion/1.0)",
            },
          });
          const html = await res.text();
          // Extract text from meta tags or og:description
          const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) ||
                          html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) ;
          if (ogMatch) {
            scrapedText = ogMatch[1];
          }
        } catch (e) {
          console.error("Fallback scrape error:", e);
        }
      }

      if (!scrapedText) {
        return new Response(
          JSON.stringify({
            error: "Could not extract post content. Please paste the text manually.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 2: Generate AI reply
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const toneInstruction = tone === "expert"
      ? "Position yourself as an industry expert adding deep value."
      : tone === "provocative"
      ? "Be thought-provoking and challenge assumptions respectfully."
      : tone === "storytelling"
      ? "Share a brief personal anecdote or case study that relates."
      : tone === "supportive"
      ? "Be warm, supportive, and add complementary insights."
      : "Be professional, insightful, and add genuine value.";

    const brandBlock = brandContext
      ? `\n\nYour brand context (use subtly, never hard-sell):\n${brandContext}`
      : "";

    const systemPrompt = `You are a LinkedIn engagement strategist. Your goal is to craft replies that:
1. Get noticed by the post author (potential client/partner)
2. Demonstrate expertise without being salesy
3. Add genuine value to the conversation
4. Encourage further engagement
5. Are concise (2-4 sentences max, or a short list)

Rules:
- Never start with "Great post!" or generic compliments
- Lead with an insight, question, or complementary perspective
- Use natural language, not corporate jargon
- Include a subtle hook that invites reply
- Write in the same language as the original post
${toneInstruction}${brandBlock}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Here is the LinkedIn post to reply to:\n\n---\n${scrapedText.slice(0, 3000)}\n---\n\nGenerate 3 different reply options. Format each with a number (1., 2., 3.) followed by the reply text. Make each reply distinct in approach.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiRes.json();
    const rawReply = aiData.choices?.[0]?.message?.content || "";

    // Parse 3 replies
    const replies: string[] = [];
    const parts = rawReply.split(/\n\d+\.\s+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 10) {
        replies.push(trimmed);
      }
    }

    // Fallback if parsing didn't work
    if (replies.length === 0) {
      replies.push(rawReply.trim());
    }

    return new Response(
      JSON.stringify({
        success: true,
        scrapedText: scrapedText.slice(0, 500),
        replies: replies.slice(0, 3),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("LinkedIn reaction error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
