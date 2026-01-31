import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid plans for AutoPost access
const AUTOPOST_VALID_PLANS = ["pro", "business"];
const AUTOPOST_VALID_PRODUCTS = [
  "prod_TsR9BN6zNpq8Rp", // Pro
  "prod_TsR93v9Am93N8O", // Business
];

// ============================================================
// SUBSCRIPTION VERIFICATION FOR AUTOPOST
// ============================================================
async function verifyAutoPostAccess(
  userId: string,
  userEmail: string | null,
  supabase: any
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check for lifetime grant first
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id, stripe_customer_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (subscription?.stripe_customer_id === "lifetime_grant") {
      console.log(`[AUTOPOST-ACCESS] Lifetime grant for ${userId}`);
      return { valid: true };
    }

    // Check local subscription record
    if (subscription && AUTOPOST_VALID_PLANS.includes(subscription.plan_id) && subscription.status === "active") {
      console.log(`[AUTOPOST-ACCESS] Local subscription valid: ${subscription.plan_id}`);
      return { valid: true };
    }

    // Fallback: Verify with Stripe if email available
    if (userEmail) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
          const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
          
          if (customers.data.length > 0) {
            const subscriptions = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: "active",
              limit: 1,
            });

            if (subscriptions.data.length > 0) {
              const sub = subscriptions.data[0];
              const hasValidProduct = sub.items.data.some((item: any) => {
                const productId = typeof item.price.product === "string" 
                  ? item.price.product 
                  : item.price.product.id;
                return AUTOPOST_VALID_PRODUCTS.includes(productId);
              });

              if (hasValidProduct) {
                console.log(`[AUTOPOST-ACCESS] Stripe verified for ${userEmail}`);
                return { valid: true };
              }
            }
          }
        } catch (stripeError) {
          console.error("[AUTOPOST-ACCESS] Stripe check failed:", stripeError);
        }
      }
    }

    return { valid: false, error: "AutoPost requires Pro or Business plan" };
  } catch (error) {
    console.error("[AUTOPOST-ACCESS] Error:", error);
    return { valid: false, error: "Subscription check failed" };
  }
}

// ============================================================
// AUTOPOST QUALITY CONFIGURATION
// Uses quality tiers: standard (Fast), pro (Medium), cinema (High)
// ============================================================

const IMAGE_QUALITY_CONFIG = {
  standard: { model: "google/gemini-2.5-flash-image", provider: "lovable", cost: 1 },
  pro: { model: "google/gemini-3-pro-image-preview", provider: "lovable", cost: 3 },
  cinema: { model: "google/gemini-3-pro-image-preview", provider: "lovable", cost: 5 },
};

const VIDEO_QUALITY_CONFIG = {
  standard: { duration: 5, resolution: "720x1280", cost: 5 },
  pro: { duration: 8, resolution: "1080x1920", cost: 10 },
  cinema: { duration: 10, resolution: "1080x1920", cost: 20 },
};

interface Campaign {
  id: string;
  name: string;
  status: string;
  posting_hour: number | null;
  user_id: string;
  project_id: string;
  total_published: number | null;
  total_generated: number | null;
  image_quality?: string | null;
  video_quality?: string | null;
  projects?: { name: string; detected_language: string | null; description: string | null; logo_url: string | null; url: string | null };
}

interface ScheduledPost {
  id: string;
  user_id: string;
  content_type: string;
  media_url: string | null;
  ai_prompt: string | null;
  text_content: string | null;
  platforms: string[] | null;
  campaign_id: string | null;
  project_id: string;
}

// ============================================================
// IMAGE GENERATION (via Lovable AI - Quality Tiers)
// ============================================================

async function generateImage(
  prompt: string, 
  supabase: any, 
  brandName?: string, 
  language?: string,
  quality: string = "pro"
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("[generateImage] LOVABLE_API_KEY not configured");
    return null;
  }

  const config = IMAGE_QUALITY_CONFIG[quality as keyof typeof IMAGE_QUALITY_CONFIG] || IMAGE_QUALITY_CONFIG.pro;

  try {
    // Add language constraint for any text in the image
    const langPrefix = language && language !== "en" 
      ? `[LANGUAGE: All text in this image MUST be in ${language === "fr" ? "French" : language === "es" ? "Spanish" : language === "de" ? "German" : language === "it" ? "Italian" : language === "pt" ? "Portuguese" : "English"}. NO English text allowed.] `
      : "";
    
    const enhancedPrompt = brandName 
      ? `${langPrefix}${prompt} for ${brandName} brand. Ultra high resolution, professional quality, 1:1 square format.`
      : `${langPrefix}${prompt}. Ultra high resolution, professional quality, 1:1 square format.`;

    console.log(`[generateImage] Using ${quality} quality (${config.model}) via Lovable AI`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generateImage] Lovable AI error:", response.status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("[generateImage] No image in response");
      return null;
    }

    // Upload base64 to storage - CRITICAL: Meta APIs don't accept base64/data URIs
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[generateImage] Upload error:", uploadError);
      // CRITICAL: Do NOT return base64 - Meta APIs require public URLs
      // Try a second upload with different filename
      const retryFileName = `images/retry-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: retryError } = await supabase.storage
        .from("media")
        .upload(retryFileName, imageBytes, { contentType: "image/png", upsert: true });
      
      if (retryError) {
        console.error("[generateImage] Retry upload also failed:", retryError);
        return null; // Return null instead of base64 - will prevent publishing with invalid URL
      }
      
      const { data: retryUrlData } = supabase.storage.from("media").getPublicUrl(retryFileName);
      console.log(`[generateImage] ✅ ${quality} image uploaded (retry)`);
      return retryUrlData.publicUrl;
    }

    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
    console.log(`[generateImage] ✅ ${quality} image uploaded`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("[generateImage] Error:", error);
    return null;
  }
}

// ============================================================
// VIDEO GENERATION (via Nano Banana API)
// ============================================================

async function generateVideo(
  prompt: string, 
  supabase: any,
  quality: string = "pro"
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("[generateVideo] LOVABLE_API_KEY not configured");
    return null;
  }

  const config = VIDEO_QUALITY_CONFIG[quality as keyof typeof VIDEO_QUALITY_CONFIG] || VIDEO_QUALITY_CONFIG.pro;

  try {
    console.log(`[generateVideo] Using ${quality} quality (${config.duration}s, ${config.resolution}) via Nano Banana`);
    
    // Parse resolution
    const [width, height] = config.resolution.split("x").map(Number);
    const aspectRatio = width > height ? "16:9" : "9:16";

    const response = await fetch("https://nanobananavideo.com/api/v1/text-to-video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${prompt}. Vertical 9:16 portrait format, perfect for Instagram Reels and TikTok, eye-catching motion, professional quality.`,
        duration: config.duration,
        aspect_ratio: aspectRatio,
        resolution: height >= 1080 ? "1080p" : "720p",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generateVideo] Nano Banana error:", response.status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const taskId = data.task_id || data.id;
    
    if (!taskId) {
      console.error("[generateVideo] No task ID in response");
      return null;
    }

    console.log("[generateVideo] Task created:", taskId);

    // Poll for completion (max 5 minutes)
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

      const statusResponse = await fetch(`https://nanobananavideo.com/api/v1/task/${taskId}`, {
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = (statusData.status || "").toLowerCase();

      console.log(`[generateVideo] Poll ${i + 1}/${maxAttempts}: status=${status}`);

      if (status === "completed" || status === "success" || status === "done") {
        const videoUrl = statusData.video_url || statusData.output_url || statusData.url;

        if (videoUrl) {
          console.log("[generateVideo] Video ready, downloading...");
          
          // Download and upload to Supabase storage
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            console.log("[generateVideo] Download failed, using original URL");
            return videoUrl;
          }

          const videoBuffer = await videoResponse.arrayBuffer();
          const videoBytes = new Uint8Array(videoBuffer);
          const videoPath = `videos/video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;

          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });

          if (uploadError) {
            console.error("[generateVideo] Upload error:", uploadError);
            return videoUrl; // Return original URL as fallback
          }

          const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
          console.log(`[generateVideo] ✅ ${quality} video uploaded`);
          return publicUrlData.publicUrl;
        }
      } else if (status === "failed" || status === "error") {
        console.error("[generateVideo] Task failed");
        return null;
      }
    }

    console.log("[generateVideo] Timeout waiting for video");
    return null;
  } catch (error) {
    console.error("[generateVideo] Error:", error);
    return null;
  }
}

// ============================================================
// REEL GENERATION (Uses same video generator with reel-specific prompt)
// ============================================================

async function generateReel(
  prompt: string, 
  supabase: any, 
  brandName?: string, 
  language?: string,
  quality: string = "pro"
): Promise<string | null> {
  // Build enhanced prompt for vertical reel format
  let enhancedPrompt = prompt;
  if (brandName) {
    enhancedPrompt = `${prompt} for ${brandName} brand.`;
  }
  
  // Add language constraint
  const langMap: Record<string, string> = {
    fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese"
  };
  const langName = langMap[language || ""] || "English";
  if (language && language !== "en") {
    enhancedPrompt = `[All text MUST be in ${langName}] ${enhancedPrompt}`;
  }
  
  enhancedPrompt += " Vertical 9:16 portrait format, perfect for Instagram Reels and TikTok, eye-catching motion, professional quality, vibrant colors.";
  
  return generateVideo(enhancedPrompt, supabase, quality);
}

// ============================================================
// PUBLISH TO FACEBOOK
// ============================================================

async function publishToFacebook(
  post: ScheduledPost,
  metaConnection: any
): Promise<{ success: boolean; error?: string }> {
  if (!metaConnection.page_access_token || !metaConnection.page_id) {
    return { success: false, error: "No page access" };
  }

  try {
    let fbUrl = `https://graph.facebook.com/v18.0/${metaConnection.page_id}/`;
    let fbBody: any = {};

    if (post.media_url) {
      if (post.content_type === "video") {
        fbUrl += "videos";
        fbBody = {
          file_url: post.media_url,
          description: post.text_content || "",
          access_token: metaConnection.page_access_token,
        };
      } else {
        fbUrl += "photos";
        fbBody = {
          url: post.media_url,
          caption: post.text_content || "",
          access_token: metaConnection.page_access_token,
        };
      }
    } else {
      fbUrl += "feed";
      fbBody = {
        message: post.text_content || "",
        access_token: metaConnection.page_access_token,
      };
    }

    const response = await fetch(fbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fbBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: errorData };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================
// PUBLISH TO INSTAGRAM
// ============================================================

async function publishToInstagram(
  post: ScheduledPost,
  metaConnection: any
): Promise<{ success: boolean; error?: string }> {
  // Instagram REQUIRES media - no text-only posts allowed
  if (!metaConnection.instagram_id) {
    console.log("[Instagram] No instagram_id in connection");
    return { success: false, error: "No Instagram Business account connected" };
  }

  if (!post.media_url) {
    console.log("[Instagram] No media_url - Instagram requires media");
    return { success: false, error: "Instagram requires media (image or video)" };
  }

  try {
    const accessToken = metaConnection.page_access_token || metaConnection.access_token;
    if (!accessToken) {
      return { success: false, error: "No access token available" };
    }

    // Check if this is a video file (mp4, mov, etc.)
    const isVideoFile = post.media_url.match(/\.(mp4|mov|avi|webm)$/i);
    
    // Determine if we should publish as a Reel
    // - True video files (actual videos)
    // - Image as Reel posts now have video files too (converted from image)
    const isVideo = post.content_type === "video" && isVideoFile;
    
    console.log(`[Instagram] Publishing ${isVideo ? "video/reel" : "image"} to ${metaConnection.instagram_id}`);

    // Step 1: Create media container
    const containerBody: any = {
      caption: post.text_content || "",
      access_token: accessToken,
    };

    if (isVideo) {
      containerBody.media_type = "REELS";
      containerBody.video_url = post.media_url;
      containerBody.share_to_feed = true;
    } else {
      // For images
      containerBody.image_url = post.media_url;
    }

    console.log("[Instagram] Creating media container...");
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaConnection.instagram_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      }
    );

    const containerText = await containerResponse.text();
    console.log("[Instagram] Container response:", containerResponse.status, containerText.slice(0, 200));

    if (!containerResponse.ok) {
      // Parse error for better messaging
      try {
        const errorJson = JSON.parse(containerText);
        const errorMsg = errorJson.error?.message || containerText;
        return { success: false, error: `Container failed: ${errorMsg}` };
      } catch {
        return { success: false, error: `Container failed (${containerResponse.status}): ${containerText.slice(0, 100)}` };
      }
    }

    const containerData = JSON.parse(containerText);
    if (!containerData.id) {
      return { success: false, error: "No container ID returned" };
    }

    // Wait for container to be ready (required for both images and videos)
    // Instagram error 9007 occurs when trying to publish before container is ready
    console.log("[Instagram] Waiting for media container to be ready...");
    
    // Increased timeouts for more reliable publishing
    const maxWait = isVideo ? 60 : 20; // Increased from 10 to 20 for images
    const waitInterval = isVideo ? 5000 : 2000; // 5s for videos, 2s for images
    
    // Add initial wait before first status check (Instagram needs time to start processing)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let containerReady = false;
    for (let i = 0; i < maxWait; i++) {
      await new Promise(resolve => setTimeout(resolve, waitInterval));
      
      const statusRes = await fetch(
        `https://graph.facebook.com/v18.0/${containerData.id}?fields=status_code&access_token=${accessToken}`
      );
      const statusText = await statusRes.text();
      
      try {
        const statusData = JSON.parse(statusText);
        const statusCode = statusData.status_code || "UNKNOWN";
        
        console.log(`[Instagram] Processing status (${i + 1}/${maxWait}): ${statusCode}`);
        
        if (statusCode === "FINISHED") {
          console.log("[Instagram] Container ready!");
          containerReady = true;
          break;
        }
        if (statusCode === "ERROR") {
          return { success: false, error: "Media processing failed at Instagram" };
        }
        // For images, IN_PROGRESS is also acceptable after several retries
        if (!isVideo && statusCode === "IN_PROGRESS" && i >= 8) {
          console.log("[Instagram] Image still processing after 8 attempts, attempting publish...");
          containerReady = true; // Try anyway
          break;
        }
      } catch (parseError) {
        console.log(`[Instagram] Status check parse error, continuing...`);
      }
    }
    
    // If container never finished, try publishing anyway as a fallback
    // Instagram sometimes has delays in reporting FINISHED status
    if (!containerReady) {
      console.log("[Instagram] Container timeout - attempting publish anyway (fallback)...");
    }

    // Step 2: Publish the container
    console.log("[Instagram] Publishing container...");
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaConnection.instagram_id}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    );

    const publishText = await publishResponse.text();
    console.log("[Instagram] Publish response:", publishResponse.status, publishText.slice(0, 200));

    if (!publishResponse.ok) {
      try {
        const errorJson = JSON.parse(publishText);
        const errorMsg = errorJson.error?.message || publishText;
        return { success: false, error: `Publish failed: ${errorMsg}` };
      } catch {
        return { success: false, error: `Publish failed (${publishResponse.status}): ${publishText.slice(0, 100)}` };
      }
    }

    console.log("[Instagram] ✅ Published successfully!");
    return { success: true };
  } catch (error) {
    console.error("[Instagram] Exception:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// MAIN CRON HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional params
    let campaignId: string | null = null;
    let forceRun = false;
    
    try {
      const body = await req.json();
      campaignId = body.campaignId || null;
      forceRun = body.forceRun === true;
    } catch {
      // No body or invalid JSON - that's fine for cron calls
    }

    console.log(`[cron] Starting AutoPost processing ${forceRun ? "(FORCED)" : "(Quality Tiers)"}...`);
    if (campaignId) {
      console.log(`[cron] Targeting campaign: ${campaignId}`);
    }

    const now = new Date();
    let totalGenerated = 0;
    let totalPublished = 0;

    // Build query for due posts
    let postsQuery = supabase
      .from("scheduled_posts")
      .select("*, projects(name, detected_language, description, logo_url, url)")
      .in("status", ["scheduled", "draft"])
      .order("scheduled_for", { ascending: true })
      .limit(20);

    // If forceRun with campaignId, get ONLY TODAY's posts for that campaign
    if (forceRun && campaignId) {
      postsQuery = postsQuery.eq("campaign_id", campaignId);
      
      // Get today's date boundaries in UTC
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setUTCHours(23, 59, 59, 999);
      
      // Only process posts scheduled for today (not the whole month)
      postsQuery = postsQuery
        .gte("scheduled_for", startOfToday.toISOString())
        .lte("scheduled_for", endOfToday.toISOString());
      
      console.log(`[cron] ForceRun: filtering posts between ${startOfToday.toISOString()} and ${endOfToday.toISOString()}`);
    } else {
      // Normal cron: only get posts that are due
      postsQuery = postsQuery.lte("scheduled_for", now.toISOString());
    }

    const { data: duePosts, error: postsError } = await postsQuery as { 
      data: (ScheduledPost & { projects: any })[] | null; 
      error: any 
    };

    if (postsError) throw postsError;

    if (!duePosts?.length) {
      console.log("[cron] No posts due for processing");
      return new Response(JSON.stringify({ message: "No posts due", generated: 0, published: 0, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[cron] Found ${duePosts.length} posts due for processing`);

    for (const post of duePosts) {
      const brandName = post.projects?.name;
      const projectLanguage = post.projects?.detected_language || "en";
      console.log(`[cron] Processing post ${post.id} (${post.content_type}) - language: ${projectLanguage}`);

      // ============================================================
      // SUBSCRIPTION CHECK: Only Pro/Business can use AutoPost
      // ============================================================
      const { data: userData } = await supabase.auth.admin.getUserById(post.user_id);
      const userEmail = userData?.user?.email || null;
      
      const accessCheck = await verifyAutoPostAccess(post.user_id, userEmail, supabase);
      
      if (!accessCheck.valid) {
        console.log(`[cron] User ${post.user_id} denied: ${accessCheck.error}`);
        await supabase.from("scheduled_posts").update({
          error_message: accessCheck.error || "AutoPost requires Pro or Business plan",
          status: "draft", // Reset to draft so user sees it
        }).eq("id", post.id);
        continue;
      }

      // Fetch campaign quality settings if linked
      let imageQuality = "pro"; // Default to Medium
      let videoQuality = "pro"; // Default to Medium
      
      if (post.campaign_id) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("image_quality, video_quality")
          .eq("id", post.campaign_id)
          .single();
        
        if (campaign) {
          imageQuality = campaign.image_quality || "pro";
          videoQuality = campaign.video_quality || "pro";
        }
      }

      // STEP 1: Generate media if missing (using quality tiers)
      if (!post.media_url && post.ai_prompt) {
        // Check if this is an "Image as Reel" post:
        // - content_type is "video" 
        // - BUT the ai_prompt doesn't contain video markers (timestamps, voiceover)
        const isImageAsReel = post.content_type === "video" && 
          !post.ai_prompt.includes("[0-") && 
          !post.ai_prompt.toLowerCase().includes("voiceover") &&
          !post.ai_prompt.toLowerCase().includes("scene ");
        
        if (isImageAsReel) {
          // Reel: Use Nano Banana Video for real MP4
          console.log(`[cron] Generating Reel (${videoQuality}) for post ${post.id} in ${projectLanguage}`);
          
          const videoUrl = await generateReel(post.ai_prompt, supabase, brandName, projectLanguage, videoQuality);
          if (videoUrl) {
            await supabase.from("scheduled_posts").update({ 
              media_url: videoUrl,
              thumbnail_url: videoUrl,
            }).eq("id", post.id);
            post.media_url = videoUrl;
            totalGenerated++;
            console.log(`[cron] Reel MP4 generated: ${videoUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Reel generation failed for post ${post.id}`);
          }
        } else if (post.content_type === "image") {
          console.log(`[cron] Generating Image (${imageQuality}) for post ${post.id} in ${projectLanguage}`);
          const imageUrl = await generateImage(post.ai_prompt, supabase, brandName, projectLanguage, imageQuality);
          if (imageUrl) {
            await supabase.from("scheduled_posts").update({ media_url: imageUrl }).eq("id", post.id);
            post.media_url = imageUrl;
            totalGenerated++;
            console.log(`[cron] Image generated: ${imageUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Image generation failed for post ${post.id}`);
          }
        } else if (post.content_type === "video") {
          console.log(`[cron] Generating Video (${videoQuality}) for post ${post.id}`);
          const videoUrl = await generateVideo(post.ai_prompt, supabase, videoQuality);
          if (videoUrl) {
            await supabase.from("scheduled_posts").update({ media_url: videoUrl }).eq("id", post.id);
            post.media_url = videoUrl;
            totalGenerated++;
            console.log(`[cron] Video generated: ${videoUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Video generation failed for post ${post.id}`);
          }
        }
      }

      // STEP 2: Publish to platforms
      const { data: metaConnection } = await supabase
        .from("meta_connections")
        .select("*")
        .eq("user_id", post.user_id)
        .single();

      if (!metaConnection) {
        console.log(`[cron] No Meta connection for user ${post.user_id}`);
        await supabase.from("scheduled_posts").update({
          error_message: "No Meta connection - manual publish required",
        }).eq("id", post.id);
        continue;
      }

      // Check token expiry
      if (new Date(metaConnection.expires_at) < now) {
        console.log(`[cron] Meta token expired for user ${post.user_id}`);
        await supabase.from("scheduled_posts").update({
          error_message: "Meta token expired - reconnect required",
        }).eq("id", post.id);
        continue;
      }

      const platforms = post.platforms || ["instagram", "facebook"];
      const errors: string[] = [];
      const publishResults: { platform: string; success: boolean; postId?: string }[] = [];

      for (const platform of platforms) {
        // ============================================================
        // RATE LIMIT: 1.5s delay between Meta API calls
        // ============================================================
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (platform === "facebook") {
          const result = await publishToFacebook(post, metaConnection);
          publishResults.push({ platform: "facebook", success: result.success });
          if (!result.success) {
            errors.push(`FB: ${result.error}`);
            console.log(`[cron] Facebook publish failed: ${result.error}`);
          } else {
            console.log(`[cron] Published to Facebook successfully`);
          }
        }

        if (platform === "instagram") {
          const result = await publishToInstagram(post, metaConnection);
          publishResults.push({ platform: "instagram", success: result.success });
          if (!result.success) {
            errors.push(`IG: ${result.error}`);
            console.log(`[cron] Instagram publish failed: ${result.error}`);
          } else {
            console.log(`[cron] Published to Instagram successfully`);
          }
        }
      }

      // Update post status
      if (errors.length === 0) {
        await supabase.from("scheduled_posts").update({
          status: "published",
          published_at: now.toISOString(),
          error_message: null,
        }).eq("id", post.id);
        totalPublished++;
        console.log(`[cron] Post ${post.id} published successfully`);
      } else if (errors.length < platforms.length) {
        await supabase.from("scheduled_posts").update({
          status: "published",
          published_at: now.toISOString(),
          error_message: `Partial: ${errors.join(", ")}`,
        }).eq("id", post.id);
        totalPublished++;
        console.log(`[cron] Post ${post.id} partially published`);
      } else {
        await supabase.from("scheduled_posts").update({
          error_message: errors.join(", "),
        }).eq("id", post.id);
        console.log(`[cron] Post ${post.id} publish failed: ${errors.join(", ")}`);
      }

      // Update campaign stats if linked
      if (post.campaign_id) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("total_published, total_generated")
          .eq("id", post.campaign_id)
          .single();

        if (campaign) {
          await supabase.from("campaigns").update({
            total_published: (campaign.total_published || 0) + (errors.length < platforms.length ? 1 : 0),
            total_generated: (campaign.total_generated || 0) + (post.media_url ? 1 : 0),
          }).eq("id", post.campaign_id);
        }
      }
    }

    console.log(`[cron] Done. Generated: ${totalGenerated}, Published: ${totalPublished}`);

    return new Response(
      JSON.stringify({ success: true, processed: duePosts.length, generated: totalGenerated, published: totalPublished }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[cron] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
