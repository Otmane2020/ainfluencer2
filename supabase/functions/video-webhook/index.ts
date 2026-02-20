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

    const body = await req.json();
    const { jobId, generationId, success, video, error: workerError } = body;

    console.log(`[VIDEO-WEBHOOK] Received callback for job ${jobId}, generation ${generationId}`);

    if (!generationId) {
      console.error("[VIDEO-WEBHOOK] Missing generationId in payload");
      return new Response(
        JSON.stringify({ error: "Missing generationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!success || !video?.base64) {
      // Worker reported failure
      console.error(`[VIDEO-WEBHOOK] Worker reported failure: ${workerError}`);
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: workerError || "Worker render failed",
          progress: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      // Refund credits — fetch generation to get user_id and quality
      const { data: gen } = await supabase
        .from("generations")
        .select("user_id, quality")
        .eq("id", generationId)
        .single();

      if (gen?.user_id) {
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

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 video and upload to storage
    console.log(`[VIDEO-WEBHOOK] Uploading video to storage (${video.size} bytes)...`);

    const videoBytes = Uint8Array.from(atob(video.base64), (c) => c.charCodeAt(0));
    const videoPath = `videos/remotion-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(videoPath, videoBytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      console.error("[VIDEO-WEBHOOK] Storage upload error:", uploadError);
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: `Storage upload failed: ${uploadError.message}`,
          progress: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      return new Response(
        JSON.stringify({ error: "Upload failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
    const finalVideoUrl = publicUrlData.publicUrl;

    console.log(`[VIDEO-WEBHOOK] Uploaded to storage: ${videoPath}`);
    console.log(`[VIDEO-WEBHOOK] Public URL: ${finalVideoUrl}`);

    // Update generation record as completed
    await supabase
      .from("generations")
      .update({
        status: "completed",
        progress: 100,
        media_url: finalVideoUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId);

    console.log(`[VIDEO-WEBHOOK] ✓ Generation ${generationId} completed`);

    return new Response(
      JSON.stringify({ success: true, generationId, videoUrl: finalVideoUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[VIDEO-WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
