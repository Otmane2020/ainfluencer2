import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// CREDIT COSTS BY QUALITY (AI Video MULTI tool)
// ============================================================

const CREDIT_COSTS: Record<string, number> = {
  standard: 5,
  pro: 10,
  cinema: 20,
  "fast": 5,
  "medium": 10,
  "high": 20,
};

function getCreditCost(quality: string): number {
  return CREDIT_COSTS[quality] || CREDIT_COSTS["standard"];
}

// ============================================================
// AI VIDEO GENERATOR - All via Nano Banana (Lovable AI)
// No more CometAPI/Replicate dependency
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
      duration = 5,
      format = "vertical",
      quality = "standard",
      skipCreditDeduction = false,
    } = body;

    // ============================================================
    // STATUS CHECK - Lovable AI tasks complete immediately
    // ============================================================
    if (action === "status" && taskId) {
      console.log("[AI-VIDEO] Checking status for:", taskId);

      // All Lovable AI tasks are completed immediately
      if (taskId.startsWith("lovable-")) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: "completed", 
            progress: 100,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Legacy: return processing for unknown tasks
      return new Response(
        JSON.stringify({ success: true, status: "processing", progress: 50 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // CREATE VIDEO VIA LOVABLE AI (Nano Banana)
    // ============================================================
    if (!prompt) {
      throw new Error("prompt is required");
    }

    const creditCost = getCreditCost(quality);

    console.log("=== GENERATE AI VIDEO (Lovable AI) ===");
    console.log(`User: ${userId || "anonymous"}`);
    console.log(`Quality: ${quality} | Credit Cost: ${creditCost}`);
    console.log(`Format: ${format} | Duration: ${duration}s`);
    console.log("Prompt:", prompt.slice(0, 100));

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
    // GENERATE VIDEO FRAME VIA NANO BANANA (LOVABLE AI)
    // ============================================================
    try {
      const aspectRatio = format === "vertical" || format === "portrait" ? "9:16 vertical portrait" : "16:9 horizontal landscape";
      
      console.log("[AI-VIDEO] Generating via Lovable AI (Nano Banana)...");
      
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Generate a stunning cinematic video frame: ${prompt}. 
Style: ${aspectRatio}, ultra high quality, professional cinematography, vibrant colors, perfect lighting, 
cinematic composition, high resolution, social media ready.`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error("[AI-VIDEO] Lovable AI error:", imageResponse.status, errorText);
        
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
        throw new Error(`Lovable AI error: ${imageResponse.status} - ${errorText}`);
      }

      const imageResult = await imageResponse.json();
      console.log("[AI-VIDEO] Lovable AI response received");
      
      // Extract the generated image from the response
      let videoUrl: string | null = null;
      
      const imageData = imageResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageData) {
        // Upload base64 image to storage
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileName = `ai-videos/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, binaryData, {
            contentType: "image/png",
            upsert: true,
          });
          
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("media")
            .getPublicUrl(fileName);
          videoUrl = publicUrlData.publicUrl;
          console.log("[AI-VIDEO] Uploaded to storage:", videoUrl);
        } else {
          console.error("[AI-VIDEO] Upload error:", uploadError);
        }
      }

      const taskId = `lovable-${Date.now()}`;
      console.log("[AI-VIDEO] ✓ Generation completed via Lovable AI");

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          status: "completed",
          progress: 100,
          videoUrl,
          model: "nano-banana",
          provider: "lovable",
          duration,
          quality,
          creditCost: skipCreditDeduction ? 0 : creditCost,
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
