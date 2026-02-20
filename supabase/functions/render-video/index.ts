import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default dark gradient image to use as background when no imageUrl is provided
const DEFAULT_BG_IMAGE =
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&q=80";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL") || "";
    const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

    if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Render worker not configured yet. Add RENDER_WORKER_URL and RENDER_WORKER_SECRET in your project secrets.",
          code: "WORKER_NOT_CONFIGURED",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-fix missing protocol prefix
    if (!RENDER_WORKER_URL.startsWith("http")) {
      RENDER_WORKER_URL = `https://${RENDER_WORKER_URL}`;
    }

    // Strip any trailing /render so we can append exactly once
    const baseWorkerUrl = RENDER_WORKER_URL
      .replace(/\/render\/?$/, "")
      .replace(/\/$/, "");

    // ── Health check BEFORE deducting any credits ──────────────────────────
    // This catches: Railway not redeployed, wrong URL, service down.
    try {
      const healthRes = await fetch(`${baseWorkerUrl}/health`, {
        method: "GET",
        headers: { Authorization: `Bearer ${RENDER_WORKER_SECRET}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!healthRes.ok) {
        const healthBody = await healthRes.text();
        console.error(`[RENDER-VIDEO] Health check failed: ${healthRes.status} — ${healthBody.slice(0, 200)}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Railway worker is not healthy (status ${healthRes.status}). Please redeploy your Railway service from the Railway dashboard and try again.`,
            code: "WORKER_UNHEALTHY",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[RENDER-VIDEO] Health check OK ✅`);
    } catch (healthErr) {
      const msg = healthErr instanceof Error ? healthErr.message : String(healthErr);
      console.error(`[RENDER-VIDEO] Health check unreachable: ${msg}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Railway worker is unreachable (${msg}). Check that RENDER_WORKER_URL is correct and the Railway service is running.`,
          code: "WORKER_UNREACHABLE",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    // Detect placeholder URL
    if (baseWorkerUrl.includes("TON-SERVICE")) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "RENDER_WORKER_URL is still set to the placeholder. Please update it to your real Railway deployment URL (e.g. https://my-service.up.railway.app).",
          code: "WORKER_PLACEHOLDER_URL",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Final render endpoint
    const RENDER_ENDPOINT = `${baseWorkerUrl}/render`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const {
      quality = "standard",
      projectId,
      imageUrl,
      audioUrl,
      props = {},
    } = body;

    // Derive duration from quality tier
    const DURATION_BY_QUALITY: Record<string, number> = {
      standard: 10,
      pro: 15,
      cinema: 20,
    };
    const duration = props.duration || DURATION_BY_QUALITY[quality] || 10;

    console.log(`[RENDER-VIDEO] User: ${userId || "anonymous"} | Quality: ${quality} | Duration: ${duration}s`);

    // Credit cost by quality
    const CREDIT_COSTS: Record<string, number> = {
      standard: 5,
      pro: 10,
      cinema: 20,
    };
    const creditCost = CREDIT_COSTS[quality] || 5;

    // Validate & deduct credits
    if (userId) {
      const { data: creditsData } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      const balance = creditsData?.balance || 0;
      if (balance < creditCost) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Insufficient credits",
            code: "INSUFFICIENT_CREDITS",
            required: creditCost,
            balance,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: deducted } = await supabase.rpc("deduct_credits", {
        p_user_id: userId,
        p_amount: creditCost,
      });

      if (!deducted) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to deduct credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -creditCost,
        type: "consumption",
        description: `Remotion video render (${quality}, ${duration}s)`,
      });

      console.log(`[RENDER-VIDEO] Deducted ${creditCost} credits`);
    }

    // Create a generation record for tracking
    const { data: generationRecord } = await supabase
      .from("generations")
      .insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000",
        type: "video",
        status: "processing",
        progress: 10,
        quality,
        project_id: projectId || null,
        prompt: props.text || "Remotion video",
        model: "remotion",
        provider: "railway",
        duration,
      })
      .select()
      .single();

    const generationId = generationRecord?.id;
    console.log(`[RENDER-VIDEO] Created generation record: ${generationId}`);

    // Build webhook URL so the Railway worker can call back when done
    const webhookUrl = `${supabaseUrl}/functions/v1/video-webhook`;

    // Determine the background image and audio URLs
    const finalImageUrl = imageUrl || props.imageUrl || DEFAULT_BG_IMAGE;
    const finalAudioUrl = audioUrl || props.audioUrl;

    if (!finalAudioUrl) {
      // If no audio, mark as failed (FFmpeg worker requires audio)
      if (generationId) {
        await supabase.from("generations").update({
          status: "failed",
          error_message: "audioUrl is required for Remotion render",
          progress: 0,
        }).eq("id", generationId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "audioUrl is required for Remotion render" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AWAIT the worker — fail fast so the generation doesn't stay stuck in "processing"
    console.log(`[RENDER-VIDEO] Calling worker: ${RENDER_ENDPOINT}`);

    let workerRes: Response;
    try {
      workerRes = await fetch(RENDER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RENDER_WORKER_SECRET}`,
        },
        body: JSON.stringify({
          imageUrl: finalImageUrl,
          audioUrl: finalAudioUrl,
          duration,
          outputFormat: "mp4",
          webhookUrl,
          generationId,
        }),
      });
    } catch (fetchErr) {
      // Network-level failure (DNS, timeout, TLS, etc.)
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`[RENDER-VIDEO] Worker fetch failed: ${msg}`);

      if (generationId) {
        await supabase.from("generations").update({
          status: "failed",
          error_message: `Worker unreachable: ${msg}`,
          progress: 0,
        }).eq("id", generationId);
      }

      if (userId) {
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: creditCost });
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: creditCost,
          type: "refund",
          description: "Refund: Remotion render worker unreachable",
        });
      }

      return new Response(
        JSON.stringify({ success: false, error: `Worker unreachable: ${msg}`, code: "WORKER_UNREACHABLE" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workerBody = await workerRes.text();
    console.log(`[RENDER-VIDEO] Worker status: ${workerRes.status} — body: ${workerBody.slice(0, 300)}`);

    if (!workerRes.ok) {
      // Railway returned 4xx/5xx
      if (generationId) {
        await supabase.from("generations").update({
          status: "failed",
          error_message: `Worker rejected (${workerRes.status}): ${workerBody.slice(0, 200)}`,
          progress: 0,
        }).eq("id", generationId);
      }

      if (userId) {
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: creditCost });
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: creditCost,
          type: "refund",
          description: `Refund: Worker rejected (${workerRes.status})`,
        });
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Worker rejected with status ${workerRes.status}`,
          workerResponse: workerBody.slice(0, 300),
          code: "WORKER_REJECTED",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Worker accepted (202) — update progress and return
    if (generationId) {
      await supabase.from("generations").update({ progress: 20 }).eq("id", generationId);
    }

    // Return immediately — client will poll the generations table
    return new Response(
      JSON.stringify({
        success: true,
        generationId,
        status: "processing",
        quality,
        creditCost,
        message: "Render job started. Poll the generations table for status.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[RENDER-VIDEO] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
