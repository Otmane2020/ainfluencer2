import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  validateAndBuildContext, 
  fetchProjectContext,
  logContextValidation,
  type MarketingContext 
} from "../_shared/generation-context-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// CREDIT COSTS BY QUALITY
// ============================================================

const CREDIT_COSTS: Record<string, number> = {
  standard: 5,
  fast: 5,
  pro: 10,
  medium: 10,
  cinema: 20,
  high: 20,
};

function getCreditCost(quality: string): number {
  return CREDIT_COSTS[quality] || CREDIT_COSTS["standard"];
}

// ============================================================
// VIDEO DURATION CONFIG
// ============================================================

const DURATION_CONFIG: Record<string, { duration: number; resolution: string }> = {
  fast: { duration: 5, resolution: "720x1280" },
  standard: { duration: 5, resolution: "720x1280" },
  medium: { duration: 8, resolution: "1080x1920" },
  pro: { duration: 8, resolution: "1080x1920" },
  high: { duration: 10, resolution: "1080x1920" },
  cinema: { duration: 10, resolution: "1080x1920" },
};

// ============================================================
// AI VIDEO GENERATOR - via Nano Banana Video API
// ============================================================

interface VideoRequest {
  prompt: string;
  model?: string;
  provider?: string;
  duration?: number;
  resolution?: string;
  format?: string;
  action?: string;
  taskId?: string;
  quality?: string;
  skipCreditDeduction?: boolean;
  projectId?: string;
  projectName?: string;
  projectUrl?: string;
  logoUrl?: string;
  detectedLanguage?: string;
  aiContextSummary?: string;
  marketingContext?: MarketingContext | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const body: VideoRequest = await req.json();
    const { 
      action, 
      taskId, 
      prompt, 
      format = "vertical",
      quality = "standard",
      skipCreditDeduction = false,
      projectId,
      projectName,
      projectUrl,
      detectedLanguage,
      aiContextSummary,
      marketingContext,
    } = body;

    // Get duration config based on quality
    const config = DURATION_CONFIG[quality] || DURATION_CONFIG.standard;
    const duration = body.duration || config.duration;

    // ============================================================
    // STATUS CHECK - Poll Nano Banana task status
    // ============================================================
    if (action === "status" && taskId) {
      console.log("[AI-VIDEO] Checking status for:", taskId);

      try {
        const statusResponse = await fetch(`https://nanobananavideo.com/api/v1/task/${taskId}`, {
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
        });

        if (!statusResponse.ok) {
          console.log("[AI-VIDEO] Status check failed:", statusResponse.status);
          return new Response(
            JSON.stringify({ success: true, status: "processing", progress: 50 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const statusData = await statusResponse.json();
        const status = (statusData.status || "").toLowerCase();

        console.log("[AI-VIDEO] Task status:", status);

        if (status === "completed" || status === "success" || status === "done") {
          const videoUrl = statusData.video_url || statusData.output_url || statusData.url;
          
          if (videoUrl) {
            // Download and upload to Supabase storage for permanent URL
            try {
              const videoResponse = await fetch(videoUrl);
              if (videoResponse.ok) {
                const videoBuffer = await videoResponse.arrayBuffer();
                const videoBytes = new Uint8Array(videoBuffer);
                const videoPath = `videos/video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;

                const { error: uploadError } = await supabase.storage
                  .from("media")
                  .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });

                if (!uploadError) {
                  const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
                  console.log("[AI-VIDEO] Video uploaded to storage");
                  
                  return new Response(
                    JSON.stringify({ 
                      success: true, 
                      status: "completed", 
                      progress: 100,
                      videoUrl: publicUrlData.publicUrl,
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                  );
                }
              }
            } catch (uploadErr) {
              console.error("[AI-VIDEO] Upload error:", uploadErr);
            }
            
            // Return original URL if upload fails
            return new Response(
              JSON.stringify({ 
                success: true, 
                status: "completed", 
                progress: 100,
                videoUrl,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if (status === "failed" || status === "error") {
          return new Response(
            JSON.stringify({ success: false, status: "failed", error: "Video generation failed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Still processing
        return new Response(
          JSON.stringify({ success: true, status: "processing", progress: 50 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (err) {
        console.error("[AI-VIDEO] Status check error:", err);
        return new Response(
          JSON.stringify({ success: true, status: "processing", progress: 25 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================================
    // CREATE VIDEO VIA NANO BANANA
    // ============================================================
    if (!prompt) {
      throw new Error("prompt is required");
    }

    const creditCost = getCreditCost(quality);

    console.log("=== GENERATE AI VIDEO (Nano Banana) ===");
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`Quality: ${quality} | Duration: ${duration}s | Credit Cost: ${creditCost}`);
    console.log(`Format: ${format}`);
    console.log("Prompt:", prompt.slice(0, 100));

    // ============================================================
    // FETCH PROJECT CONTEXT IF projectId PROVIDED
    // ============================================================
    let project: any = null;
    let fetchedMarketingContext: MarketingContext | null = null;
    
    if (projectId) {
      console.log("[AI-VIDEO] Fetching project context for:", projectId);
      const { project: fetchedProject, marketingContext: mc, error } = await fetchProjectContext(supabase, projectId);
      if (error) {
        console.warn("[AI-VIDEO] Project fetch warning:", error);
      } else {
        project = fetchedProject;
        fetchedMarketingContext = mc;
        console.log("[AI-VIDEO] Project loaded:", project?.name || "unknown");
      }
    }

    // ============================================================
    // BUILD ENHANCED PROMPT WITH CONTEXT GUARD
    // ============================================================
    const aspectRatio = format === "vertical" || format === "portrait" ? "9:16" : "16:9";
    
    // Use the shared context guard for consistent brand injection
    const contextGuard = validateAndBuildContext({
      projectId: project?.id || projectId,
      projectName: project?.name || projectName,
      projectDescription: project?.description,
      projectUrl: project?.url || projectUrl,
      logoUrl: project?.logo_url,
      avatarUrl: project?.avatar_url,
      themeColor: project?.theme_color,
      detectedLanguage: project?.detected_language || detectedLanguage || "en",
      marketingContext: fetchedMarketingContext || marketingContext || project?.marketing_context,
      aiContextSummary: project?.ai_context_summary || aiContextSummary,
      scrapedMarkdown: project?.scraped_markdown,
      generationPrompt: prompt,
      generationType: "video",
    });

    logContextValidation(contextGuard, "AI-VIDEO");

    // Add format-specific instructions to the enhanced prompt
    const formatInstructions = aspectRatio === "9:16" 
      ? "Vertical portrait format, perfect for Instagram Reels and TikTok." 
      : "Horizontal landscape format, perfect for YouTube.";
    
    const finalPrompt = `${contextGuard.enhancedPrompt}\n\n${formatInstructions} Professional quality, vibrant colors, smooth motion.`;

    console.log("[AI-VIDEO] Context Score:", contextGuard.contextScore);
    console.log("[AI-VIDEO] Enhanced prompt length:", finalPrompt.length);

    // ============================================================
    // CREDIT VALIDATION & DEDUCTION
    // ============================================================
    if (userId && !skipCreditDeduction) {
      const { data: creditsData, error: creditsError } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        console.error("Credits fetch error:", creditsError);
      }

      const currentBalance = creditsData?.balance || 0;
      console.log(`Current balance: ${currentBalance} | Required: ${creditCost}`);

      if (currentBalance < creditCost) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Insufficient credits", 
            code: "INSUFFICIENT_CREDITS",
            required: creditCost,
            balance: currentBalance,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct credits
      const { data: deductSuccess, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: userId,
        p_amount: creditCost,
      });

      if (deductError || !deductSuccess) {
        console.error("Credit deduction failed:", deductError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Failed to deduct credits", 
            code: "DEDUCTION_FAILED" 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -creditCost,
        type: "consumption",
        description: `AI Video generation (${quality}, ${duration}s)`,
      });

      console.log(`✓ Deducted ${creditCost} credits for AI video generation`);
    }

    // ============================================================
    // GENERATE VIDEO VIA NANO BANANA VIDEO API
    // ============================================================
    try {
      console.log("[AI-VIDEO] Generating via Nano Banana Video API...");
      
      // Call Nano Banana Video API with context-enriched prompt
      const videoResponse = await fetch("https://nanobananavideo.com/api/v1/text-to-video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          duration: Math.min(duration, 10), // Nano Banana max 10s
          aspect_ratio: aspectRatio,
          resolution: duration >= 8 ? "1080p" : "720p",
        }),
      });

      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error("[AI-VIDEO] Nano Banana error:", videoResponse.status, errorText);
        
        // Refund credits on failure
        if (userId && !skipCreditDeduction) {
          await supabase.rpc("add_credits", {
            p_user_id: userId,
            p_amount: creditCost,
          });
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: creditCost,
            type: "refund",
            description: `Refund: AI Video generation failed`,
          });
          console.log(`✓ Refunded ${creditCost} credits due to API error`);
        }
        throw new Error(`Nano Banana error: ${videoResponse.status} - ${errorText}`);
      }

      const videoResult = await videoResponse.json();
      const nanoTaskId = videoResult.task_id || videoResult.id;
      
      if (!nanoTaskId) {
        console.error("[AI-VIDEO] No task ID in response");
        throw new Error("No task ID returned from Nano Banana");
      }

      console.log("[AI-VIDEO] Task created:", nanoTaskId);

      return new Response(
        JSON.stringify({
          success: true,
          taskId: nanoTaskId,
          status: "processing",
          progress: 10,
          model: "nano-banana",
          provider: "lovable",
          duration,
          quality,
          creditCost: skipCreditDeduction ? 0 : creditCost,
          contextScore: contextGuard.contextScore,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (genError) {
      // Refund credits on failure
      if (userId && !skipCreditDeduction) {
        await supabase.rpc("add_credits", {
          p_user_id: userId,
          p_amount: creditCost,
        });
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: creditCost,
          type: "refund",
          description: `Refund: AI Video generation failed (${quality})`,
        });
        console.log(`✓ Refunded ${creditCost} credits due to generation error`);
      }
      throw genError;
    }

  } catch (error) {
    console.error("[AI-VIDEO] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
