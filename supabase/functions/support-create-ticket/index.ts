// Create a support ticket from the in-app widget and notify support inbox via Resend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_INBOX = "benyahya.otmane@gmail.com";
const FROM = "ClipMotion Support <support@notify.clipmotion.ai>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const { subject, message } = await req.json();

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "subject and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = user?.email || "anonymous@clipmotion.ai";

    const { data: ticket, error: tErr } = await admin
      .from("support_tickets")
      .insert({
        user_id: user?.id ?? null,
        subject,
        email: fromEmail,
        status: "open",
        priority: "normal",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (tErr) throw tErr;

    const messageId = `<ticket-${ticket.id}-${crypto.randomUUID()}@clipmotion.ai>`;
    await admin.from("support_messages").insert({
      ticket_id: ticket.id,
      direction: "inbound",
      from_email: fromEmail,
      to_email: SUPPORT_INBOX,
      from_name: user?.user_metadata?.full_name || null,
      author_user_id: user?.id ?? null,
      body_text: message,
      external_message_id: messageId,
    });

    // Notify support inbox via Resend
    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (RESEND) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: [SUPPORT_INBOX],
            reply_to: fromEmail,
            subject: `[Ticket #${ticket.id.slice(0, 8)}] ${subject}`,
            text: `From: ${fromEmail}\nUser ID: ${user?.id || "guest"}\n\n${message}`,
            headers: { "Message-ID": messageId },
          }),
        });
      } catch (e) {
        console.error("[support-create-ticket] resend notify failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, ticket_id: ticket.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[support-create-ticket]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
