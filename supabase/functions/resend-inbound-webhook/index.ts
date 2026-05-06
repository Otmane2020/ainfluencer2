// Resend Inbound Email Webhook
// Receives inbound emails from Resend and creates/updates support tickets
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("[resend-inbound] event:", payload?.type);

    const data = payload?.data || payload;
    const from = data.from?.address || data.from || data.envelope?.from;
    const to = Array.isArray(data.to) ? data.to[0]?.address || data.to[0] : data.to;
    const subject = data.subject || "(no subject)";
    const text = data.text || "";
    const html = data.html || "";
    const messageId = data.message_id || data.headers?.["message-id"] || crypto.randomUUID();
    const inReplyTo = data.headers?.["in-reply-to"] || data.in_reply_to;
    const references = data.headers?.references || data.references;
    const attachments = data.attachments || [];

    if (!from) {
      return new Response(JSON.stringify({ ok: true, skipped: "no from" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find existing ticket by in-reply-to / references / from+subject
    let ticketId: string | null = null;
    if (inReplyTo || references) {
      const refs = [inReplyTo, ...(references?.split?.(/\s+/) || [])].filter(Boolean);
      const { data: msg } = await supabase
        .from("support_messages")
        .select("ticket_id")
        .in("external_message_id", refs)
        .maybeSingle();
      if (msg) ticketId = msg.ticket_id;
    }

    if (!ticketId) {
      const cleanSubject = subject.replace(/^(re|fwd|fw):\s*/gi, "").trim();
      const { data: existing } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("email", from)
        .ilike("subject", `%${cleanSubject}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) ticketId = existing.id;
    }

    if (!ticketId) {
      const { data: newTicket, error } = await supabase
        .from("support_tickets")
        .insert({
          subject,
          email: from,
          status: "open",
          priority: "normal",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      ticketId = newTicket.id;
    } else {
      await supabase
        .from("support_tickets")
        .update({ status: "open", last_message_at: new Date().toISOString() })
        .eq("id", ticketId);
    }

    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      direction: "inbound",
      from_email: from,
      to_email: to,
      subject,
      body_text: text,
      body_html: html,
      external_message_id: messageId,
      in_reply_to: inReplyTo,
      attachments,
    });

    return new Response(JSON.stringify({ ok: true, ticket_id: ticketId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[resend-inbound] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
