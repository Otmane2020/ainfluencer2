import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const status = body?.status === "success" ? "success" : "error";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && serviceRole) {
      const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
      const { error } = await admin.from("deployment_events").insert({
        status,
        commit_sha: typeof body?.commit === "string" ? body.commit : null,
        actor: typeof body?.actor === "string" ? body.actor : null,
        run_url: typeof body?.run_url === "string" ? body.run_url : null,
      });
      if (error) console.error("[DEPLOY-WEBHOOK] audit insert failed", error.message);
    }

    console.log("[DEPLOY-WEBHOOK]", JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true, received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[DEPLOY-WEBHOOK] parse error:", err);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
