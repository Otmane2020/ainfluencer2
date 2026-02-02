import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { markdown, url } = await req.json();

    if (!markdown || typeof markdown !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'markdown' in body", services: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("[extract-services-ai] OPENROUTER_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "OPENROUTER_API_KEY not configured", services: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate markdown to avoid token limits (keep first 8000 chars)
    const truncatedMarkdown = markdown.substring(0, 8000);

    console.log("[extract-services-ai] Extracting services from", url || "provided markdown");
    console.log("[extract-services-ai] Markdown length:", truncatedMarkdown.length);

    const prompt = `Analyze this business website content and extract ONLY the actual products or services being sold.

RULES:
- Return ONLY sellable services/products (e.g., "SEO", "AEO", "Autoblogging", "Web Design", "Consulting")
- IGNORE marketing slogans (e.g., "Watch Traffic Explode", "Your Only Risk is NOT Trying", "Deep Research on YOUR Business")
- IGNORE CTAs (e.g., "Get Started", "Try Free", "Learn More", "Sign Up")
- IGNORE testimonials, FAQ section titles, pricing plan names (Basic, Pro, Enterprise)
- IGNORE navigation items (Home, About, Contact, Blog)
- IGNORE promotional phrases and action verbs (e.g., "Write 1 Expert Article Daily", "Get Backlinks Monthly")
- Return 3-8 items maximum
- Keep names concise (1-4 words each)
- If you cannot identify clear services, return an empty array

Website content:
${truncatedMarkdown}

Return ONLY a valid JSON array of service names, nothing else. Example: ["SEO", "Web Design", "Content Marketing"]`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[extract-services-ai] API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `AI API error: ${response.status}`, services: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    console.log("[extract-services-ai] Raw AI response:", content);

    // Parse JSON array from response
    let services: string[] = [];
    try {
      // Try to extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        services = JSON.parse(jsonMatch[0]);
        // Validate and clean
        services = services
          .filter((s: unknown) => typeof s === "string" && s.length >= 2 && s.length <= 40)
          .map((s: string) => s.trim())
          .slice(0, 8);
      }
    } catch (parseError) {
      console.error("[extract-services-ai] Failed to parse AI response:", parseError);
      services = [];
    }

    console.log("[extract-services-ai] Extracted services:", services);

    return new Response(
      JSON.stringify({ success: true, services }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[extract-services-ai] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error", services: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
