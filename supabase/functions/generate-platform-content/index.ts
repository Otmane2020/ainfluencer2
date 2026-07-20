import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const { action, platform_slug, format_slug, generation_type, variables, campaign_id } = await req.json();

    // ── Action: list platforms + formats ──
    if (action === "list_platforms") {
      const { data } = await supabase
        .from("platforms")
        .select("*, platform_formats(*)");
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Action: get formats for a platform ──
    if (action === "get_formats") {
      const { data } = await supabase
        .from("platform_formats")
        .select("*, platforms!inner(slug, name)")
        .eq("platforms.slug", platform_slug);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Action: generate content with Claude ──
    if (action === "generate") {
      if (!platform_slug || !format_slug || !generation_type) {
        throw new Error("Missing required fields: platform_slug, format_slug, generation_type");
      }

      // 1. Get AI config
      const { data: configs, error: configErr } = await supabase
        .rpc("get_ai_config", {
          p_platform: platform_slug,
          p_format: format_slug,
          p_type: generation_type,
        });

      if (configErr || !configs || configs.length === 0) {
        throw new Error(`No AI config found for ${platform_slug}/${format_slug}/${generation_type}`);
      }

      const config = configs[0];

      // 2. Fill template with variables
      let userPrompt = config.user_prompt_template;
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
        }
      }

      // 3. Call Claude API
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model || "claude-sonnet-4-20250514",
          max_tokens: config.max_tokens || 1000,
          temperature: Number(config.temperature) || 0.7,
          system: config.system_prompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        console.error("Claude API error:", claudeResponse.status, errText);
        if (claudeResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached, please try again later" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Claude API error: ${claudeResponse.status}`);
      }

      const claudeData = await claudeResponse.json();
      const generatedText = claudeData.content?.[0]?.text || "";
      const tokensInput = claudeData.usage?.input_tokens || 0;
      const tokensOutput = claudeData.usage?.output_tokens || 0;
      const costUsd = (tokensInput * 0.000003) + (tokensOutput * 0.000015); // Sonnet pricing

      // 4. Log usage
      if (userId) {
        await supabase.from("claude_usage_log").insert({
          user_id: userId,
          campaign_id: campaign_id || null,
          platform_slug,
          format_slug,
          generation_type,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          cost_usd: costUsd,
          generated_text: generatedText,
        });

        // Save to generated_prompts
        await supabase.from("generated_prompts").insert({
          user_id: userId,
          campaign_id: campaign_id || null,
          ai_config_id: config.config_id,
          prompt_type: generation_type,
          filled_prompt: userPrompt,
          ai_output: generatedText,
          platform_slug,
          format_slug,
          variables: variables || {},
        });
      }

      return new Response(JSON.stringify({
        generated_text: generatedText,
        platform: platform_slug,
        format: format_slug,
        type: generation_type,
        tokens_used: tokensInput + tokensOutput,
        cost_usd: costUsd,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-platform-content error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
