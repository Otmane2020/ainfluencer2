import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// VALID STRIPE PRODUCTS - Only these grant video access
// ============================================================

const VALID_VIDEO_PRODUCTS = [
  "prod_TsR9BN6zNpq8Rp", // Pro
  "prod_TsR93v9Am93N8O", // Business
];

const VALID_VIDEO_PRICES = [
  "price_1SugHGEfti9t9nN9luP2Qtj9", // Pro
  "price_1SugHIEfti9t9nN9eJMHoewy", // Business
];

// Verify subscription before generation
async function verifyVideoAccess(authHeader: string | null): Promise<{ valid: boolean; error?: string; userId?: string }> {
  if (!authHeader) {
    return { valid: false, error: "Authorization required" };
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables for subscription check");
    return { valid: false, error: "Server configuration error" };
  }

  // Use service role client for DB queries
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  
  // Create a user-context client to validate the user's JWT
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  
  try {
    const token = authHeader.replace("Bearer ", "");
    
    let userId: string;
    let userEmail: string;
    
    // Use getClaims for JWT validation with the user-context client
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log("[VIDEO-ACCESS] getClaims failed, trying getUser:", claimsError?.message);
      // Fallback to getUser with the user-context client
      const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
      if (userError || !userData.user?.email) {
        console.error("[VIDEO-ACCESS] getUser also failed:", userError?.message);
        return { valid: false, error: "Invalid authentication" };
      }
      userId = userData.user.id;
      userEmail = userData.user.email;
    } else {
      userId = claimsData.claims.sub as string;
      userEmail = claimsData.claims.email as string;
    }

    if (!userEmail) {
      return { valid: false, error: "User email not available" };
    }

    // ============================================================
    // CHECK DATABASE FIRST for lifetime/manual grants
    // Lifetime users get FULL access regardless of plan_id
    // ============================================================
    const { data: lifetimeGrant } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("stripe_customer_id", "lifetime_grant")
      .maybeSingle();

    if (lifetimeGrant) {
      console.log(`[VIDEO-ACCESS] LIFETIME GRANT - Full access granted for ${userEmail}`);
      return { valid: true, userId };
    }

    // FIX 1: Use valid Stripe API version
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    
    // Find customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) {
      console.log(`[VIDEO-ACCESS] No Stripe customer for ${userEmail}`);
      return { valid: false, error: "Subscription required. Please subscribe to Pro or Business plan." };
    }

    // Check active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      console.log(`[VIDEO-ACCESS] No active subscription for ${userEmail}`);
      return { valid: false, error: "Subscription required. Please subscribe to Pro or Business plan." };
    }

    // FIX 2 & 3: Check ALL subscription items, handle product as string or object
    const subscription = subscriptions.data[0];
    
    const hasValidItem = subscription.items.data.some((item: { price: { product: string | { id: string }; id: string } }) => {
      const product = typeof item.price.product === "string"
        ? item.price.product
        : item.price.product.id;
      
      return (
        VALID_VIDEO_PRODUCTS.includes(product) ||
        VALID_VIDEO_PRICES.includes(item.price.id)
      );
    });

    if (!hasValidItem) {
      const firstProductId = typeof subscription.items.data[0].price.product === "string"
        ? subscription.items.data[0].price.product
        : (subscription.items.data[0].price.product as { id: string }).id;
      console.log(`[VIDEO-ACCESS] No valid video item found. First product: ${firstProductId}`);
      return { 
        valid: false, 
        error: "Your plan does not include video generation. Please upgrade to Pro or Business.",
      };
    }

    console.log(`[VIDEO-ACCESS] Access granted for ${userEmail}`);
    return { valid: true, userId };
  } catch (error) {
    console.error("[VIDEO-ACCESS] Error:", error);
    return { valid: false, error: "Subscription verification failed" };
  }
}

// ============================================================
// MODEL POOL CONFIGURATION - Weighted Random Selection
// ============================================================

interface ModelOption {
  id: string;
  apiModel: string;
  weight: number;
  durations: number[];
  maxSize: { portrait: string; landscape: string };
}

// FIX 4: Coherent model routing - clear mapping for pricing
// NOTE: veo-2 and kling-video are currently unavailable on CometAPI (503 model_not_found)
// Using sora-2 as the only stable model across all tiers
const VIDEO_MODEL_POOLS: Record<string, ModelOption[]> = {
  // Smart Video - Using sora-2 (only stable model available)
  "smart-video": [
    { id: "sora-2-lite", apiModel: "sora-2", weight: 100, durations: [4, 8], maxSize: { portrait: "720x1280", landscape: "1280x720" } },
  ],
  
  // High Video - sora-2 primary
  "high-video": [
    { id: "sora-2", apiModel: "sora-2", weight: 100, durations: [4, 8, 12], maxSize: { portrait: "720x1280", landscape: "1280x720" } },
  ],
  
  // Cinema Video - sora-2 with longer durations
  "cinema-video": [
    { id: "sora-2-pro", apiModel: "sora-2", weight: 100, durations: [8, 12, 20], maxSize: { portrait: "720x1280", landscape: "1280x720" } },
  ],
};

// Legacy model ID mappings for backwards compatibility
const LEGACY_MODEL_MAPPINGS: Record<string, string> = {
  "kling-std": "smart-video",
  "kling-v2-master": "smart-video",
  "veo-3.1": "high-video",
  "veo-fast": "smart-video",
  "veo-pro": "cinema-video",
  "veo-3.1-pro": "high-video",
  "sora-2": "high-video",
  "sora-2-pro": "cinema-video",
  "minimax-hailuo": "smart-video",
};

function selectModelFromPool(qualityId: string): ModelOption {
  // Map legacy model IDs to quality levels
  const mappedQualityId = LEGACY_MODEL_MAPPINGS[qualityId] || qualityId;
  const pool = VIDEO_MODEL_POOLS[mappedQualityId] || VIDEO_MODEL_POOLS["smart-video"];
  
  const totalWeight = pool.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const model of pool) {
    random -= model.weight;
    if (random <= 0) return model;
  }
  
  return pool[0]; // Fallback
}

interface VideoRequest {
  prompt: string;
  avatarUrl?: string;
  duration?: number;
  size?: string;
  quality?: "720p" | "1080p" | "4k";
  orientation?: "portrait" | "landscape";
  format?: "reel" | "landscape" | "story";
  startingFrameUrl?: string;
  model?: string;
  videoMode?: "standard" | "clipmotion";
}

// ClipMotion prompt modifiers for social-optimized videos
const CLIPMOTION_PREFIX = `[CLIPMOTION - Social Media Optimized Video]
- Fast-paced editing with 1-2 second scene cuts. Dynamic rhythm. Quick transitions.
- Frequent zoom effects, subtle pan movements, smooth parallax. Camera always moving.
- High energy opening hook in first 2 seconds. Immediate visual impact.
- Animated text overlays. Kinetic typography. Punchlines emphasized with motion.
- Modern social media aesthetic. TikTok/Reels style. Trendy and viral potential.
- High energy throughout. Never static. Constant visual interest.

CONTENT TO VISUALIZE:
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
    if (!COMETAPI_API_KEY) {
      throw new Error("COMETAPI_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    // Create Supabase admin client for generation tracking
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    if (action === "create") {
      // ============================================================
      // SUBSCRIPTION VERIFICATION
      // ============================================================
      const authHeader = req.headers.get("Authorization");
      const accessCheck = await verifyVideoAccess(authHeader);
      
      if (!accessCheck.valid) {
        console.log("[GENERATE-VIDEO] Access denied:", accessCheck.error);
        return new Response(
          JSON.stringify({
            success: false,
            error: accessCheck.error,
            requires_upgrade: true,
            upgrade_plan: "pro",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log("[GENERATE-VIDEO] Subscription verified, proceeding with generation");

      const {
        prompt, 
        avatarUrl, 
        duration: requestedDuration = 5, 
        size: legacySize,
        quality = "1080p",
        orientation: requestedOrientation = "portrait",
        format,
        startingFrameUrl,
        model: requestedModel = "smart-video",
        videoMode = "standard",
        projectId,
        campaignId,
      }: VideoRequest & { projectId?: string; campaignId?: string } = await req.json();

      if (!prompt) {
        throw new Error("Prompt is required");
      }

      // ============================================================
      // STEP 1: CREATE GENERATION HISTORY BEFORE API CALL
      // This ensures we always have a trace, even if generation fails
      // ============================================================
      const { data: generation, error: genError } = await supabaseAdmin
        .from("generations")
        .insert({
          user_id: accessCheck.userId,
          project_id: projectId || null,
          campaign_id: campaignId || null,
          type: "video",
          video_mode: videoMode,
          status: "pending",
          progress: 5,
          step: "initializing",
          prompt: prompt,
          duration: requestedDuration,
          model: requestedModel,
          quality: quality,
          format: format || (requestedOrientation === "portrait" ? "reel" : "landscape"),
          estimated_cost: requestedModel === "cinema-video" ? 2.40 : requestedModel === "high-video" ? 1.20 : 0.40,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (genError) {
        console.error("[GENERATE-VIDEO] Failed to create generation record:", genError);
        throw new Error("Failed to initialize generation tracking");
      }

      console.log(`[GENERATE-VIDEO] Created generation record: ${generation.id}`);

      // Determine orientation from format
      let orientation = requestedOrientation;
      if (format) {
        orientation = format === "landscape" ? "landscape" : "portrait";
      }

      // ============================================================
      // WEIGHTED RANDOM MODEL SELECTION
      // ============================================================
      
      // Fallback: ensure requestedModel exists in pool
      const safeRequestedModel = VIDEO_MODEL_POOLS[requestedModel] ? requestedModel : "smart-video";
      let selectedModel = selectModelFromPool(safeRequestedModel);
      let apiModel = selectedModel.apiModel;

      console.log(`[MODEL-POOL] Quality: ${requestedModel} -> Safe: ${safeRequestedModel} -> Selected: ${selectedModel.id} (${apiModel})`);

      // ============================================================
      // CLIPMOTION COST PROTECTION: Force cheap model for ClipMotion
      // ClipMotion = high volume social content, never use expensive Sora
      // ============================================================
      if (videoMode === "clipmotion" && apiModel.startsWith("sora")) {
        console.log("[COST-PROTECTION] ClipMotion forced to cheap model (was:", apiModel, ")");
        selectedModel = VIDEO_MODEL_POOLS["smart-video"][0]; // Force veo-2
        apiModel = selectedModel.apiModel;
      }

      // ============================================================
      // COST LOGGING (for analytics & abuse detection)
      // ============================================================
      const estimatedCost = 
        apiModel === "sora-2" ? "€€€ (~$1.20)" :
        apiModel === "veo-2" ? "€ (~$0.40)" :
        apiModel === "kling-video" ? "€ (~$0.35)" :
        apiModel === "minimax-video-01" ? "€ (~$0.30)" : "?";
      
      console.log(`[COST] Model: ${apiModel} | Estimated: ${estimatedCost} | Mode: ${videoMode}`);

      // Validate duration for this model
      const validDurations = selectedModel.durations;
      const duration = validDurations.includes(requestedDuration) 
        ? requestedDuration 
        : validDurations.reduce((prev, curr) => 
            Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev
          );

      // Determine size
      const size = legacySize || selectedModel.maxSize[orientation];

      // Build enhanced prompt
      let fullPrompt = prompt;
      
      // Apply ClipMotion prefix if mode is enabled
      if (videoMode === "clipmotion") {
        fullPrompt = CLIPMOTION_PREFIX + prompt;
        console.log("ClipMotion mode enabled - applying social-optimized prompt");
      }
      
      if (avatarUrl) {
        fullPrompt = `Cinematic ultra-realistic promotional video: ${fullPrompt}. Style: professional, high quality, cinematic lighting, vibrant colors.`;
      }
      
      // Add quality instructions
      if (quality === "4k") {
        fullPrompt = `${fullPrompt} Ultra high resolution 4K, maximum detail, professional cinema grade quality.`;
      } else if (quality === "1080p") {
        fullPrompt = `${fullPrompt} Full HD 1080p, sharp details, professional quality.`;
      }

      console.log("=== Video Generation Request ===");
      console.log("Generation ID:", generation.id);
      console.log("Video Mode:", videoMode);
      console.log("Quality Level:", requestedModel);
      console.log("Selected Model:", selectedModel.id);
      console.log("API Model:", apiModel);
      console.log("Resolution:", size);
      console.log("Duration:", duration, "s (requested:", requestedDuration, "s)");
      if (startingFrameUrl) {
        console.log("Starting frame URL provided for video continuation");
      }

      // ============================================================
      // STEP 2: UPDATE PROGRESS - Sending to model
      // ============================================================
      await supabaseAdmin.from("generations").update({
        progress: 20,
        step: "video",
        model: apiModel, // Update with actual model selected
        status: "generating",
      }).eq("id", generation.id);

      // FIX 5: Clean FormData for CometAPI - conditional image_url
      const formData = new FormData();
      formData.append("model", apiModel);
      formData.append("prompt", fullPrompt);
      formData.append("seconds", String(duration));
      formData.append("size", size);

      if (startingFrameUrl && startingFrameUrl.startsWith("http")) {
        formData.append("image_url", startingFrameUrl);
        console.log("Added starting frame for image-to-video");
      }

      let result;
      try {
        const response = await fetch("https://api.cometapi.com/v1/videos", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${COMETAPI_API_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("CometAPI error:", errorText);
          
          // Update generation as failed
          await supabaseAdmin.from("generations").update({
            status: "failed",
            progress: 0,
            error_message: `CometAPI error: ${response.status} - ${errorText}`,
            completed_at: new Date().toISOString(),
          }).eq("id", generation.id);
          
          throw new Error(`CometAPI error: ${response.status} - ${errorText}`);
        }

        result = await response.json();
      } catch (apiError) {
        // Update generation as failed if not already
        await supabaseAdmin.from("generations").update({
          status: "failed",
          progress: 0,
          error_message: apiError instanceof Error ? apiError.message : "API call failed",
          completed_at: new Date().toISOString(),
        }).eq("id", generation.id);
        
        throw apiError;
      }

      console.log("Video task created:", result.id, "| Model:", selectedModel.id, "(", apiModel, ") | Duration:", duration, "s");

      // ============================================================
      // STEP 3: UPDATE PROGRESS - Task submitted, video generating
      // ============================================================
      await supabaseAdmin.from("generations").update({
        progress: 40,
        step: "video",
        external_task_id: result.id,
        status: "generating",
      }).eq("id", generation.id);

      return new Response(
        JSON.stringify({
          success: true,
          generationId: generation.id, // Internal tracking ID
          taskId: result.id, // CometAPI task ID
          status: "generating",
          progress: 40,
          step: "video",
          model: apiModel,
          selectedModel: selectedModel.id,
          requestedModel,
          qualityLevel: requestedModel,
          size,
          duration,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } else if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      const generationId = url.searchParams.get("generationId");
      
      if (!taskId) {
        throw new Error("taskId is required for status check");
      }

      console.log("Checking status for task:", taskId, "generationId:", generationId);

      const response = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${COMETAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Status check error:", errorText);
        
        // Update generation as failed if we have an ID
        if (generationId) {
          await supabaseAdmin.from("generations").update({
            status: "failed",
            progress: 0,
            error_message: `Status check failed: ${response.status}`,
            completed_at: new Date().toISOString(),
          }).eq("id", generationId);
        }
        
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Full API response:", JSON.stringify(result));

      // Handle nested data structure
      const videoData = result.data || result;
      const innerData = videoData.data || {};

      // Normalize status
      const rawStatus = videoData.status || innerData.status || videoData.state || "in_progress";
      const taskStatus = rawStatus.toLowerCase();

      // Parse progress
      const rawProgress = innerData.progress || videoData.progress || videoData.percent || 0;
      const taskProgress = typeof rawProgress === "string" 
        ? parseInt(rawProgress.replace('%', '')) 
        : rawProgress;

      // Extract timestamps
      const submitTime = videoData.submit_time || innerData.submit_time || videoData.created_at;
      const finishTime = videoData.finish_time || innerData.finish_time || videoData.completed_at;

      // FIX 6: Safe status parsing - only assign URL on completed
      let videoUrl: string | undefined = undefined;
      const isCompleted = taskStatus === "success" || taskStatus === "succeeded" || taskStatus === "completed" || taskStatus === "done";
      
      if (isCompleted) {
        // Priority order for video URL extraction
        videoUrl = 
          innerData.video_url ||
          innerData.output_video ||
          innerData.download_url ||
          videoData.video_url || 
          videoData.output_video ||
          videoData.download_url ||
          videoData.url ||
          innerData.url ||
          undefined;
        
        // If still no URL, try to fetch the video content endpoint
        if (!videoUrl) {
          console.log("No video URL in status response, trying content endpoint...");
          try {
            const contentResponse = await fetch(`https://api.cometapi.com/v1/videos/${taskId}/content`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${COMETAPI_API_KEY}`,
              },
            });
            
            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              videoUrl = contentData.url || contentData.video_url || contentData.data?.url || contentData.data?.video_url;
              console.log("Video URL from content endpoint:", videoUrl ? "Found" : "Not found");
            }
          } catch (contentError) {
            console.log("Content endpoint fallback failed:", contentError);
          }
        }
        
        if (videoUrl) {
          console.log("Video URL found:", videoUrl.slice(0, 80) + "...");
        } else {
          console.log("WARNING: Task completed but no video URL found. Full response:", JSON.stringify(result));
        }
      }

      // Map status to frontend-friendly format
      let frontendStatus = "processing";
      if (taskStatus === "success" || taskStatus === "succeeded" || taskStatus === "completed" || taskStatus === "done") {
        frontendStatus = "completed";
      } else if (taskStatus === "failed" || taskStatus === "error") {
        frontendStatus = "failed";
      } else if (taskStatus === "pending" || taskStatus === "queued") {
        frontendStatus = "queued";
      }

      // ============================================================
      // SYNC GENERATION HISTORY WITH COMETAPI STATUS
      // This ensures our DB is always up-to-date
      // ============================================================
      if (generationId) {
        const mappedProgress = 
          frontendStatus === "completed" ? 100 :
          frontendStatus === "failed" ? 0 :
          Math.min(40 + Math.floor(taskProgress * 0.55), 95); // Map 0-100 to 40-95

        await supabaseAdmin.from("generations").update({
          status: frontendStatus === "processing" ? "generating" : frontendStatus,
          progress: mappedProgress,
          step: frontendStatus === "completed" ? "finalizing" : "video",
          media_url: videoUrl || null,
          completed_at: (frontendStatus === "completed" || frontendStatus === "failed") 
            ? new Date().toISOString() 
            : null,
          error_message: frontendStatus === "failed" 
            ? (videoData.fail_reason || innerData.fail_reason || "Generation failed") 
            : null,
        }).eq("id", generationId);

        console.log(`[SYNC] Updated generation ${generationId}: status=${frontendStatus}, progress=${mappedProgress}%`);
      } else if (taskId) {
        // Try to find by external_task_id if generationId not provided
        const { data: existingGen } = await supabaseAdmin
          .from("generations")
          .select("id")
          .eq("external_task_id", taskId)
          .maybeSingle();

        if (existingGen) {
          const mappedProgress = 
            frontendStatus === "completed" ? 100 :
            frontendStatus === "failed" ? 0 :
            Math.min(40 + Math.floor(taskProgress * 0.55), 95);

          await supabaseAdmin.from("generations").update({
            status: frontendStatus === "processing" ? "generating" : frontendStatus,
            progress: mappedProgress,
            step: frontendStatus === "completed" ? "finalizing" : "video",
            media_url: videoUrl || null,
            completed_at: (frontendStatus === "completed" || frontendStatus === "failed") 
              ? new Date().toISOString() 
              : null,
            error_message: frontendStatus === "failed" 
              ? (videoData.fail_reason || innerData.fail_reason || "Generation failed") 
              : null,
          }).eq("id", existingGen.id);

          console.log(`[SYNC] Updated generation ${existingGen.id} (found by taskId): status=${frontendStatus}`);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          generationId,
          status: frontendStatus,
          rawStatus: taskStatus,
          progress: taskProgress,
          videoUrl,
          submitTime,
          finishTime,
          failReason: taskStatus === "failed" ? (videoData.fail_reason || innerData.fail_reason) : undefined,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error("Video generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
