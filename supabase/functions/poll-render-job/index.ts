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

    // Poll Remotion server for job status: GET /renders/:jobId
    let workerData: any = null;
    try {
      const workerRes = await fetch(`${baseWorkerUrl}/renders/${jobId}`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!workerRes.ok) {
        const txt = await workerRes.text();
        console.error(`[POLL] Worker ${workerRes.status}: ${txt.slice(0, 200)}`);
        return new Response(
          JSON.stringify({ status: "processing", progress: gen.progress }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      workerData = await workerRes.json();
    } catch (fetchErr) {
      console.error("[POLL] Fetch error:", fetchErr);
      return new Response(
        JSON.stringify({ status: "processing", progress: gen.progress }),
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
    if (remotionStatus === "in-progress" || remotionStatus === "rendering") {
      // Remotion progress is a 0-1 fraction; map to 25-90 range
      const remotionProgress = typeof workerData.progress === "number" ? workerData.progress : 0;
      const mappedProgress = Math.round(25 + remotionProgress * 65); // 25 at 0%, 90 at 100%
      const nextProgress = Math.max(gen.progress || 25, Math.min(mappedProgress, 90));
      await supabase.from("generations").update({ progress: nextProgress }).eq("id", generationId);
      return new Response(
        JSON.stringify({ status: "processing", progress: nextProgress }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DONE ──
    if (remotionStatus === "done") {
      // Remotion server serves the rendered video as a static file.
      // The output path is typically at /renders/<jobId>/<filename>.mp4
      // workerData should contain an outputFile or output property with the filename
      const outputFile: string | undefined = workerData.outputFile || workerData.output;
      
      // Build the video URL from the Railway server
      // The static files are served at /renders, so the video is at /renders/<output>
      let videoSourceUrl: string | undefined;
      if (outputFile) {
        // outputFile could be a relative path like "renders/<jobId>/out.mp4" or just the filename
        if (outputFile.startsWith("http")) {
          videoSourceUrl = outputFile;
        } else {
          // Strip leading "renders/" if present since the static mount is at /renders
          const cleanPath = outputFile.replace(/^renders\//, "");
          videoSourceUrl = `${baseWorkerUrl}/renders/${cleanPath}`;
        }
      }

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
