import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Poll the Remotion worker until job is done or timeout
async function pollJobUntilDone(
  baseWorkerUrl: string,
  secret: string,
  jobId: string,
  maxWaitMs = 180_000, // 3 minutes max
  intervalMs = 5_000
): Promise<{ status: string; outputUrl?: string; error?: string }> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await fetch(`${baseWorkerUrl}/renders/${jobId}`, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.warn(`[POLL] GET /renders/${jobId} → ${res.status}`);
        continue;
      }
      const job = await res.json();
      console.log(`[POLL] Job ${jobId} status: ${job.status}`);
      if (job.status === "done") return { status: "done", outputUrl: job.outputUrl };
      if (job.status === "failed" || job.status === "cancelled") {
        return { status: job.status, error: job.error || job.status };
      }
    } catch (e) {
      console.warn(`[POLL] Error polling job: ${e}`);
    }
  }
  return { status: "timeout", error: "Render timed out after 3 minutes" };
}

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

    // Normalize base URL — strip trailing /renders or /render
    if (!RENDER_WORKER_URL.startsWith("http")) {
      RENDER_WORKER_URL = `https://${RENDER_WORKER_URL}`;
    }
    const baseWorkerUrl = RENDER_WORKER_URL
      .replace(/\/renders?\/?$/, "")
      .replace(/\/$/, "");

    const RENDERS_ENDPOINT = `${baseWorkerUrl}/renders`;

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

    console.log(`[RENDER-VIDEO] User: ${userId || "anon"} | Quality: ${quality} | Duration: ${duration}s`);

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

    // Create generation record
    const { data: generationRecord } = await supabase.from("generations").insert({
      user_id: userId || "00000000-0000-0000-0000-000000000000",
      type: "video", status: "processing", progress: 10,
      quality, project_id: projectId || null,
      prompt: props.text || "Video render",
      model: "remotion", provider: "railway", duration,
    }).select().single();
    const generationId = generationRecord?.id;
    console.log(`[RENDER-VIDEO] Generation record: ${generationId}`);

    // ── Optional health check (non-blocking) ──
    try {
      const hRes = await fetch(`${baseWorkerUrl}/health`, {
        headers: { Authorization: `Bearer ${RENDER_WORKER_SECRET}` },
        signal: AbortSignal.timeout(5_000),
      });
      console.log(`[RENDER-VIDEO] Health: ${hRes.status}`);
    } catch { /* ignore */ }

    // ── Submit job to Remotion worker ──
    let jobId: string;
    try {
      const workerRes = await fetch(RENDERS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RENDER_WORKER_SECRET}`,
        },
        body: JSON.stringify({
          // Standard Remotion worker props
          titleText: props.text || "Video",
          // Extended props for ClipMotion composition
          imageUrl: finalImageUrl,
          audioUrl: finalAudioUrl,
          duration,
          generationId,
        }),
      });

      if (!workerRes.ok) {
        const errBody = await workerRes.text();
        throw new Error(`Worker rejected (${workerRes.status}): ${errBody.slice(0, 200)}`);
      }

      const workerJson = await workerRes.json();
      jobId = workerJson.jobId;
      console.log(`[RENDER-VIDEO] Job submitted: ${jobId}`);
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`[RENDER-VIDEO] Worker call failed: ${msg}`);

      // Refund credits
      if (userId) {
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: creditCost });
        await supabase.from("credit_transactions").insert({
          user_id: userId, amount: creditCost, type: "refund",
          description: `Refund: Worker error`,
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

    // Update progress
    if (generationId) {
      await supabase.from("generations").update({ progress: 20 }).eq("id", generationId);
    }

    // ── Poll until done (runs within edge function timeout) ──
    const pollResult = await pollJobUntilDone(baseWorkerUrl, RENDER_WORKER_SECRET, jobId);

    if (pollResult.status !== "done" || !pollResult.outputUrl) {
      const errorMsg = pollResult.error || "Render did not complete";
      if (generationId) {
        await supabase.from("generations").update({
          status: "failed", error_message: errorMsg, progress: 0,
        }).eq("id", generationId);
      }
      // Refund credits on failure
      if (userId) {
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: creditCost });
        await supabase.from("credit_transactions").insert({
          user_id: userId, amount: creditCost, type: "refund",
          description: `Refund: ${errorMsg}`,
        });
      }
      return new Response(
        JSON.stringify({ success: false, error: errorMsg, code: "RENDER_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[RENDER-VIDEO] Job done. Output: ${pollResult.outputUrl}`);

    // ── Download & re-upload video to Supabase storage ──
    let mediaUrl = pollResult.outputUrl;
    try {
      const videoRes = await fetch(pollResult.outputUrl, { signal: AbortSignal.timeout(60_000) });
      if (videoRes.ok) {
        const videoBuffer = await videoRes.arrayBuffer();
        const fileName = `videos/${userId || "anon"}/${generationId}.mp4`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, videoBuffer, { contentType: "video/mp4", upsert: true });
        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("media").getPublicUrl(fileName);
          mediaUrl = publicData.publicUrl;
          console.log(`[RENDER-VIDEO] Uploaded to storage: ${mediaUrl}`);
        }
      }
    } catch (uploadErr) {
      console.warn(`[RENDER-VIDEO] Storage upload failed (using direct URL): ${uploadErr}`);
    }

    // ── Finalize generation record ──
    if (generationId) {
      await supabase.from("generations").update({
        status: "completed",
        media_url: mediaUrl,
        progress: 100,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generationId,
        mediaUrl,
        quality,
        creditCost,
        duration,
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
