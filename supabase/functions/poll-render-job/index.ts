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

    let RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL") || "";

    const body = await req.json();
    const { generationId, jobId } = body;

    if (!generationId || !jobId) {
      return new Response(
        JSON.stringify({ error: "generationId and jobId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch current generation
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

    // Already done
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
    if (!RENDER_WORKER_URL.startsWith("http")) RENDER_WORKER_URL = `https://${RENDER_WORKER_URL}`;
    const baseWorkerUrl = RENDER_WORKER_URL.replace(/\/renders?\/?$/, "").replace(/\/$/, "");

    // Poll worker for job status
    const pollUrl = `${baseWorkerUrl}/renders/${jobId}`;
    console.log(`[POLL] Fetching: ${pollUrl}`);
    let workerData: any = null;
    try {
      const workerRes = await fetch(pollUrl, {
        signal: AbortSignal.timeout(10_000),
      });

      const rawText = await workerRes.text();
      console.log(`[POLL] Worker response (${workerRes.status}): ${rawText.slice(0, 500)}`);

      if (!workerRes.ok) {
        return new Response(
          JSON.stringify({ status: "processing", progress: gen.progress, workerStatus: workerRes.status, workerError: rawText.slice(0, 200) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        workerData = JSON.parse(rawText);
      } catch {
        console.error(`[POLL] Failed to parse worker JSON: ${rawText.slice(0, 200)}`);
        return new Response(
          JSON.stringify({ status: "processing", progress: gen.progress }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchErr: any) {
      console.error(`[POLL] Fetch error: ${fetchErr?.message || fetchErr}`);
      return new Response(
        JSON.stringify({ status: "processing", progress: gen.progress, fetchError: fetchErr?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[POLL] Job ${jobId}: ${JSON.stringify(workerData).slice(0, 300)}`);

    const remotionStatus: string = workerData.status || "unknown";

    // ── QUEUED ──
    if (remotionStatus === "queued") {
      await supabase.from("generations").update({ progress: 25 }).eq("id", generationId);
      return new Response(
        JSON.stringify({ status: "processing", progress: 25 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── IN-PROGRESS ──
    if (remotionStatus === "in-progress") {
      // Worker progress is a 0-1 fraction; map to 25-90 range
      const remotionProgress = typeof workerData.progress === "number" ? workerData.progress : 0;
      const mappedProgress = Math.round(25 + remotionProgress * 65);
      const nextProgress = Math.max(gen.progress || 25, Math.min(mappedProgress, 90));
      await supabase.from("generations").update({ progress: nextProgress }).eq("id", generationId);
      return new Response(
        JSON.stringify({ status: "processing", progress: nextProgress }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DONE ──
    if (remotionStatus === "done" || remotionStatus === "completed") {
      // Worker returns `output` field (relative path like "renders/<jobId>.mp4")
      const outputFile: string | undefined = workerData.output || workerData.outputFile || workerData.videoUrl || workerData.video_url;
      
      let videoSourceUrl: string | undefined;
      
      if (outputFile) {
        if (outputFile.startsWith("http")) {
          // Rewrite localhost/127.0.0.1 URLs to the real Railway public URL
          if (outputFile.includes("localhost") || outputFile.includes("127.0.0.1")) {
            try {
              const urlPath = new URL(outputFile).pathname;
              videoSourceUrl = `${baseWorkerUrl}${urlPath}`;
              console.log(`[POLL] Rewrote localhost URL to: ${videoSourceUrl}`);
            } catch {
              videoSourceUrl = outputFile;
            }
          } else {
            videoSourceUrl = outputFile;
          }
        } else {
          // output is a relative path like "renders/abc.mp4" — build full URL
          const cleanPath = outputFile.replace(/^\//, "");
          videoSourceUrl = `${baseWorkerUrl}/${cleanPath}`;
        }
      } else {
        // Fallback: try the standard path /renders/<jobId>.mp4
        videoSourceUrl = `${baseWorkerUrl}/renders/${jobId}.mp4`;
      }
      
      console.log(`[POLL] Video source URL: ${videoSourceUrl}`);

      let finalVideoUrl: string | undefined;

      if (videoSourceUrl) {
        // Download from Railway and re-upload to our storage
        try {
          console.log(`[POLL] Downloading video from: ${videoSourceUrl}`);
          const videoRes = await fetch(videoSourceUrl, { signal: AbortSignal.timeout(60_000) });
          if (videoRes.ok) {
            const videoBytes = new Uint8Array(await videoRes.arrayBuffer());
            const videoPath = `videos/remotion-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
            const { error: uploadErr } = await supabase.storage
              .from("media")
              .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });
            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from("media").getPublicUrl(videoPath);
              finalVideoUrl = urlData.publicUrl;
            } else {
              console.error("[POLL] Upload error:", uploadErr);
              finalVideoUrl = videoSourceUrl; // Fallback to Railway URL
            }
          } else {
            console.error(`[POLL] Download failed: ${videoRes.status}`);
          }
        } catch (dlErr) {
          console.error("[POLL] Download error:", dlErr);
          finalVideoUrl = videoSourceUrl;
        }
      }

      if (!finalVideoUrl) {
        await supabase.from("generations").update({
          status: "failed",
          error_message: "Render done but no video file available",
          progress: 0,
          completed_at: new Date().toISOString(),
        }).eq("id", generationId);

        // Refund
        if (gen.user_id) {
          const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };
          const refundAmount = CREDIT_COSTS[gen.quality || "standard"] || 5;
          await supabase.rpc("add_credits", { p_user_id: gen.user_id, p_amount: refundAmount });
          await supabase.from("credit_transactions").insert({
            user_id: gen.user_id, amount: refundAmount, type: "refund",
            description: "Refund: Video file unavailable",
          });
        }

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

      console.log(`[POLL] ✓ Generation ${generationId} completed: ${finalVideoUrl}`);

      return new Response(
        JSON.stringify({ status: "completed", progress: 100, mediaUrl: finalVideoUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── FAILED ──
    if (remotionStatus === "failed" || remotionStatus === "error") {
      const rawErr = workerData.error;
      const errMsg = typeof rawErr === "string" && rawErr
        ? rawErr
        : typeof workerData.message === "string" && workerData.message
          ? workerData.message
          : "Remotion render failed";

      // Refund
      if (gen.user_id) {
        const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };
        const refundAmount = CREDIT_COSTS[gen.quality || "standard"] || 5;
        await supabase.rpc("add_credits", { p_user_id: gen.user_id, p_amount: refundAmount });
        await supabase.from("credit_transactions").insert({
          user_id: gen.user_id, amount: refundAmount, type: "refund",
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

    // Unknown status
    return new Response(
      JSON.stringify({ status: "processing", progress: gen.progress }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[POLL] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
