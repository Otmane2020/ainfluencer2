import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FOUNDER_EMAILS = ["benyahya.otmane@gmail.com"];

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!FOUNDER_EMAILS.includes(email)) {
      return new Response(JSON.stringify({ ok: true, updated: false }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing service env" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !member?.organization_id) {
      return new Response(JSON.stringify({ ok: false, error: "Organization not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const organizationId = member.organization_id as string;
    const now = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          organization_id: organizationId,
          plan_id: "business",
          status: "active",
          renews_at: null,
          stripe_customer_id: "lifetime_grant",
          stripe_subscription_id: null,
          started_at: now,
          updated_at: now,
        },
        { onConflict: "organization_id" }
      );

    if (upsertError) {
      return new Response(JSON.stringify({ ok: false, error: "Upsert failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, updated: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("grant-founder-lifetime error", err);
    return new Response(JSON.stringify({ ok: false, error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

