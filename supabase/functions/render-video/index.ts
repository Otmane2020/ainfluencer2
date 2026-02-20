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

    if (!RENDER_WORKER_URL) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Render worker not configured. Add RENDER_WORKER_URL in secrets.",
          code: "WORKER_NOT_CONFIGURED",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize base URL
    if (!RENDER_WORKER_URL.startsWith("http")) {
      RENDER_WORKER_URL = `https://${RENDER_WORKER_URL}`;
    }
    const baseWorkerUrl = RENDER_WORKER_URL
      .replace(/\/renders?\/?$/, "")
      .replace(/\/$/, "");

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
    const { quality = "standard", projectId, props = {} } = body;

    const DURATION_BY_QUALITY: Record<string, number> = { standard: 10, pro: 15, cinema: 20 };
    const duration = props.duration || DURATION_BY_QUALITY[quality] || 10;

    const CREDIT_COSTS: Record<string, number> = { standard: 5, pro: 10, cinema: 20 };
    const creditCost = CREDIT_COSTS[quality] || 5;

    // Clean the title text for Remotion composition
    const rawText: string = props.text || "Video render";
    const cleanText = rawText
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FEFF}]/gu, "")
      .replace(/^━+$/gm, "")
      .replace(/#\w+/g, "")
      .replace(/\[[\d-]+s\]/g, "")
      .replace(/\n{2,}/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 120);

    console.log(`[RENDER-VIDEO] User: ${userId || "anon"} | Quality: ${quality} | Duration: ${duration}s`);
    console.log(`[RENDER-VIDEO] Title text: "${cleanText}"`);
    console.log(`[RENDER-VIDEO] Worker: ${baseWorkerUrl}`);

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
      prompt: cleanText || "Video render",
      model: "remotion", provider: "railway", duration,
    }).select().single();
    const generationId = generationRecord?.id;
    console.log(`[RENDER-VIDEO] Generation: ${generationId}`);

    // POST to Remotion server — /renders endpoint expects { titleText }
    let jobId: string | undefined;
    try {
      const workerRes = await fetch(`${baseWorkerUrl}/renders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleText: cleanText }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!workerRes.ok) {
        const errBody = await workerRes.text();
        throw new Error(`Worker rejected (${workerRes.status}): ${errBody.slice(0, 300)}`);
      }

      const workerJson = await workerRes.json();
      jobId = workerJson.jobId;
      console.log(`[RENDER-VIDEO] Job accepted: ${jobId}`);
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`[RENDER-VIDEO] Worker call failed: ${msg}`);

      // Refund credits
      if (userId) {
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: creditCost });
        await supabase.from("credit_transactions").insert({
          user_id: userId, amount: creditCost, type: "refund",
          description: "Refund: Worker unreachable",
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

    // Store jobId and update progress
    if (generationId) {
      await supabase.from("generations").update({
        progress: 20,
        external_task_id: jobId || null,
      }).eq("id", generationId);
    }

    // Return immediately — client polls via poll-render-job
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
