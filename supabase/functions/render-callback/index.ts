import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { jobId, generationId, status, videoUrl, outputUrl, error: errorMsg, fileSize } = body;
    // Server may send videoUrl or outputUrl depending on version
    const resolvedVideoUrl = videoUrl || outputUrl;

    console.log(`[RENDER-CALLBACK] jobId=${jobId} generationId=${generationId} status=${status}`);

    if (!generationId) {
      return new Response(
        JSON.stringify({ error: "generationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch generation
    const { data: gen, error: genErr } = await supabase
      .from("generations")
      .select("id, user_id, quality, status")
      .eq("id", generationId)
      .single();

    if (genErr || !gen) {
      console.error("[RENDER-CALLBACK] Generation not found:", generationId);
      return new Response(
        JSON.stringify({ error: "Generation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already terminal — idempotent
    if (gen.status === "completed" || gen.status === "failed") {
      console.log(`[RENDER-CALLBACK] Generation ${generationId} already ${gen.status}, skipping`);
      return new Response(
        JSON.stringify({ received: true, alreadyTerminal: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── COMPLETED ──
    if (status === "completed" && resolvedVideoUrl) {
      // videoUrl is relative (e.g. /renders/job-xxx.mp4) — build absolute URL
      let RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL") || "";
      if (!RENDER_WORKER_URL.startsWith("http")) RENDER_WORKER_URL = `https://${RENDER_WORKER_URL}`;
      const baseWorkerUrl = RENDER_WORKER_URL.replace(/\/renders?\/?$/, "").replace(/\/$/, "");

      let videoSourceUrl: string;
      if (resolvedVideoUrl.startsWith("http")) {
        if (resolvedVideoUrl.includes("localhost") || resolvedVideoUrl.includes("127.0.0.1")) {
          try { videoSourceUrl = `${baseWorkerUrl}${new URL(resolvedVideoUrl).pathname}`; } catch { videoSourceUrl = resolvedVideoUrl; }
        } else {
          videoSourceUrl = resolvedVideoUrl;
        }
      } else {
        const cleanPath = resolvedVideoUrl.replace(/^\//, "");
        videoSourceUrl = `${baseWorkerUrl}/${cleanPath}`;
      }

      console.log(`[RENDER-CALLBACK] Downloading video from: ${videoSourceUrl}`);

      let finalVideoUrl: string | undefined;
      try {
        const videoRes = await fetch(videoSourceUrl, { signal: AbortSignal.timeout(60_000) });
        if (videoRes.ok) {
          const videoBytes = new Uint8Array(await videoRes.arrayBuffer());
          const storagePath = `videos/remotion-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
          const { error: uploadErr } = await supabase.storage
            .from("media").upload(storagePath, videoBytes, { contentType: "video/mp4", upsert: true });
          if (!uploadErr) {
            finalVideoUrl = supabase.storage.from("media").getPublicUrl(storagePath).data.publicUrl;
          } else {
            console.error("[RENDER-CALLBACK] Upload error:", uploadErr);
            finalVideoUrl = videoSourceUrl; // Fallback
          }
        } else {
          console.error(`[RENDER-CALLBACK] Download failed: ${videoRes.status}`);
          finalVideoUrl = videoSourceUrl;
        }
      } catch (dlErr) {
        console.error("[RENDER-CALLBACK] Download error:", dlErr);
        finalVideoUrl = videoSourceUrl;
      }

      if (finalVideoUrl) {
        await supabase.from("generations").update({
          status: "completed", progress: 100, media_url: finalVideoUrl,
          completed_at: new Date().toISOString(),
        }).eq("id", generationId);
        console.log(`[RENDER-CALLBACK] ✓ Generation ${generationId} completed: ${finalVideoUrl}`);
      } else {
        // No video available — fail + refund
        await supabase.from("generations").update({
          status: "failed", error_message: "Webhook received but video download failed",
          progress: 0, completed_at: new Date().toISOString(),
        }).eq("id", generationId);
        if (gen.user_id) {
          const refund = CREDIT_COSTS[gen.quality || "standard"] || 5;
          await supabase.rpc("add_credits", { p_user_id: gen.user_id, p_amount: refund });
          await supabase.from("credit_transactions").insert({
            user_id: gen.user_id, amount: refund, type: "refund",
            description: "Refund: Webhook video download failed",
          });
        }
      }

      return new Response(
        JSON.stringify({ received: true, status: "completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── FAILED ──
    if (status === "failed") {
      const errMessage = errorMsg || "Render failed (worker callback)";
      await supabase.from("generations").update({
        status: "failed", error_message: errMessage, progress: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);

      // Refund credits
      if (gen.user_id) {
        const refund = CREDIT_COSTS[gen.quality || "standard"] || 5;
        await supabase.rpc("add_credits", { p_user_id: gen.user_id, p_amount: refund });
        await supabase.from("credit_transactions").insert({
          user_id: gen.user_id, amount: refund, type: "refund",
          description: `Refund: ${errMessage}`,
        });
      }

      console.log(`[RENDER-CALLBACK] ✗ Generation ${generationId} failed: ${errMessage}`);
      return new Response(
        JSON.stringify({ received: true, status: "failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown status
    return new Response(
      JSON.stringify({ received: true, status: "unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[RENDER-CALLBACK] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
