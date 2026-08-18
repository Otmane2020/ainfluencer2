import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const HIGGSFIELD_BASE = "https://platform.higgsfield.ai";
const HIGGSFIELD_PROVIDER_CREDIT_USD = 0.05;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function pickErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const candidate = d.error ?? d.message ?? d.detail ?? d.title;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (Array.isArray(d.detail) && d.detail.length) return JSON.stringify(d.detail);
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 500) };
  }
}

function errorMentionsMissingParams(data: unknown) {
  const serialized = JSON.stringify(data ?? "").toLowerCase();
  return serialized.includes('"params"') && (serialized.includes("field required") || serialized.includes("missing"));
}

function isVideoEndpoint(endpoint: string) {
  return /\/dop(\/|$)|kling-video|seedance|image-to-video|image2video|text-to-video|\/video\//i.test(endpoint);
}

async function submitToHiggsfield(
  endpoint: string,
  payload: Record<string, unknown>,
  authHeader: string,
) {
  const request = async (body: unknown, bodyMode: "flat" | "params") => {
    const response = await fetch(`${HIGGSFIELD_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await readJson(response) as Record<string, unknown>;
    return { response, data, bodyMode };
  };

  const flat = await request(payload, "flat");
  if (flat.response.ok) return flat;

  if (flat.response.status === 422 && errorMentionsMissingParams(flat.data)) {
    console.warn("[higgsfield] endpoint requires params envelope; retrying once", endpoint);
    return request({ params: payload }, "params");
  }

  return flat;
}

function normalizeDuration(value: unknown) {
  const duration = Number(value ?? 5);
  const supported = [3, 5, 8, 10];
  return supported.reduce((best, candidate) =>
    Math.abs(candidate - duration) < Math.abs(best - duration) ? candidate : best,
  );
}

function generationCreditCost(endpoint: string, payload: Record<string, unknown>) {
  const resolution = String(payload.resolution ?? "720p").toLowerCase();
  const is1080 = resolution.includes("1080");

  if (!isVideoEndpoint(endpoint)) return is1080 ? 8 : 5;

  const duration = normalizeDuration(payload.duration);
  const baseByDuration: Record<number, number> = {
    3: 18,
    5: 24,
    8: 36,
    10: 60,
  };
  const base = baseByDuration[duration] ?? 24;
  return is1080 ? base * 2 : base;
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) throw new Error("Supabase service-role credentials not configured");
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Supabase auth credentials not configured");

  const client = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function addTransaction(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  amount: number,
  type: string,
  description: string,
) {
  const { error } = await admin.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
  });
  if (error) console.warn("[higgsfield] credit transaction log failed", error.message);
}

async function refundCredits(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  credits: number,
  description: string,
) {
  const { error } = await admin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: credits,
  });
  if (error) {
    console.error("[higgsfield] refund failed", error.message);
    return false;
  }
  await addTransaction(admin, userId, credits, "refund", description);
  return true;
}

async function markTerminalAndRefundIfNeeded(
  admin: ReturnType<typeof getAdminClient>,
  requestId: string,
  upstreamStatus: string,
) {
  const { data: reservation } = await admin
    .from("generation_billing_reservations")
    .select("request_id,user_id,credits,status")
    .eq("request_id", requestId)
    .maybeSingle();

  if (!reservation || reservation.status !== "reserved") return { refunded: false };

  if (upstreamStatus === "completed") {
    await admin
      .from("generation_billing_reservations")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("status", "reserved");
    return { refunded: false };
  }

  if (upstreamStatus !== "failed" && upstreamStatus !== "nsfw") return { refunded: false };

  const { data: claimed, error: claimError } = await admin
    .from("generation_billing_reservations")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .eq("status", "reserved")
    .select("request_id")
    .maybeSingle();

  if (claimError || !claimed) return { refunded: false };

  const refunded = await refundCredits(
    admin,
    reservation.user_id,
    reservation.credits,
    `Refunded ${reservation.credits} credits for failed Higgsfield request ${requestId}`,
  );

  if (!refunded) {
    await admin
      .from("generation_billing_reservations")
      .update({ status: "reserved", updated_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("status", "refunded");
  }

  return { refunded };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await authenticate(req);
    if (!user) return json({ error: "Authentication required" }, 401);

    const key = Deno.env.get("HIGGSFIELD_API_KEY");
    const secret = Deno.env.get("HIGGSFIELD_API_SECRET");
    const body = await req.json();
    const { action = "submit", endpoint, payload, request_id } = body ?? {};

    if (action === "health") {
      return json({
        ok: Boolean(key && secret),
        configured: Boolean(key && secret),
        provider: "higgsfield",
      });
    }

    if (!key || !secret) return json({ error: "Motion service is not configured", code: "HIGGSFIELD_NOT_CONFIGURED" }, 503);

    const admin = getAdminClient();
    const authHeader = `Key ${key}:${secret}`;

    if (action === "quote") {
      if (!endpoint) return json({ error: "endpoint required" }, 400);
      const incoming = (payload ?? {}) as Record<string, unknown>;
      const nested = incoming.params;
      const p = nested && typeof nested === "object" && !Array.isArray(nested)
        ? { ...(nested as Record<string, unknown>) }
        : { ...incoming };
      const credits = generationCreditCost(endpoint, p);
      return json({
        credits,
        estimated_provider_cost_usd: Number((credits * HIGGSFIELD_PROVIDER_CREDIT_USD).toFixed(2)),
      });
    }

    if (action === "status") {
      if (!request_id) return json({ error: "request_id required" }, 400);

      const { data: reservation } = await admin
        .from("generation_billing_reservations")
        .select("user_id,credits")
        .eq("request_id", request_id)
        .maybeSingle();

      if (reservation && reservation.user_id !== user.id) {
        return json({ error: "Request not found" }, 404);
      }

      const response = await fetch(`${HIGGSFIELD_BASE}/requests/${request_id}/status`, {
        headers: { Authorization: authHeader, Accept: "application/json" },
      });
      const data = await readJson(response) as Record<string, unknown>;
      if (!response.ok) {
        return json({ error: pickErrorMessage(data, `Higgsfield API error (${response.status})`) }, response.status);
      }

      const status = String(data.status ?? "");
      const terminal = await markTerminalAndRefundIfNeeded(admin, request_id, status);
      return json({
        ...data,
        credits_charged: reservation?.credits,
        credits_refunded: terminal.refunded,
      });
    }

    if (action === "cancel") {
      if (!request_id) return json({ error: "request_id required" }, 400);

      const { data: reservation } = await admin
        .from("generation_billing_reservations")
        .select("user_id")
        .eq("request_id", request_id)
        .maybeSingle();
      if (reservation && reservation.user_id !== user.id) return json({ error: "Request not found" }, 404);

      const response = await fetch(`${HIGGSFIELD_BASE}/requests/${request_id}/cancel`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      return json({ ok: response.ok, status: response.status });
    }

    if (!endpoint || typeof endpoint !== "string") return json({ error: "endpoint required" }, 400);
    const incomingPayload = (payload ?? {}) as Record<string, unknown>;
    const nestedParams = incomingPayload.params;
    const p = nestedParams && typeof nestedParams === "object" && !Array.isArray(nestedParams)
      ? { ...(nestedParams as Record<string, unknown>) }
      : { ...incomingPayload };

    if (!p.prompt || typeof p.prompt !== "string" || !p.prompt.trim()) {
      return json({ error: "prompt is required" }, 400);
    }
    const inputImages = Array.isArray(p.input_images) ? p.input_images : [];
    const hasInputImage = inputImages.some((item) => {
      if (!item || typeof item !== "object") return false;
      const url = (item as Record<string, unknown>).image_url;
      return typeof url === "string" && url.trim().length > 0;
    });
    if (isVideoEndpoint(endpoint) && !p.image_url && !hasInputImage) {
      return json({ error: "A source image is required for image-to-video generation" }, 400);
    }

    const credits = generationCreditCost(endpoint, p);
    const { data: debited, error: debitError } = await admin.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: credits,
    });

    if (debitError) {
      console.error("[higgsfield] credit debit failed", debitError.message);
      return json({ error: "Unable to reserve generation credits" }, 500);
    }
    if (!debited) {
      return json({ error: "Insufficient credits", required_credits: credits }, 402);
    }

    await addTransaction(
      admin,
      user.id,
      -credits,
      "consumption",
      `Reserved ${credits} credits for Higgsfield ${endpoint}`,
    );

    const submitted = await submitToHiggsfield(endpoint, p, authHeader);
    const { response, data, bodyMode } = submitted;

    if (!response.ok) {
      await refundCredits(
        admin,
        user.id,
        credits,
        `Refunded ${credits} credits because Higgsfield submit failed (${response.status})`,
      );
      return json(
        {
          error: pickErrorMessage(data, `Higgsfield API error (${response.status})`),
          provider_error: data,
          request_body_mode: bodyMode,
          credits_refunded: true,
        },
        response.status,
      );
    }

    const requestId = typeof data.request_id === "string" ? data.request_id : null;
    if (!requestId) {
      await refundCredits(
        admin,
        user.id,
        credits,
        `Refunded ${credits} credits because Higgsfield returned no request_id`,
      );
      return json({
        error: "Higgsfield returned no request_id",
        provider_response: data,
        request_body_mode: bodyMode,
        credits_refunded: true,
      }, 502);
    }

    const { error: reservationError } = await admin.from("generation_billing_reservations").upsert({
      request_id: requestId,
      user_id: user.id,
      provider: "higgsfield",
      endpoint,
      credits,
      status: "reserved",
      updated_at: new Date().toISOString(),
    });
    if (reservationError) {
      console.error("[higgsfield] billing reservation persistence failed", reservationError.message);
    }

    return json({
      ...data,
      request_body_mode: bodyMode,
      credits_charged: credits,
      estimated_provider_cost_usd: Number((credits * HIGGSFIELD_PROVIDER_CREDIT_USD).toFixed(2)),
    });
  } catch (error) {
    console.error("[higgsfield] unhandled error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
