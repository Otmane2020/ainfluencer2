import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// PUBLISH CLIPMOTION: 1-Click Multi-Platform Publishing
// Supports: Instagram Reels, Facebook Reels, YouTube Shorts, TikTok
// Uses per-user tokens from database (not static secrets)
// ============================================================

// Valid Stripe products for publishing access (Pro & Business only)
const VALID_PUBLISH_PRODUCTS = [
  "prod_TsR9BN6zNpq8Rp", // Pro
  "prod_TsR93v9Am93N8O", // Business
];

interface PublishRequest {
  videoUrl: string;
  caption: string;
  platforms: ("instagram" | "facebook" | "youtube" | "tiktok" | "linkedin")[];
  thumbnailUrl?: string;
  projectId?: string; // Optional project ID to associate the post with
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

// Get user info from JWT
async function getUserInfo(authHeader: string | null, supabase: any): Promise<{ userId: string | null; email: string | null }> {
  if (!authHeader) return { userId: null, email: null };
  
  try {
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    
    if (error || !data?.claims?.sub) {
      // Fallback to getUser
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData.user) return { userId: null, email: null };
      return { userId: userData.user.id, email: userData.user.email };
    }
    
    return { userId: data.claims.sub as string, email: data.claims.email as string };
  } catch {
    return { userId: null, email: null };
  }
}

// ============================================================
// SUBSCRIPTION VERIFICATION (Pro/Business only)
// ============================================================
async function verifyPublishAccess(email: string | null, userId: string, supabase: any): Promise<{ valid: boolean; error?: string }> {
  if (!email) {
    return { valid: false, error: "User email not available" };
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("[PUBLISH-ACCESS] STRIPE_SECRET_KEY not configured");
    return { valid: false, error: "Payment system not configured" };
  }

  try {
    // Check for lifetime grant first
    const { data: lifetimeGrant } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("stripe_customer_id", "lifetime_grant")
      .maybeSingle();

    if (lifetimeGrant) {
      console.log(`[PUBLISH-ACCESS] LIFETIME GRANT - Full access for ${email}`);
      return { valid: true };
    }

    // Check Stripe subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) {
      return { valid: false, error: "Publishing requires Pro or Business plan. Please upgrade." };
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { valid: false, error: "Publishing requires Pro or Business plan. Please upgrade." };
    }

    // Check if subscription includes valid product
    const subscription = subscriptions.data[0];
    const hasValidProduct = subscription.items.data.some((item: { price: { product: string | { id: string } } }) => {
      const productId = typeof item.price.product === "string" 
        ? item.price.product 
        : item.price.product.id;
      return VALID_PUBLISH_PRODUCTS.includes(productId);
    });

    if (!hasValidProduct) {
      return { valid: false, error: "Publishing requires Pro or Business plan. Please upgrade." };
    }

    console.log(`[PUBLISH-ACCESS] Access granted for ${email}`);
    return { valid: true };
  } catch (error) {
    console.error("[PUBLISH-ACCESS] Error:", error);
    return { valid: false, error: "Subscription verification failed" };
  }
}

// ============================================================
// LOG PUBLISHED POST TO DATABASE
// ============================================================
async function logPublishedPost(
  supabase: any,
  userId: string,
  platform: string,
  postId: string | undefined,
  videoUrl: string,
  caption: string,
  success: boolean,
  errorMessage?: string,
  projectId?: string
): Promise<void> {
  try {
    // Get a valid project_id - use provided one or fetch user's first project
    let validProjectId = projectId;
    
    if (!validProjectId) {
      // Fetch the user's first project as fallback
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      
      validProjectId = project?.id;
    }
    
    if (!validProjectId) {
      console.error("[LOG] No project found for user, cannot log post");
      return;
    }

    // Log to scheduled_posts with published status and external post ID
    const { error } = await supabase.from("scheduled_posts").insert({
      user_id: userId,
      project_id: validProjectId,
      content_type: "video",
      media_url: videoUrl,
      text_content: caption,
      platforms: [platform],
      status: success ? "published" : "failed",
      error_message: errorMessage,
      published_at: success ? new Date().toISOString() : null,
      scheduled_for: new Date().toISOString(),
      external_post_id: postId || null, // Store the platform post ID for direct linking
    });
    
    if (error) {
      console.error("[LOG] Insert error:", error);
      return;
    }
    
    console.log(`[LOG] Post logged: ${platform} - ${success ? "published" : "failed"} - postId: ${postId}`);
  } catch (err) {
    console.error("[LOG] Failed to log post:", err);
  }
}

// ============================================================
// INSTAGRAM REELS
// ============================================================
async function publishToInstagram(
  videoUrl: string,
  caption: string,
  metaConnection: any
): Promise<PublishResult> {
  if (!metaConnection?.instagram_id || !metaConnection?.page_access_token) {
    return { platform: "instagram", success: false, error: "Instagram not connected or no page access" };
  }

  try {
    const accessToken = metaConnection.page_access_token;
    const igUserId = metaConnection.instagram_id;

    console.log("[IG] Creating REELS container...");

    // Rate limit protection: small delay before API calls
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 1: Create media container for Reels
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "REELS",
          video_url: videoUrl,
          caption,
          share_to_feed: true,
          access_token: accessToken,
        }),
      }
    );

    const containerData = await containerRes.json();
    
    if (containerData.error) {
      console.error("[IG] Container error:", containerData.error);
      return { platform: "instagram", success: false, error: containerData.error.message };
    }

    const containerId = containerData.id;
    console.log("[IG] Container created:", containerId);

    // Step 2: Wait for video processing (poll status)
    let status = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (status === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      const statusRes = await fetch(
        `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${accessToken}`
      );
      const statusData = await statusRes.json();
      status = statusData.status_code || "UNKNOWN";
      
      console.log(`[IG] Processing status (${attempts}/${maxAttempts}): ${status}`);
      
      if (status === "ERROR") {
        return { platform: "instagram", success: false, error: "Video processing failed at Instagram" };
      }
    }

    if (status !== "FINISHED") {
      return { platform: "instagram", success: false, error: "Video processing timeout" };
    }

    // Rate limit protection: delay before publish
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 3: Publish the container
    console.log("[IG] Publishing Reel...");
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    const publishData = await publishRes.json();
    
    if (publishData.error) {
      return { platform: "instagram", success: false, error: publishData.error.message };
    }

    console.log("[IG] ✅ Published successfully:", publishData.id);
    return { platform: "instagram", success: true, postId: publishData.id };
  } catch (error) {
    console.error("[IG] Exception:", error);
    return { platform: "instagram", success: false, error: String(error) };
  }
}

// ============================================================
// FACEBOOK REELS
// ============================================================
async function publishToFacebook(
  videoUrl: string,
  caption: string,
  metaConnection: any
): Promise<PublishResult> {
  if (!metaConnection?.page_id || !metaConnection?.page_access_token) {
    return { platform: "facebook", success: false, error: "Facebook Page not connected" };
  }

  try {
    const accessToken = metaConnection.page_access_token;
    const pageId = metaConnection.page_id;

    console.log("[FB] Publishing video to Page...");

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/videos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: videoUrl,
          description: caption,
          access_token: accessToken,
        }),
      }
    );

    const data = await res.json();
    
    if (data.error) {
      console.error("[FB] Error:", data.error);
      return { platform: "facebook", success: false, error: data.error.message };
    }

    console.log("[FB] ✅ Published successfully:", data.id);
    return { platform: "facebook", success: true, postId: data.id };
  } catch (error) {
    console.error("[FB] Exception:", error);
    return { platform: "facebook", success: false, error: String(error) };
  }
}

// ============================================================
// YOUTUBE TOKEN REFRESH
// ============================================================
async function refreshYouTubeToken(
  supabase: any,
  youtubeConnection: any
): Promise<{ accessToken: string | null; error?: string }> {
  const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
  const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET");

  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    return { accessToken: null, error: "YouTube OAuth not configured" };
  }

  if (!youtubeConnection?.refresh_token) {
    return { accessToken: null, error: "No refresh token available. Please reconnect YouTube." };
  }

  try {
    console.log("[YT] Refreshing expired access token...");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        refresh_token: youtubeConnection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || tokens.error) {
      console.error("[YT] Token refresh failed:", tokens);
      return { accessToken: null, error: tokens.error_description || "Token refresh failed" };
    }

    // Update token in database
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

    await supabase
      .from("youtube_connections")
      .update({
        access_token: tokens.access_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", youtubeConnection.user_id);

    console.log("[YT] Token refreshed successfully");
    return { accessToken: tokens.access_token };
  } catch (error) {
    console.error("[YT] Token refresh exception:", error);
    return { accessToken: null, error: String(error) };
  }
}

// ============================================================
// YOUTUBE SHORTS
// ============================================================
async function publishToYouTube(
  videoUrl: string,
  caption: string,
  youtubeConnection: any,
  supabase: any
): Promise<PublishResult> {
  if (!youtubeConnection?.access_token) {
    return { 
      platform: "youtube", 
      success: false, 
      error: "YouTube not connected. Please connect your YouTube account in Settings → Integrations." 
    };
  }

  try {
    let accessToken = youtubeConnection.access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(youtubeConnection.expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

    if (expiresAt.getTime() - bufferMs < now.getTime()) {
      console.log("[YT] Token expired or expiring soon, refreshing...");
      const refreshResult = await refreshYouTubeToken(supabase, youtubeConnection);
      
      if (!refreshResult.accessToken) {
        return { platform: "youtube", success: false, error: refreshResult.error };
      }
      
      accessToken = refreshResult.accessToken;
    }
    
    console.log("[YT] Starting resumable upload for Shorts...");

    // Step 1: Initialize resumable upload
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify({
          snippet: {
            title: caption.slice(0, 90) || "ClipMotion Short",
            description: caption + "\n\n#Shorts #ClipMotion",
            tags: ["Shorts", "ClipMotion"],
            categoryId: "22", // People & Blogs
          },
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    if (!initRes.ok) {
      const errorData = await initRes.json();
      console.error("[YT] Init error:", errorData);
      
      // Check for auth error and suggest reconnect
      if (initRes.status === 401 || initRes.status === 403) {
        return { platform: "youtube", success: false, error: "YouTube authorization expired. Please reconnect your account." };
      }
      
      return { platform: "youtube", success: false, error: errorData?.error?.message || "YouTube upload initialization failed" };
    }

    // Get upload URL from Location header
    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      return { platform: "youtube", success: false, error: "No upload URL returned" };
    }

    // Step 2: Download video and upload to YouTube
    console.log("[YT] Downloading video for upload...");
    const videoRes = await fetch(videoUrl);
    const videoBlob = await videoRes.blob();

    console.log("[YT] Uploading to YouTube Shorts...");
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "video/mp4",
      },
      body: videoBlob,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error("[YT] Upload error:", errorText);
      return { platform: "youtube", success: false, error: "YouTube upload failed" };
    }

    const uploadData = await uploadRes.json();
    console.log("[YT] ✅ Published successfully:", uploadData.id);
    
    return { 
      platform: "youtube", 
      success: true, 
      postId: uploadData.id,
    };
  } catch (error) {
    console.error("[YT] Exception:", error);
    return { platform: "youtube", success: false, error: String(error) };
  }
}

// ============================================================
// TIKTOK
// ============================================================
async function publishToTikTok(
  videoUrl: string,
  caption: string,
  tiktokConnection: any
): Promise<PublishResult> {
  // TikTok requires Creator API OAuth tokens
  // Full implementation would need tiktok_connections table
  
  if (!tiktokConnection?.access_token) {
    return { 
      platform: "tiktok", 
      success: false, 
      error: "TikTok not connected. Please connect your TikTok account in Settings → Integrations." 
    };
  }

  try {
    const accessToken = tiktokConnection.access_token;
    const openId = tiktokConnection.open_id;

    console.log("[TT] Initializing TikTok upload...");

    // Step 1: Initialize upload
    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_info: {
            title: caption.slice(0, 150),
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_stitch: false,
            disable_comment: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl,
          },
        }),
      }
    );

    const initData = await initRes.json();
    
    if (initData.error?.code) {
      console.error("[TT] Error:", initData.error);
      return { platform: "tiktok", success: false, error: initData.error.message || "TikTok API error" };
    }

    console.log("[TT] ✅ Upload initiated:", initData.data?.publish_id);
    return { 
      platform: "tiktok", 
      success: true, 
      postId: initData.data?.publish_id,
    };
  } catch (error) {
    console.error("[TT] Exception:", error);
    return { platform: "tiktok", success: false, error: String(error) };
  }
}

// ============================================================
// LINKEDIN
// ============================================================
async function publishToLinkedIn(
  videoUrl: string,
  caption: string,
  linkedinConnection: any
): Promise<PublishResult> {
  if (!linkedinConnection?.access_token || !linkedinConnection?.linkedin_id) {
    return { platform: "linkedin", success: false, error: "LinkedIn not connected. Please connect in Settings → Integrations." };
  }

  try {
    const author = `urn:li:person:${linkedinConnection.linkedin_id}`;

    const postBody: any = {
      author,
      commentary: caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    // LinkedIn article.source expects a website URL, not a media/storage URL
    // Post as text-only commentary for maximum compatibility
    // The caption already contains the marketing message

    console.log(`[LI] Publishing to ${linkedinConnection.display_name}...`);

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${linkedinConnection.access_token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202602",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (response.status === 201) {
      const postId = response.headers.get("x-restli-id") || undefined;
      console.log(`[LI] ✅ Published successfully! Post ID: ${postId || "N/A"}`);
      return { platform: "linkedin", success: true, postId };
    }

    const errorText = await response.text();
    console.error(`[LI] Publish failed (${response.status}):`, errorText.slice(0, 300));
    return { platform: "linkedin", success: false, error: `LinkedIn API error (${response.status}): ${errorText.slice(0, 150)}` };
  } catch (error) {
    console.error("[LI] Exception:", error);
    return { platform: "linkedin", success: false, error: String(error) };
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user info from auth header
    const authHeader = req.headers.get("authorization");
    const { userId, email } = await getUserInfo(authHeader, supabase);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // SUBSCRIPTION VERIFICATION: Pro/Business only can publish
    // ============================================================
    const accessCheck = await verifyPublishAccess(email, userId, supabase);
    
    if (!accessCheck.valid) {
      console.log("[PUBLISH] Access denied:", accessCheck.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: accessCheck.error,
          requires_upgrade: true,
          upgrade_plan: "pro",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { videoUrl, caption, platforms, thumbnailUrl, projectId }: PublishRequest = await req.json();

    if (!videoUrl || !platforms?.length) {
      return new Response(
        JSON.stringify({ error: "videoUrl and platforms are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== PUBLISH CLIPMOTION ===");
    console.log("User:", userId);
    console.log("Video:", videoUrl.slice(0, 50));
    console.log("Platforms:", platforms.join(", "));

    // Fetch user's platform connections in parallel
    const [metaResult, youtubeResult, tiktokResult, linkedinResult] = await Promise.all([
      supabase.from("meta_connections").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("youtube_connections").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("tiktok_connections").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("linkedin_connections").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const metaConnection = metaResult.data;
    const youtubeConnection = youtubeResult.data;
    const tiktokConnection = tiktokResult.data;
    const linkedinConnection = linkedinResult.data;

    const results: PublishResult[] = [];

    // Publish to each platform in parallel
    const publishPromises: Promise<PublishResult>[] = [];

    if (platforms.includes("instagram")) {
      publishPromises.push(publishToInstagram(videoUrl, caption, metaConnection));
    }
    if (platforms.includes("facebook")) {
      publishPromises.push(publishToFacebook(videoUrl, caption, metaConnection));
    }
    if (platforms.includes("youtube")) {
      publishPromises.push(publishToYouTube(videoUrl, caption, youtubeConnection, supabase));
    }
    if (platforms.includes("tiktok")) {
      publishPromises.push(publishToTikTok(videoUrl, caption, tiktokConnection));
    }
    if (platforms.includes("linkedin")) {
      publishPromises.push(publishToLinkedIn(videoUrl, caption, linkedinConnection));
    }

    const publishResults = await Promise.all(publishPromises);
    results.push(...publishResults);

    // ============================================================
    // LOG ALL PUBLISHED POSTS TO DATABASE
    // ============================================================
    const logPromises = results.map(result => 
      logPublishedPost(
        supabase,
        userId,
        result.platform,
        result.postId,
        videoUrl,
        caption,
        result.success,
        result.error,
        projectId // Pass the projectId from request
      )
    );
    await Promise.all(logPromises);

    // Calculate success metrics
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[PUBLISH] Complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        results,
        summary: {
          total: platforms.length,
          success: successCount,
          failed: failCount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PUBLISH] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
