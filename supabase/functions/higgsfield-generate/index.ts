// Higgsfield API proxy - handles image + video generation with polling
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const HIGGSFIELD_BASE = "https://platform.higgsfield.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const key = Deno.env.get("HIGGSFIELD_API_KEY");
  const secret = Deno.env.get("HIGGSFIELD_API_SECRET");
  if (!key || !secret) {
    return new Response(
      JSON.stringify({ error: "Higgsfield credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = `Key ${key}:${secret}`;

  try {
    const body = await req.json();
    const { action, endpoint, payload, request_id } = body ?? {};

    // Status polling
    if (action === "status") {
      if (!request_id) {
        return new Response(JSON.stringify({ error: "request_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await fetch(`${HIGGSFIELD_BASE}/requests/${request_id}/status`, {
        headers: { Authorization: authHeader, Accept: "application/json" },
      });
      const data = await r.json();
      return new Response(JSON.stringify(data), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel
    if (action === "cancel") {
      const r = await fetch(`${HIGGSFIELD_BASE}/requests/${request_id}/cancel`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      return new Response(JSON.stringify({ ok: r.ok, status: r.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Submit generation
    if (!endpoint) {
      return new Response(JSON.stringify({ error: "endpoint required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const p = (payload ?? {}) as Record<string, unknown>;
    if (!p.prompt || typeof p.prompt !== "string" || !p.prompt.trim()) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (endpoint.startsWith("/v1/image2video") && !p.image_url) {
      return new Response(JSON.stringify({ error: "image_url is required for image-to-video generation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Higgsfield's v2 API takes the model as part of the endpoint path
    // (e.g. /v1/text2image/soul, /v1/image2video/dop) and the params flat
    // (not wrapped) in the POST body.
    const r = await fetch(`${HIGGSFIELD_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      status: r.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
