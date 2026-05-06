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

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles?.length) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

    const { target_user_id } = await req.json();
    if (!target_user_id) throw new Error("target_user_id required");

    const { data: target } = await supabase.auth.admin.getUserById(target_user_id);
    if (!target?.user?.email) throw new Error("Target user not found");

    // Generate a magic link the admin can open to log in as the target user
    const { data: link, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
    });
    if (error) throw error;

    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: "impersonate",
      target_user_id,
      details: { email: target.user.email },
    });

    return new Response(JSON.stringify({ action_link: link.properties?.action_link, email: target.user.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
