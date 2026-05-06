// Admin reply or forward on a support ticket via Resend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "ClipMotion Support <support@notify.clipmotion.ai>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: claimsData } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claimsData?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "support");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticket_id, body, mode = "reply", forward_to } = await req.json();
    if (!ticket_id || !body) {
      return new Response(JSON.stringify({ error: "ticket_id and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ticket } = await admin
      .from("support_tickets").select("*").eq("id", ticket_id).single();
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Last inbound message for In-Reply-To threading
    const { data: lastMsg } = await admin
      .from("support_messages")
      .select("external_message_id")
      .eq("ticket_id", ticket_id)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const recipient = mode === "forward" ? forward_to : ticket.email;
    if (!recipient) {
      return new Response(JSON.stringify({ error: "recipient missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = `<reply-${ticket_id}-${crypto.randomUUID()}@clipmotion.ai>`;
    const subject = mode === "forward"
      ? `Fwd: ${ticket.subject}`
      : ticket.subject.startsWith("Re:") ? ticket.subject : `Re: ${ticket.subject}`;

    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (!RESEND) throw new Error("RESEND_API_KEY missing");

    const resendBody: any = {
      from: FROM,
      to: [recipient],
      subject,
      text: body,
      html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap">${
        body.replace(/</g, "&lt;")
      }</div>`,
      headers: { "Message-ID": messageId },
    };
    if (lastMsg?.external_message_id && mode === "reply") {
      resendBody.headers["In-Reply-To"] = lastMsg.external_message_id;
      resendBody.headers["References"] = lastMsg.external_message_id;
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify(resendBody),
    });
    const sendData = await r.json();
    if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(sendData)}`);

    await admin.from("support_messages").insert({
      ticket_id,
      direction: "outbound",
      from_email: FROM,
      to_email: recipient,
      author_user_id: userId,
      subject,
      body_text: body,
      external_message_id: messageId,
      in_reply_to: lastMsg?.external_message_id || null,
    });

    await admin.from("support_tickets").update({
      status: mode === "forward" ? ticket.status : "pending",
      last_message_at: new Date().toISOString(),
    }).eq("id", ticket_id);

    return new Response(JSON.stringify({ ok: true, id: sendData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[support-send-reply]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
