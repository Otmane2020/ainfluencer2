import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SUPPORT_INBOX = "oben.rockman@gmail.com";
const SUPPORT_FROM = "ClipMotion Support <support@ranki.ai>";

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(200).optional(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  source: z.string().trim().max(60).optional(),
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

export const sendSupportEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("Email service is not configured.");

    const html = `
      <h2>New support message${data.source ? ` (${escapeHtml(data.source)})` : ""}</h2>
      <p><strong>Name:</strong> ${escapeHtml(data.name || "—")}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email || "—")}</p>
      <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
      <hr />
      <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SUPPORT_FROM,
        to: [SUPPORT_INBOX],
        reply_to: data.email ? [data.email] : undefined,
        subject: `[ClipMotion Support] ${data.subject}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend error", res.status, detail);
      throw new Error("Failed to send your message. Please try again.");
    }

    return { success: true as const };
  });
