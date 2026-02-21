import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, status, timestamp, environment, deployment, service } = body;

    console.log(`[RAILWAY-WEBHOOK] Event: ${type} | Status: ${status || "n/a"}`);
    console.log(`[RAILWAY-WEBHOOK] Payload: ${JSON.stringify(body).slice(0, 500)}`);

    // Store event in database for dashboard monitoring
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log critical events
    const criticalEvents = [
      "DEPLOYMENT_CRASHED",
      "DEPLOYMENT_FAILED",
      "DEPLOYMENT_OOM_KILLED",
      "DEPLOYMENT_DEPLOYED",
      "DEPLOYMENT_RESTARTED",
    ];

    const isCritical = criticalEvents.includes(type);

    // We can use generations table to track worker health by updating 
    // any processing generations if the worker crashed/failed
    if (type === "DEPLOYMENT_CRASHED" || type === "DEPLOYMENT_FAILED" || type === "DEPLOYMENT_OOM_KILLED") {
      console.warn(`[RAILWAY-WEBHOOK] ⚠️ Worker issue: ${type}`);
      
      // Mark any "processing" remotion generations as failed since worker is down
      const { data: stuckGens } = await supabase
        .from("generations")
        .select("id, user_id, quality")
        .eq("status", "processing")
        .eq("provider", "railway")
        .limit(50);

      if (stuckGens && stuckGens.length > 0) {
        console.log(`[RAILWAY-WEBHOOK] Failing ${stuckGens.length} stuck generations`);
        
        const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };

        for (const gen of stuckGens) {
          await supabase.from("generations").update({
            status: "failed",
            error_message: `Railway worker ${type.toLowerCase().replace(/_/g, " ")}`,
            progress: 0,
            completed_at: new Date().toISOString(),
          }).eq("id", gen.id);

          // Refund credits
          if (gen.user_id) {
            const refund = CREDIT_COSTS[gen.quality || "standard"] || 5;
            await supabase.rpc("add_credits", { p_user_id: gen.user_id, p_amount: refund });
            await supabase.from("credit_transactions").insert({
              user_id: gen.user_id,
              amount: refund,
              type: "refund",
              description: `Refund: Worker ${type.toLowerCase().replace(/_/g, " ")}`,
            });
          }
        }
      }
    }

    if (type === "DEPLOYMENT_DEPLOYED") {
      console.log(`[RAILWAY-WEBHOOK] ✅ Worker deployed successfully`);
    }

    return new Response(
      JSON.stringify({ received: true, type, critical: isCritical }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[RAILWAY-WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
