import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles?.length) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

    const { target_user_id, mode = "at_period_end" } = await req.json();
    const { data: sub } = await supabase.from("subscriptions").select("stripe_subscription_id").eq("user_id", target_user_id).maybeSingle();
    if (!sub?.stripe_subscription_id) throw new Error("No Stripe subscription");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    if (mode === "immediately") {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      await supabase.from("subscriptions").update({ status: "canceled" }).eq("user_id", target_user_id);
    } else {
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    }

    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id, action: "cancel_subscription", target_user_id, details: { mode },
    });
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
