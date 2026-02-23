import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERATION_TIMEOUT_MS = 1000 * 60 * 10; // 10 minutes
const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Refund credits + log transaction */
async function refundCredits(supabase: any, userId: string, quality: string, reason: string) {
  const amount = CREDIT_COSTS[quality || "standard"] || 5;
  await supabase.rpc("add_credits", { p_user_id: userId, p_amount: amount });
  await supabase.from("credit_transactions").insert({
    user_id: userId, amount, type: "refund", description: `Refund: ${reason}`,
  });
}

/** Build absolute video URL from worker output (relative or absolute) */
function resolveVideoUrl(output: string, baseWorkerUrl: string): string {
  if (!output) return "";

  // Already absolute → rewrite localhost if needed
  if (output.startsWith("http")) {
    if (output.includes("localhost") || output.includes("127.0.0.1")) {
      try {
        return `${baseWorkerUrl}${new URL(output).pathname}`;
      } catch { return output; }
    }
    return output;
  }

  // Relative path → build absolute using base URL
  const cleanPath = output.replace(/^\//, "");
  return `${baseWorkerUrl}/${cleanPath}`;
}

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
      return jsonResponse({ error: "generationId and jobId are required" }, 400);
    }

    // Fetch generation
    const { data: gen, error: genErr } = await supabase
      .from("generations")
      .select("id, user_id, quality, status, progress, created_at")
      .eq("id", generationId)
      .single();

    if (genErr || !gen) {
      return jsonResponse({ error: "Generation not found" }, 404);
    }

    // Already terminal
    if (gen.status === "completed" || gen.status === "failed") {
      const { data: latest } = await supabase
        .from("generations")
        .select("status, progress, media_url, error_message")
        .eq("id", generationId)
        .single();
      return jsonResponse({ status: latest?.status, progress: latest?.progress, mediaUrl: latest?.media_url });
    }

    // ── TIMEOUT CHECK (10 min) ──
    const createdAt = new Date(gen.created_at).getTime();
    if (Date.now() - createdAt > GENERATION_TIMEOUT_MS) {
      console.warn(`[POLL] ⏰ Generation ${generationId} timed out (>10min)`);
      await supabase.from("generations").update({
        status: "failed", error_message: "Generation timeout (10 min)", progress: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);

      if (gen.user_id) await refundCredits(supabase, gen.user_id, gen.quality, "Generation timeout");

      return jsonResponse({ status: "failed", progress: 0, error: "Generation timeout (10 min)" });
    }

    // Normalize base URL
    if (!RENDER_WORKER_URL.startsWith("http")) RENDER_WORKER_URL = `https://${RENDER_WORKER_URL}`;
    const baseWorkerUrl = RENDER_WORKER_URL.replace(/\/renders?\/?$/, "").replace(/\/$/, "");

    // Poll worker
    const pollUrl = `${baseWorkerUrl}/renders/${jobId}`;
    console.log(`[POLL] Fetching: ${pollUrl}`);

    let workerData: any = null;
    try {
      const workerRes = await fetch(pollUrl, { signal: AbortSignal.timeout(10_000) });
      const rawText = await workerRes.text();
      console.log(`[POLL] Worker response (${workerRes.status}): ${rawText.slice(0, 300)}`);

      if (!workerRes.ok) {
        // Worker returned 404 — job may have expired from memory but file may exist
        // Try to download the video file directly as a fallback
        if (workerRes.status === 404) {
          console.log(`[POLL] Job ${jobId} not found in worker memory, trying direct download...`);
          
          // Try multiple possible paths where the worker might serve the rendered file
          const possiblePaths = [
            `/output/${jobId}.mp4`,
            `/renders/${jobId}.mp4`,
            `/out/${jobId}.mp4`,
            `/api/renders/${jobId}/output`,
          ];
          
          for (const path of possiblePaths) {
            const tryUrl = `${baseWorkerUrl}${path}`;
            try {
              console.log(`[POLL] Trying: ${tryUrl}`);
              const fileRes = await fetch(tryUrl, { method: "GET", signal: AbortSignal.timeout(30_000) });
              if (fileRes.ok && fileRes.headers.get("content-type")?.includes("video")) {
                console.log(`[POLL] ✅ Found video at ${tryUrl}, uploading to storage...`);
                const videoBytes = new Uint8Array(await fileRes.arrayBuffer());
                const videoPath = `videos/remotion-${Date.now()}-${jobId}.mp4`;
                const { error: uploadErr } = await supabase.storage
                  .from("media").upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });
                
                if (!uploadErr) {
                  const publicUrl = supabase.storage.from("media").getPublicUrl(videoPath).data.publicUrl;
                  await supabase.from("generations").update({
                    status: "completed", progress: 100, media_url: publicUrl,
                    completed_at: new Date().toISOString(),
                  }).eq("id", generationId);
                  console.log(`[POLL] ✓ Generation ${generationId} completed via direct download: ${publicUrl}`);
                  return jsonResponse({ status: "completed", progress: 100, mediaUrl: publicUrl });
                } else {
                  console.error(`[POLL] Upload error:`, uploadErr);
                }
              }
            } catch { /* try next path */ }
          }
          
          // Last resort: check if video was already in Supabase storage
          try {
            const { data: storageFiles } = await supabase.storage
              .from("media")
              .list("videos", { limit: 30, sortBy: { column: "created_at", order: "desc" } });
            
            const matchingFile = storageFiles?.find((f: any) => f.name?.includes(jobId));
            if (matchingFile) {
              const publicUrl = supabase.storage.from("media").getPublicUrl(`videos/${matchingFile.name}`).data.publicUrl;
              console.log(`[POLL] Found video in storage matching jobId: ${publicUrl}`);
              await supabase.from("generations").update({
                status: "completed", progress: 100, media_url: publicUrl,
                completed_at: new Date().toISOString(),
              }).eq("id", generationId);
              return jsonResponse({ status: "completed", progress: 100, mediaUrl: publicUrl });
            }
          } catch (storageErr) {
            console.error(`[POLL] Storage check error:`, storageErr);
          }
        }
        if (!workerData) {
          return jsonResponse({ status: "processing", progress: gen.progress, workerStatus: workerRes.status });
        }
      }

      if (!workerData) {
        try { workerData = JSON.parse(rawText); } catch {
          return jsonResponse({ status: "processing", progress: gen.progress });
        }
      }
    } catch (fetchErr: any) {
      console.error(`[POLL] Fetch error: ${fetchErr?.message}`);
      return jsonResponse({ status: "processing", progress: gen.progress, fetchError: fetchErr?.message });
    }

    const remotionStatus: string = workerData.status || "unknown";

    // ── QUEUED ──
    if (remotionStatus === "queued") {
      await supabase.from("generations").update({ progress: 25 }).eq("id", generationId);
      return jsonResponse({ status: "processing", progress: 25 });
    }

    // ── IN-PROGRESS ──
    if (remotionStatus === "in-progress") {
      const remotionProgress = typeof workerData.progress === "number" ? workerData.progress : 0;
      const mappedProgress = Math.round(25 + remotionProgress * 65);
      const nextProgress = Math.max(gen.progress || 25, Math.min(mappedProgress, 90));
      await supabase.from("generations").update({ progress: nextProgress }).eq("id", generationId);
      return jsonResponse({ status: "processing", progress: nextProgress });
    }

    // ── DONE ──
    if (remotionStatus === "done" || remotionStatus === "completed") {
      const outputFile = workerData.output || workerData.outputFile || workerData.videoUrl || workerData.video_url;
      const videoSourceUrl = outputFile ? resolveVideoUrl(outputFile, baseWorkerUrl) : `${baseWorkerUrl}/renders/${jobId}.mp4`;

      console.log(`[POLL] Video source URL: ${videoSourceUrl}`);

      let finalVideoUrl: string | undefined;

      if (videoSourceUrl) {
        try {
          const videoRes = await fetch(videoSourceUrl, { signal: AbortSignal.timeout(60_000) });
          if (videoRes.ok) {
            const videoBytes = new Uint8Array(await videoRes.arrayBuffer());
            const videoPath = `videos/remotion-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
            const { error: uploadErr } = await supabase.storage
              .from("media").upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });
            if (!uploadErr) {
              finalVideoUrl = supabase.storage.from("media").getPublicUrl(videoPath).data.publicUrl;
            } else {
              console.error("[POLL] Upload error:", uploadErr);
              finalVideoUrl = videoSourceUrl;
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
          status: "failed", error_message: "Render done but no video file available",
          progress: 0, completed_at: new Date().toISOString(),
        }).eq("id", generationId);
        if (gen.user_id) await refundCredits(supabase, gen.user_id, gen.quality, "Video file unavailable");
        return jsonResponse({ status: "failed", progress: 0 });
      }

      await supabase.from("generations").update({
        status: "completed", progress: 100, media_url: finalVideoUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);

      console.log(`[POLL] ✓ Generation ${generationId} completed: ${finalVideoUrl}`);
      return jsonResponse({ status: "completed", progress: 100, mediaUrl: finalVideoUrl });
    }

    // ── FAILED ──
    if (remotionStatus === "failed" || remotionStatus === "error") {
      const errMsg = workerData.error || workerData.message || "Render failed";
      if (gen.user_id) await refundCredits(supabase, gen.user_id, gen.quality, "Render failed");
      await supabase.from("generations").update({
        status: "failed", error_message: errMsg, progress: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);
      return jsonResponse({ status: "failed", progress: 0, error: errMsg });
    }

    // Unknown
    return jsonResponse({ status: "processing", progress: gen.progress });

  } catch (error) {
    console.error("[POLL] Unhandled error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
