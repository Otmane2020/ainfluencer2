import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL") || "";
    const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET") || "";

    if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Render worker not configured. Add RENDER_WORKER_URL and RENDER_WORKER_SECRET in secrets.",
          code: "WORKER_NOT_CONFIGURED",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize base URL — strip any trailing path (/renders, /render, etc.)
    if (!RENDER_WORKER_URL.startsWith("http")) {
      RENDER_WORKER_URL = `https://${RENDER_WORKER_URL}`;
    }
    const baseWorkerUrl = RENDER_WORKER_URL
      .replace(/\/renders?\/?$/, "")
      .replace(/\/$/, "");

    // FFmpeg worker exposes POST /render (webhook-based)
    const RENDER_ENDPOINT = `${baseWorkerUrl}/render`;

    // Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const { quality = "standard", projectId, imageUrl, audioUrl, props = {} } = body;

    const DURATION_BY_QUALITY: Record<string, number> = { standard: 10, pro: 15, cinema: 20 };
    const duration = props.duration || DURATION_BY_QUALITY[quality] || 10;

    const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };
    const creditCost = CREDIT_COSTS[quality] || 5;

    // Clean the title text: strip emojis, markdown, and limit to 120 chars
    const rawText: string = props.text || "Video render";
    const cleanText = rawText
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FEFF}]/gu, "")
      .replace(/^━+$/gm, "")
      .replace(/^[📍📊📜🎥🎬]+.*$/gm, "")
      .replace(/^(Angle:|Engagement:|SCRIPT:|SCENE BREAKDOWN:|Visual:|Voiceover:)/gim, "")
      .replace(/#\w+/g, "")
      .replace(/\[[\d-]+s\]/g, "")
      .replace(/\n{2,}/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 120);

    console.log(`[RENDER-VIDEO] User: ${userId || "anon"} | Quality: ${quality} | Duration: ${duration}s`);
    console.log(`[RENDER-VIDEO] Clean title: "${cleanText}"`);
    console.log(`[RENDER-VIDEO] Worker endpoint: ${RENDER_ENDPOINT}`);

    // Validate required fields
    const finalAudioUrl = audioUrl || props.audioUrl;
    const finalImageUrl = imageUrl || props.imageUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&q=80";

    if (!finalAudioUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "audioUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits
    if (userId) {
      const { data: creditsData } = await supabase
        .from("credits").select("balance").eq("user_id", userId).maybeSingle();
      const balance = creditsData?.balance || 0;
      if (balance < creditCost) {
        return new Response(
          JSON.stringify({ success: false, error: "Insufficient credits", code: "INSUFFICIENT_CREDITS", required: creditCost, balance }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: deducted } = await supabase.rpc("deduct_credits", { p_user_id: userId, p_amount: creditCost });
      if (!deducted) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to deduct credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase.from("credit_transactions").insert({
        user_id: userId, amount: -creditCost, type: "consumption",
        description: `Video render (${quality}, ${duration}s)`,
      });
    }

    // Create generation record — status: processing
    const { data: generationRecord } = await supabase.from("generations").insert({
      user_id: userId || "00000000-0000-0000-0000-000000000000",
      type: "video", status: "processing", progress: 10,
      quality, project_id: projectId || null,
      prompt: cleanText || "Video render",
      model: "clipmotion-ffmpeg", provider: "railway", duration,
    }).select().single();
    const generationId = generationRecord?.id;
    console.log(`[RENDER-VIDEO] Generation record created: ${generationId}`);

    // Webhook URL — video-webhook edge function will receive the result
    const webhookUrl = `${supabaseUrl}/functions/v1/video-webhook`;

    // ── Optional health check (non-blocking) ──
    try {
      const hRes = await fetch(`${baseWorkerUrl}/health`, {
        headers: { Authorization: `Bearer ${RENDER_WORKER_SECRET}` },
        signal: AbortSignal.timeout(5_000),
      });
      console.log(`[RENDER-VIDEO] Health check: ${hRes.status}`);
    } catch { /* ignore — health check is best-effort */ }

    // ── Fire-and-forget: POST /render to FFmpeg worker ──
    // Worker responds immediately with 202 + jobId, then calls webhookUrl when done
    let jobId: string | undefined;
    try {
      const workerRes = await fetch(RENDER_ENDPOINT, {
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
        signal: AbortSignal.timeout(15_000), // Just wait for 202 acceptance
      });

      if (!workerRes.ok) {
        const errBody = await workerRes.text();
        throw new Error(`Worker rejected (${workerRes.status}): ${errBody.slice(0, 300)}`);
      }

      const workerJson = await workerRes.json();
      jobId = workerJson.jobId;
      console.log(`[RENDER-VIDEO] Job accepted by worker: ${jobId} (status: ${workerJson.status})`);
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`[RENDER-VIDEO] Worker call failed: ${msg}`);

      // Refund credits on failure
      if (userId) {
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: creditCost });
        await supabase.from("credit_transactions").insert({
          user_id: userId, amount: creditCost, type: "refund",
          description: `Refund: Worker unreachable`,
        });
      }
      if (generationId) {
        await supabase.from("generations").update({
          status: "failed", error_message: msg, progress: 0,
        }).eq("id", generationId);
      }
      return new Response(
        JSON.stringify({ success: false, error: msg, code: "WORKER_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update progress to 20% and store jobId so poll-render-job can use it
    if (generationId) {
      await supabase.from("generations").update({
        progress: 20,
        external_task_id: jobId || null,
      }).eq("id", generationId);
    }

    // ── Return immediately — client will poll the generations table ──
    // The video-webhook edge function will complete the record when Railway calls back
    return new Response(
      JSON.stringify({
        success: true,
        generationId,
        jobId,
        quality,
        creditCost,
        duration,
        message: "Render job started. Poll generations table for status.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[RENDER-VIDEO] Unhandled error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
