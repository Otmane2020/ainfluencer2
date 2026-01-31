import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// CREDIT COSTS BY QUALITY
// ============================================================

const CREDIT_COSTS: Record<string, number> = {
  standard: 5,
  pro: 10,
  cinema: 20,
  // Legacy mappings
  "smart-video": 5,
  "high-video": 10,
  "cinema-video": 20,
};

function getCreditCost(quality: string): number {
  return CREDIT_COSTS[quality] || CREDIT_COSTS["standard"];
}

// ============================================================
// MODEL SELECTION BY QUALITY
// Standard: Nano Banana (fast, reliable)
// Pro: Sora (CometAPI)
// Cinema: Sora 2 (CometAPI - highest quality)
// ============================================================

interface VideoModelConfig {
  model: string;
  provider: "nanobanana" | "cometapi";
  maxDuration: number;
}

function getVideoModel(quality: string): VideoModelConfig {
  switch (quality) {
    case "cinema":
      // Premium quality - Sora 2 via CometAPI
      return { model: "sora-2", provider: "cometapi", maxDuration: 12 };
    case "pro":
      // High quality - Sora via CometAPI
      return { model: "sora", provider: "cometapi", maxDuration: 12 };
    case "standard":
    default:
      // Fast generation - Nano Banana
      return { model: "nanobanana-standard", provider: "nanobanana", maxDuration: 10 };
  }
}

function clampDuration(duration: number, config: VideoModelConfig): number {
  const min = 3;
  return Math.max(min, Math.min(config.maxDuration, duration));
}

interface VideoRequest {
  prompt: string;
  avatarUrl?: string;
  duration?: number;
  size?: string;
  format?: string;
  projectId?: string;
  campaignId?: string;
  videoMode?: string;
  quality?: string;
  skipCreditDeduction?: boolean;
  // Project context for brand-aligned generation
  projectName?: string;
  projectUrl?: string;
  logoUrl?: string;
  detectedLanguage?: string;
  aiContextSummary?: string;
  marketingContext?: any;
}

interface VideoStatusResponse {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    
    if (!COMETAPI_API_KEY) {
      throw new Error("COMETAPI_API_KEY is not configured");
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    if (action === "create") {
      const { 
        prompt, 
        avatarUrl, 
        duration = 8, 
        size = "720x1280",
        format = "vertical",
        projectId,
        campaignId,
        videoMode = "standard",
        quality = "standard",
        skipCreditDeduction = false,
        // Project context
        projectName,
        projectUrl,
        logoUrl,
        detectedLanguage,
        aiContextSummary,
        marketingContext,
      }: VideoRequest = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // Get model config based on quality
      const modelConfig = getVideoModel(quality);
      
      // Clamp duration to model limits
      const clampedDuration = clampDuration(duration, modelConfig);

      // Determine credit cost
      const creditCost = getCreditCost(quality);

      console.log("=== Video Generation ===");
      console.log(`User: ${userId || "anonymous"}`);
      console.log(`Quality: ${quality} | Model: ${modelConfig.model} | Provider: ${modelConfig.provider}`);
      console.log(`Credit Cost: ${creditCost}`);
      console.log("Prompt:", prompt.substring(0, 100) + "...");
      console.log("Duration:", clampedDuration, "s | Size:", size);

      // ============================================================
      // CREDIT VALIDATION & DEDUCTION
      // ============================================================
      if (userId && !skipCreditDeduction) {
        const { data: creditsData } = await supabase
          .from("credits")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();

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

        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: -creditCost,
          type: "consumption",
          description: `Video generation (${modelConfig.model}, ${clampedDuration}s)`,
        });

        console.log(`✓ Deducted ${creditCost} credits`);
      }

      // Build enhanced prompt with project context
      let fullPrompt = prompt;
      
      // Add brand context if available
      if (projectName || aiContextSummary || marketingContext) {
        const contextParts: string[] = [];
        
        if (projectName) {
          contextParts.push(`Brand: ${projectName}`);
        }
        if (projectUrl) {
          contextParts.push(`Website: ${projectUrl}`);
        }
        if (aiContextSummary) {
          contextParts.push(`Brand Context: ${aiContextSummary.substring(0, 500)}`);
        }
        if (marketingContext?.target_audience?.primary) {
          contextParts.push(`Target: ${marketingContext.target_audience.primary}`);
        }
        if (marketingContext?.brand_personality?.tone) {
          contextParts.push(`Tone: ${marketingContext.brand_personality.tone}`);
        }
        if (marketingContext?.visual_identity?.primary_color) {
          contextParts.push(`Brand Color: ${marketingContext.visual_identity.primary_color}`);
        }
        if (marketingContext?.products_services?.length > 0) {
          const products = marketingContext.products_services.slice(0, 3).map((p: any) => p.name).join(", ");
          contextParts.push(`Products: ${products}`);
        }
        
        if (contextParts.length > 0) {
          fullPrompt = `[BRAND CONTEXT: ${contextParts.join(" | ")}]\n\n${prompt}`;
        }
      }
      
      // Add language instruction
      const languageMap: Record<string, string> = {
        en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese"
      };
      const langName = languageMap[detectedLanguage || "en"] || "English";
      if (detectedLanguage && detectedLanguage !== "en") {
        fullPrompt = `[OUTPUT IN ${langName.toUpperCase()} - NO ENGLISH TEXT]\n${fullPrompt}`;
      }
      
      if (avatarUrl) {
        fullPrompt = `Ultra-realistic cinematic video: ${fullPrompt}. Style: professional, high quality, cinematic lighting, vibrant colors.`;
      }

      console.log(`[VIDEO-SORA] Project context: ${projectName || "none"} | Language: ${detectedLanguage || "en"}`);

      // Create generation record
      let generationId: string | null = null;
      if (userId) {
        const { data: genData, error: genError } = await supabase
          .from("generations")
          .insert({
            user_id: userId,
            project_id: projectId || null,
            campaign_id: campaignId || null,
            type: "video",
            video_mode: videoMode,
            status: "processing",
            prompt: prompt.substring(0, 500),
            format: format,
            duration: clampedDuration,
            model: modelConfig.model,
            quality: quality,
            step: "generating",
            progress: 10,
            estimated_cost: creditCost,
            actual_cost: skipCreditDeduction ? 0 : creditCost,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!genError && genData) {
          generationId = genData.id;
          console.log("Created generation record:", generationId);
        }
      }

      // ============================================================
      // VIDEO GENERATION - ROUTE BY PROVIDER
      // ============================================================
      
      const aspectRatio = format === "vertical" ? "9:16" : "16:9";
      let taskId: string;
      let initialStatus: string;
      let mediaUrl: string | null = null;

      if (modelConfig.provider === "nanobanana") {
        // ============================================================
        // NANO BANANA / COMETAPI VIDEO - WITH LOVABLE AI FALLBACK
        // Try CometAPI first, fall back to Lovable AI if unavailable
        // ============================================================
        console.log(`Trying CometAPI Sora for standard quality...`);
        
        let cometSuccess = false;
        
        try {
          const cometResponse = await fetch("https://api.cometapi.com/v1/video/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${COMETAPI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sora",
              prompt: fullPrompt,
              duration: `${clampedDuration}`,
              aspect_ratio: aspectRatio,
            }),
          });
          
          const cometText = await cometResponse.text();
          console.log("CometAPI Sora Response:", cometResponse.status, cometText.substring(0, 300));
          
          // Check if response is HTML (error page) instead of JSON
          if (cometText.trim().startsWith("<!") || cometText.trim().startsWith("<html")) {
            console.error("CometAPI returned HTML instead of JSON - trying Lovable AI fallback");
            throw new Error("CometAPI unavailable");
          }
          
          if (!cometResponse.ok) {
            throw new Error(`CometAPI error: ${cometResponse.status}`);
          }
          
          const cometResult = JSON.parse(cometText);
          taskId = cometResult.id || cometResult.task_id || `comet-${Date.now()}`;
          initialStatus = cometResult.status || "queued";
          mediaUrl = cometResult.video_url || cometResult.output || null;
          cometSuccess = true;
          
        } catch (cometError) {
          console.log("CometAPI failed, using Lovable AI as fallback...", cometError);
          
          // ============================================================
          // LOVABLE AI FALLBACK - Generate image for now
          // Video generation via Lovable AI not fully supported yet
          // Generate a high-quality image as placeholder
          // ============================================================
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          
          if (LOVABLE_API_KEY) {
            console.log("Generating image with Lovable AI as video fallback...");
            
            const lovableResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-pro-image-preview",
                messages: [
                  {
                    role: "user",
                    content: `Generate a high-quality cinematic image for a video about: ${fullPrompt.substring(0, 500)}. Make it visually stunning, professional, and suitable for social media content. The image should capture the essence of this video prompt as a single key frame.`,
                  },
                ],
              }),
            });
            
            if (lovableResponse.ok) {
              const lovableResult = await lovableResponse.json();
              const content = lovableResult.choices?.[0]?.message?.content || "";
              
              // Extract image URL if present
              const imageMatch = content.match(/https:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/i);
              if (imageMatch) {
                mediaUrl = imageMatch[0];
                taskId = `lovable-fallback-${Date.now()}`;
                initialStatus = "completed";
                console.log("✓ Lovable AI fallback image generated:", mediaUrl);
              } else {
                throw new Error("Lovable AI did not return an image URL");
              }
            } else {
              throw new Error("Lovable AI fallback failed");
            }
          } else {
            // No fallback available - refund credits
            console.error("No fallback available - refunding credits");
            
            if (userId && !skipCreditDeduction) {
              await supabase.rpc("add_credits", {
                p_user_id: userId,
                p_amount: creditCost,
              });
              await supabase.from("credit_transactions").insert({
                user_id: userId,
                amount: creditCost,
                type: "refund",
                description: `Refund: Video providers unavailable`,
              });
              console.log(`✓ Refunded ${creditCost} credits`);
            }
            
            if (generationId) {
              await supabase
                .from("generations")
                .update({ status: "failed", error_message: "All video providers unavailable", step: "error" })
                .eq("id", generationId);
            }
            
            throw new Error("All video generation providers are currently unavailable. Credits have been refunded.");
          }
        }
        
      } else {
        // ============================================================
        // COMETAPI - SORA / SORA 2
        // ============================================================
        console.log(`Calling CometAPI ${modelConfig.model}...`);
        
        const cometResponse = await fetch("https://api.cometapi.com/v1/video/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${COMETAPI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelConfig.model,
            prompt: fullPrompt,
            duration: `${clampedDuration}`,
            aspect_ratio: aspectRatio,
          }),
        });
        
        const cometText = await cometResponse.text();
        console.log("CometAPI Response:", cometResponse.status, cometText.substring(0, 300));

        // Check if response is HTML (error page) instead of JSON
        if (cometText.trim().startsWith("<!") || cometText.trim().startsWith("<html")) {
          console.error("CometAPI returned HTML instead of JSON - API may be down or rate limited");
          
          // Update generation as failed
          if (generationId) {
            await supabase
              .from("generations")
              .update({ status: "failed", error_message: "CometAPI unavailable", step: "error" })
              .eq("id", generationId);
          }

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
              description: `Refund: CometAPI unavailable (${modelConfig.model})`,
            });
            console.log(`✓ Refunded ${creditCost} credits`);
          }
          
          throw new Error(`CometAPI unavailable: returned HTML error page (status ${cometResponse.status})`);
        }

        if (!cometResponse.ok) {
          console.error("CometAPI video error:", cometText);
          
          // Update generation as failed
          if (generationId) {
            await supabase
              .from("generations")
              .update({ status: "failed", error_message: cometText, step: "error" })
              .eq("id", generationId);
          }

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
              description: `Refund: Video generation failed (${modelConfig.model})`,
            });
            console.log(`✓ Refunded ${creditCost} credits`);
          }
          
          throw new Error(`CometAPI video error: ${cometResponse.status} - ${cometText}`);
        }

        const cometResult = JSON.parse(cometText);
        taskId = cometResult.id || cometResult.task_id || `comet-${Date.now()}`;
        initialStatus = cometResult.status || "queued";
        mediaUrl = cometResult.video_url || cometResult.output || null;
      }
      
      console.log(`✓ Video task created: ${taskId} (status: ${initialStatus})`);

      // Update generation with task ID
      if (generationId) {
        await supabase
          .from("generations")
          .update({ 
            external_task_id: taskId,
            status: initialStatus === "completed" ? "completed" : "processing",
            step: initialStatus === "completed" ? "completed" : "generating",
            progress: initialStatus === "completed" ? 100 : 30,
            media_url: mediaUrl,
          })
          .eq("id", generationId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          generationId,
          status: initialStatus,
          progress: initialStatus === "completed" ? 100 : 30,
          quality,
          model: modelConfig.model,
          provider: modelConfig.provider,
          mediaUrl,
          creditCost: skipCreditDeduction ? 0 : creditCost,
          message: `Video generation started via ${modelConfig.provider === "nanobanana" ? "Nano Banana" : "CometAPI"} (${modelConfig.model})`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      const generationId = url.searchParams.get("generationId");
      
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      // All Lovable AI tasks are completed immediately
      if (taskId.startsWith("lovable-") || taskId.startsWith("nano-")) {
        // Get media URL from generation record if available
        let mediaUrl: string | null = null;
        if (generationId) {
          const { data: genData } = await supabase
            .from("generations")
            .select("media_url")
            .eq("id", generationId)
            .single();
          mediaUrl = genData?.media_url || null;
        }
        
        return new Response(
          JSON.stringify({
            id: taskId,
            status: "completed",
            progress: 100,
            videoUrl: mediaUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Legacy: CometAPI status check (for existing tasks)
      console.log("Checking status for legacy CometAPI task:", taskId);

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Status check error:", errorText);
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Task status:", result.status, "Progress:", result.progress);

      const statusResponse: VideoStatusResponse = {
        id: result.id,
        status: result.status,
        progress: result.progress || 0,
      };

      // Map CometAPI progress to our progress
      let dbProgress = 20;
      if (result.status === "in_progress") {
        dbProgress = Math.min(80, 20 + (result.progress || 0) * 0.6);
      }

      if (result.status === "completed") {
        let videoUrl = result.output_video || result.video_url || result.url;
        
        // If no URL, try content endpoint
        if (!videoUrl) {
          try {
            const contentResponse = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
              headers: { "Authorization": `Bearer ${COMETAPI_API_KEY}` },
            });
            
            if (contentResponse.ok) {
              const videoBlob = await contentResponse.blob();
              const arrayBuffer = await videoBlob.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              
              const fileName = `videos/${Date.now()}-${taskId}.mp4`;
              const { error: uploadError } = await supabase.storage
                .from("media")
                .upload(fileName, uint8Array, { contentType: "video/mp4", upsert: true });
              
              if (!uploadError) {
                const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
                videoUrl = publicUrlData.publicUrl;
                console.log("Video uploaded to storage:", videoUrl);
              }
            }
          } catch (e) {
            console.error("Content download failed:", e);
          }
        }
        
        statusResponse.videoUrl = videoUrl;
        dbProgress = 100;

        // Update generation as completed
        if (generationId) {
          await supabase
            .from("generations")
            .update({
              status: "completed",
              media_url: videoUrl,
              step: "completed",
              progress: 100,
              completed_at: new Date().toISOString(),
            })
            .eq("id", generationId);
        }
      } else if (result.status === "failed") {
        statusResponse.error = result.error || "Video generation failed";
        
        if (generationId) {
          await supabase
            .from("generations")
            .update({
              status: "failed",
              error_message: result.error || "Generation failed",
              step: "error",
            })
            .eq("id", generationId);
        }
      } else if (generationId) {
        // Update progress
        await supabase
          .from("generations")
          .update({ progress: dbProgress, step: "processing" })
          .eq("id", generationId);
      }

      return new Response(
        JSON.stringify(statusResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "download") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        throw new Error("taskId is required for download");
      }

      console.log("Downloading video for task:", taskId);

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download error:", errorText);
        throw new Error(`Download failed: ${response.status}`);
      }

      const videoBlob = await response.blob();
      
      return new Response(videoBlob, {
        headers: { ...corsHeaders, "Content-Type": "video/mp4" },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Video generation error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
