import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL");
    const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

    // If worker not configured yet, return a friendly message
    if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Render worker not configured yet. Add RENDER_WORKER_URL and RENDER_WORKER_SECRET in your project secrets.",
          code: "WORKER_NOT_CONFIGURED",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const {
      composition = "ClipMotion",
      props = {},
      projectId,
      quality = "standard",
    } = body;

    console.log(`[RENDER-VIDEO] User: ${userId || "anonymous"} | Composition: ${composition}`);

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
        description: `Remotion video render (${composition}, ${quality})`,
      });

      console.log(`[RENDER-VIDEO] Deducted ${creditCost} credits`);
    }

    // Create a generation record for tracking
    const { data: generationRecord } = await supabase
      .from("generations")
      .insert({
        user_id: userId || "anonymous",
        type: "video",
        status: "processing",
        progress: 10,
        quality,
        project_id: projectId || null,
        prompt: props.text || composition,
        model: "remotion",
        provider: "railway",
      })
      .select()
      .single();

    const generationId = generationRecord?.id;
    console.log(`[RENDER-VIDEO] Created generation record: ${generationId}`);

    // Call the Railway render worker
    console.log(`[RENDER-VIDEO] Calling worker: ${RENDER_WORKER_URL}`);
    const workerRes = await fetch(RENDER_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RENDER_WORKER_SECRET}`,
      },
      body: JSON.stringify({ composition, props, quality }),
    });

    if (!workerRes.ok) {
      const errorText = await workerRes.text();
      console.error(`[RENDER-VIDEO] Worker error: ${workerRes.status} - ${errorText}`);

      // Refund credits on failure
      if (userId) {
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: creditCost });
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: creditCost,
          type: "refund",
          description: `Refund: Remotion render failed`,
        });
      }

      // Update generation record as failed
      if (generationId) {
        await supabase.from("generations").update({
          status: "failed",
          error_message: `Worker error: ${workerRes.status}`,
          progress: 0,
        }).eq("id", generationId);
      }

      throw new Error(`Worker returned ${workerRes.status}: ${errorText}`);
    }

    const workerData = await workerRes.json();

    // If worker returned a video directly (base64 or URL)
    let finalVideoUrl = workerData.url || workerData.videoUrl;

    // If worker returned base64, upload to storage
    if (workerData.video?.base64 && !finalVideoUrl) {
      const videoBytes = Uint8Array.from(atob(workerData.video.base64), c => c.charCodeAt(0));
      const videoPath = `videos/remotion-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
        finalVideoUrl = publicUrlData.publicUrl;
        console.log(`[RENDER-VIDEO] Uploaded to storage: ${videoPath}`);
      }
    }

    // Update generation record as completed
    if (generationId) {
      await supabase.from("generations").update({
        status: "completed",
        progress: 100,
        media_url: finalVideoUrl || null,
        completed_at: new Date().toISOString(),
      }).eq("id", generationId);
    }

    console.log(`[RENDER-VIDEO] ✓ Done. URL: ${finalVideoUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        generationId,
        videoUrl: finalVideoUrl,
        composition,
        quality,
        creditCost,
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
