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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL") || "";
    const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET") || "";

    const body = await req.json();
    const { generationId, jobId } = body;

    if (!generationId || !jobId) {
      return new Response(
        JSON.stringify({ error: "generationId and jobId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch current generation to check it exists and get user info
    const { data: gen, error: genErr } = await supabase
      .from("generations")
      .select("id, user_id, quality, status, progress")
      .eq("id", generationId)
      .single();

    if (genErr || !gen) {
      return new Response(
        JSON.stringify({ error: "Generation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already completed or failed, return current state immediately
    if (gen.status === "completed" || gen.status === "failed") {
      const { data: latest } = await supabase
        .from("generations")
        .select("status, progress, media_url, error_message")
        .eq("id", generationId)
        .single();

      return new Response(
        JSON.stringify({ status: latest?.status, progress: latest?.progress, mediaUrl: latest?.media_url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize base URL
    let baseWorkerUrl = RENDER_WORKER_URL;
    if (!baseWorkerUrl.startsWith("http")) baseWorkerUrl = `https://${baseWorkerUrl}`;
    baseWorkerUrl = baseWorkerUrl.replace(/\/renders?\/?$/, "").replace(/\/$/, "");

    // Poll Railway Remotion worker for job status
    let workerData: any = null;
    try {
      const workerRes = await fetch(`${baseWorkerUrl}/renders/${jobId}`, {
        headers: { Authorization: `Bearer ${RENDER_WORKER_SECRET}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (!workerRes.ok) {
        const txt = await workerRes.text();
        console.error(`[POLL-RENDER-JOB] Worker ${workerRes.status}: ${txt.slice(0, 200)}`);
        return new Response(
          JSON.stringify({ status: "processing", progress: gen.progress, error: `Worker ${workerRes.status}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      workerData = await workerRes.json();
    } catch (fetchErr) {
      console.error("[POLL-RENDER-JOB] Fetch error:", fetchErr);
      return new Response(
        JSON.stringify({ status: "processing", progress: gen.progress }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[POLL-RENDER-JOB] Job ${jobId} status: ${workerData.status}`);

    // Map Remotion job status → DB progress
    const remotionStatus: string = workerData.status || "unknown";

    if (remotionStatus === "queued") {
      await supabase.from("generations").update({ progress: 25 }).eq("id", generationId);
      return new Response(
        JSON.stringify({ status: "processing", progress: 25 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (remotionStatus === "rendering") {
      // Increment progress from current value toward 85%
      const currentProgress = gen.progress || 25;
      const nextProgress = Math.min(currentProgress + 8, 85);
      await supabase.from("generations").update({ progress: nextProgress }).eq("id", generationId);
      return new Response(
        JSON.stringify({ status: "processing", progress: nextProgress }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (remotionStatus === "done") {
      // Worker provides either a URL or base64
      const videoUrl: string | undefined = workerData.url || workerData.outputFile;
      const videoBase64: string | undefined = workerData.base64 || workerData.video?.base64;

      let finalVideoUrl: string | undefined;

      if (videoUrl) {
        // Direct URL — download and re-upload to our storage for reliability
        try {
          const videoRes = await fetch(videoUrl, { signal: AbortSignal.timeout(60_000) });
          const videoBytes = new Uint8Array(await videoRes.arrayBuffer());
          const videoPath = `videos/remotion-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
          const { error: uploadErr } = await supabase.storage
            .from("media")
            .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("media").getPublicUrl(videoPath);
            finalVideoUrl = urlData.publicUrl;
          } else {
            // Fallback: use the direct URL
            finalVideoUrl = videoUrl;
          }
        } catch {
          finalVideoUrl = videoUrl;
        }
      } else if (videoBase64) {
        const videoBytes = Uint8Array.from(atob(videoBase64), (c) => c.charCodeAt(0));
        const videoPath = `videos/remotion-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
        const { error: uploadErr } = await supabase.storage
          .from("media")
          .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(videoPath);
          finalVideoUrl = urlData.publicUrl;
        }
      }

      if (!finalVideoUrl) {
        // Mark as failed if we couldn't get a video URL
        await supabase.from("generations").update({
          status: "failed",
          error_message: "Render done but no video URL available",
          progress: 0,
          completed_at: new Date().toISOString(),
        }).eq("id", generationId);
        return new Response(
          JSON.stringify({ status: "failed", progress: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("generations").update({
        status: "completed",
        progress: 100,
        media_url: finalVideoUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);

      console.log(`[POLL-RENDER-JOB] ✓ Generation ${generationId} completed: ${finalVideoUrl}`);

      return new Response(
        JSON.stringify({ status: "completed", progress: 100, mediaUrl: finalVideoUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (remotionStatus === "failed" || remotionStatus === "error") {
      const errMsg = workerData.error || workerData.message || "Remotion render failed";

      // Refund credits
      if (gen.user_id) {
        const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };
        const refundAmount = CREDIT_COSTS[gen.quality || "standard"] || 5;
        await supabase.rpc("add_credits", { p_user_id: gen.user_id, p_amount: refundAmount });
        await supabase.from("credit_transactions").insert({
          user_id: gen.user_id,
          amount: refundAmount,
          type: "refund",
          description: "Refund: Remotion render failed",
        });
      }

      await supabase.from("generations").update({
        status: "failed",
        error_message: errMsg,
        progress: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);

      return new Response(
        JSON.stringify({ status: "failed", progress: 0, error: errMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown status — return current progress unchanged
    return new Response(
      JSON.stringify({ status: "processing", progress: gen.progress }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[POLL-RENDER-JOB] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

