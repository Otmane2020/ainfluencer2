import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const ALLOWED_VOICES = new Set([
  "aura-2-asteria-en",
  "aura-2-atlas-en",
  "aura-2-odysseus-en",
  "aura-2-thalia-en",
  "aura-2-orion-en",
  "aura-2-agathe-fr",
  "aura-2-hector-fr",
  "aura-2-celeste-es",
  "aura-2-nestor-es",
]);

const DEFAULT_VOICE = "aura-2-asteria-en";
const AURA2_USD_PER_1K_CHARS = 0.03;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
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
  const { data, error } = await client.auth.getUser(authHeader.slice("Bearer ".length));
  return error ? null : data.user;
}

async function getDeepgramKey(admin: ReturnType<typeof getAdminClient>) {
  const envKey = Deno.env.get("DEEPGRAM_API_KEY");
  if (envKey?.trim()) return envKey.trim();

  const { data, error } = await admin.rpc("get_server_secret", { p_name: "DEEPGRAM_API_KEY" });
  if (error) {
    console.warn("[clipmotion-voice] Vault RPC lookup failed", error.message);
    return null;
  }

  return typeof data === "string" && data.trim() ? data.trim() : null;
}

async function validateDeepgramKey(apiKey: string) {
  try {
    const response = await fetch("https://api.deepgram.com/v1/projects", {
      method: "GET",
      headers: {
        Authorization: `Token ${apiKey}`,
        Accept: "application/json",
      },
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.warn("[clipmotion-voice] Deepgram health request failed", error);
    return { ok: false, status: 0 };
  }
}

function voiceCreditCost(characterCount: number) {
  return Math.max(1, Math.ceil(Math.max(0, characterCount) / 1500));
}

async function logTransaction(
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
  if (error) console.warn("[clipmotion-voice] transaction log failed", error.message);
}

async function refund(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  credits: number,
  reason: string,
) {
  const { error } = await admin.rpc("add_credits", { p_user_id: userId, p_amount: credits });
  if (error) {
    console.error("[clipmotion-voice] refund failed", error.message);
    return false;
  }
  await logTransaction(admin, userId, credits, "refund", reason);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await authenticate(req);
    if (!user) return json({ error: "Authentication required" }, 401);

    const admin = getAdminClient();
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "generate";
    const deepgramKey = await getDeepgramKey(admin);

    if (action === "health") {
      if (!deepgramKey) {
        return json({ ok: false, configured: false, provider: "deepgram", code: "VOICE_NOT_CONFIGURED" });
      }
      const credentialCheck = await validateDeepgramKey(deepgramKey);
      return json({
        ok: credentialCheck.ok,
        configured: credentialCheck.ok,
        credentials_present: true,
        credentials_valid: credentialCheck.ok,
        provider_status: credentialCheck.status,
        provider: "deepgram",
      });
    }

    if (!deepgramKey) return json({ error: "Voice service is not configured", code: "VOICE_NOT_CONFIGURED" }, 503);

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const attachToRequestId = typeof body?.attach_to_request_id === "string" ? body.attach_to_request_id.trim() : "";
    const requestedVoice = typeof body?.voice === "string" ? body.voice : DEFAULT_VOICE;
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;

    if (!text) return json({ error: "Voiceover script is required" }, 400);
    if (text.length > 12000) return json({ error: "Voiceover script is too long (12,000 characters maximum)" }, 400);

    const credits = voiceCreditCost(text.length);

    const { data: debited, error: debitError } = await admin.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: credits,
    });
    if (debitError) return json({ error: "Unable to reserve voiceover credits" }, 500);
    if (!debited) return json({ error: "Insufficient credits", required_credits: credits }, 402);

    await logTransaction(admin, user.id, -credits, "consumption", `Reserved ${credits} credits for Deepgram Aura-2 voiceover`);

    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}&encoding=mp3`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramKey}`,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!response.ok) {
      const upstream = await response.text();
      await refund(admin, user.id, credits, `Refunded ${credits} credits because Deepgram TTS failed`);
      return json(
        { error: `Voice generation failed (${response.status})`, detail: upstream.slice(0, 300), credits_refunded: true },
        response.status,
      );
    }

    const audio = await response.arrayBuffer();
    const filePath = `voiceovers/${user.id}/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await admin.storage.from("media").upload(filePath, audio, {
      contentType: "audio/mpeg",
      upsert: false,
    });

    if (uploadError) {
      await refund(admin, user.id, credits, `Refunded ${credits} credits because voiceover storage failed`);
      return json({ error: "Voice generated but could not be saved", credits_refunded: true }, 500);
    }

    const { data: publicUrlData } = admin.storage.from("media").getPublicUrl(filePath);
    const audioUrl = publicUrlData.publicUrl;
    const providerCost = Number(((text.length / 1000) * AURA2_USD_PER_1K_CHARS).toFixed(6));
    let attached = false;

    if (attachToRequestId) {
      const { data: updatedVideo, error: attachError } = await admin
        .from("generations")
        .update({ audio_url: audioUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("type", "video")
        .eq("external_task_id", attachToRequestId)
        .select("id")
        .maybeSingle();

      if (attachError) console.warn("[clipmotion-voice] video attachment failed", attachError.message);
      attached = Boolean(updatedVideo?.id);
    }

    if (!attached) {
      const { error: historyError } = await admin.from("generations").insert({
        user_id: user.id,
        type: "audio",
        status: "completed",
        progress: 100,
        provider: "deepgram",
        model: voice,
        prompt: text,
        media_url: audioUrl,
        audio_url: audioUrl,
        estimated_cost: providerCost,
        actual_cost: providerCost,
        completed_at: new Date().toISOString(),
      });
      if (historyError) console.warn("[clipmotion-voice] history insert failed", historyError.message);
    }

    return json({
      audio_url: audioUrl,
      credits_charged: credits,
      provider_cost_usd: providerCost,
      model: voice,
      characters: text.length,
      attached_to_video: attached,
      attached_to_request_id: attached ? attachToRequestId : null,
    });
  } catch (error) {
    console.error("[clipmotion-voice] unhandled error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
