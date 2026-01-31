import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// DELAYED CHECK CRON - Minimal API calls strategy
// Runs every 2-3 minutes, checks only ready-to-check generations
// ============================================================

// Provider-specific configuration
const PROVIDER_CONFIG: Record<string, { maxChecks: number; recheckDelay: number }> = {
  openai: { maxChecks: 3, recheckDelay: 60000 },  // Sora: max 3 checks, recheck in 60s
  gemini: { maxChecks: 2, recheckDelay: 30000 },  // Veo: max 2 checks, recheck in 30s
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[CRON] Starting delayed video status check...");

    // Get generations that are ready to be checked
    const { data: pendingGenerations, error: fetchError } = await supabase
      .from("generations")
      .select("id, external_task_id, provider, check_count, user_id, actual_cost, quality")
      .eq("status", "processing")
      .not("external_task_id", "is", null)
      .lte("check_after", new Date().toISOString())
      .order("check_after", { ascending: true })
      .limit(10); // Process max 10 at a time to avoid timeout

    if (fetchError) {
      console.error("[CRON] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!pendingGenerations || pendingGenerations.length === 0) {
      console.log("[CRON] No pending generations to check");
      return new Response(
        JSON.stringify({ success: true, checked: 0, message: "No pending generations" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CRON] Found ${pendingGenerations.length} generations to check`);

    let completed = 0;
    let failed = 0;
    let rescheduled = 0;
    let maxedOut = 0;

    for (const gen of pendingGenerations) {
      const provider = gen.provider || "openai";
      const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.openai;
      const checkCount = gen.check_count || 0;
      
      console.log(`[CRON] Checking ${gen.id} (${provider}, check #${checkCount + 1}/${config.maxChecks})`);

      // Check if max checks exceeded
      if (checkCount >= config.maxChecks) {
        console.log(`[CRON] Max checks reached for ${gen.id}, marking as timeout`);
        await supabase
          .from("generations")
          .update({
            status: "error",
            error_message: "Generation timeout - max status checks reached",
            completed_at: new Date().toISOString(),
          })
          .eq("id", gen.id);
        
        // Refund credits if applicable
        if (gen.user_id && gen.actual_cost && gen.actual_cost > 0) {
          await supabase.rpc("add_credits", {
            p_user_id: gen.user_id,
            p_amount: Math.round(gen.actual_cost),
          });
          await supabase.from("credit_transactions").insert({
            user_id: gen.user_id,
            amount: Math.round(gen.actual_cost),
            type: "refund",
            description: `Refund: Video generation timeout (${gen.quality})`,
          });
          console.log(`[CRON] Refunded ${gen.actual_cost} credits for ${gen.id}`);
        }
        
        maxedOut++;
        continue;
      }

      try {
        let statusResult: { status: string; videoUrl?: string; progress?: number; error?: string };

        if (provider === "openai") {
          // OpenAI Sora status check
          const response = await fetch(`https://api.openai.com/v1/videos/${gen.external_task_id}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[CRON] OpenAI error for ${gen.id}:`, errorText);
            statusResult = { status: "failed", error: errorText };
          } else {
            const result = await response.json();
            const openaiStatus = result.status || "queued";
            
            if (openaiStatus === "completed" || openaiStatus === "succeeded") {
              statusResult = { 
                status: "completed", 
                videoUrl: result.output_video || result.video_url || result.output?.video,
                progress: 100 
              };
            } else if (openaiStatus === "failed" || openaiStatus === "error") {
              statusResult = { status: "failed", error: result.error };
            } else {
              statusResult = { status: "processing", progress: 50 };
            }
          }
        } else {
          // Gemini Veo status check - poll operation
          const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
          const response = await fetch(`${BASE_URL}/${gen.external_task_id}`, {
            method: "GET",
            headers: { "x-goog-api-key": GEMINI_API_KEY },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[CRON] Gemini error for ${gen.id}:`, errorText);
            statusResult = { status: "failed", error: errorText };
          } else {
            const result = await response.json();
            const isDone = result.done === true;
            
            if (isDone) {
              const videoUri = result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
              if (videoUri) {
                statusResult = { 
                  status: "completed", 
                  videoUrl: videoUri,
                  progress: 100 
                };
              } else if (result.error) {
                statusResult = { status: "failed", error: result.error.message };
              } else {
                statusResult = { status: "completed", progress: 100 };
              }
            } else {
              statusResult = { status: "processing", progress: 50 };
            }
          }
        }

        // Update generation based on result
        if (statusResult.status === "completed" && statusResult.videoUrl) {
          await supabase
            .from("generations")
            .update({
              status: "completed",
              media_url: statusResult.videoUrl,
              progress: 100,
              step: "completed",
              check_count: checkCount + 1,
              completed_at: new Date().toISOString(),
            })
            .eq("id", gen.id);
          console.log(`[CRON] ✓ Completed: ${gen.id}`);
          completed++;
        } else if (statusResult.status === "failed") {
          await supabase
            .from("generations")
            .update({
              status: "error",
              error_message: statusResult.error || "Generation failed",
              check_count: checkCount + 1,
              completed_at: new Date().toISOString(),
            })
            .eq("id", gen.id);
          
          // Refund credits
          if (gen.user_id && gen.actual_cost && gen.actual_cost > 0) {
            await supabase.rpc("add_credits", {
              p_user_id: gen.user_id,
              p_amount: Math.round(gen.actual_cost),
            });
            await supabase.from("credit_transactions").insert({
              user_id: gen.user_id,
              amount: Math.round(gen.actual_cost),
              type: "refund",
              description: `Refund: Video generation failed (${gen.quality})`,
            });
          }
          console.log(`[CRON] ✗ Failed: ${gen.id}`);
          failed++;
        } else {
          // Still processing - reschedule next check
          const nextCheck = new Date(Date.now() + config.recheckDelay);
          await supabase
            .from("generations")
            .update({
              check_count: checkCount + 1,
              check_after: nextCheck.toISOString(),
              progress: statusResult.progress || 50,
            })
            .eq("id", gen.id);
          console.log(`[CRON] ⏳ Rescheduled: ${gen.id} for ${nextCheck.toISOString()}`);
          rescheduled++;
        }

      } catch (error) {
        console.error(`[CRON] Error checking ${gen.id}:`, error);
        // Reschedule on error
        const nextCheck = new Date(Date.now() + 60000);
        await supabase
          .from("generations")
          .update({
            check_count: checkCount + 1,
            check_after: nextCheck.toISOString(),
          })
          .eq("id", gen.id);
        rescheduled++;
      }
    }

    const summary = {
      success: true,
      checked: pendingGenerations.length,
      completed,
      failed,
      rescheduled,
      maxedOut,
    };

    console.log("[CRON] Summary:", summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[CRON] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
