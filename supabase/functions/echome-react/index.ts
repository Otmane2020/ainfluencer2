import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "EchoMe service not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as { situation?: string; context?: string };
    const situation = (body.situation ?? "").trim() || "Une question ou un message m’est adressé.";
    const context = (body.context ?? "").trim();

    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    const { data: echome } = await supabase.from("echome_profiles").select("*").eq("user_id", user.id).maybeSingle();

    const name = echome?.display_name ?? profile?.display_name ?? "L'utilisateur";
    const tone = echome?.tone ?? "friendly";
    const traits = echome?.traits ?? "authentique, bienveillant";
    const samplePhrases = echome?.sample_phrases ?? "";
    const language = echome?.language ?? "fr";

    const systemPrompt = `Tu es EchoMe : le double numérique de "${name}". Tu réagis UNIQUEMENT à sa place, comme lui/elle le ferait.

PROFIL:
- Ton: ${tone}
- Traits: ${traits}
${samplePhrases ? `- Exemples de réponses qu'il/elle pourrait faire:\n${samplePhrases}` : ""}

RÈGLES:
- Réponds dans la même langue que la situation (surtout ${language} si la situation est en français).
- Une seule réponse courte et naturelle, comme si ${name} parlait.
- Pas de méta-commentaire ("En tant que ton double..."). Réponds directement.
- Reste cohérent avec le caractère décrit.`;

    const userMessage = context
      ? `Situation: ${situation}\nContexte supplémentaire: ${context}\n\nRéagis à ma place (une seule réponse courte):`
      : `Situation: ${situation}\n\nRéagis à ma place (une seule réponse courte):`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[echome-react] OpenRouter error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "EchoMe n'a pas pu répondre. Réessaie." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "Pas de réponse générée.";

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[echome-react]", e);
    return new Response(
      JSON.stringify({ error: "Erreur serveur EchoMe." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
