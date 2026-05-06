import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "support"]);
    if (!roles?.length) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const perPage = parseInt(url.searchParams.get("perPage") ?? "50");
    const search = url.searchParams.get("search") ?? "";

    const { data: list, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const filtered = search
      ? list.users.filter((u) => u.email?.toLowerCase().includes(search.toLowerCase()))
      : list.users;

    const ids = filtered.map((u) => u.id);
    const [{ data: subs }, { data: credits }, { data: rolesAll }] = await Promise.all([
      supabase.from("subscriptions").select("user_id, plan_id, status, renews_at, stripe_customer_id, stripe_subscription_id").in("user_id", ids),
      supabase.from("credits").select("user_id, balance").in("user_id", ids),
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    const enriched = filtered.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      subscription: subs?.find((s) => s.user_id === u.id) ?? null,
      credits: credits?.find((c) => c.user_id === u.id)?.balance ?? 0,
      roles: rolesAll?.filter((r) => r.user_id === u.id).map((r) => r.role) ?? [],
    }));

    return new Response(JSON.stringify({ users: enriched, total: list.total ?? enriched.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
