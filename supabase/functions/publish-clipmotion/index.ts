import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// PUBLISH CLIPMOTION: 1-Click Multi-Platform Publishing
// Supports: Instagram Reels, Facebook Reels, YouTube Shorts, TikTok
// Uses per-user tokens from database (not static secrets)
// ============================================================

interface PublishRequest {
  videoUrl: string;
  caption: string;
  platforms: ("instagram" | "facebook" | "youtube" | "tiktok")[];
  thumbnailUrl?: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

// Get user ID from JWT
async function getUserId(authHeader: string | null, supabase: any): Promise<string | null> {
  if (!authHeader) return null;
  
  try {
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    
    if (error || !data?.claims?.sub) {
      // Fallback to getUser
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData.user) return null;
      return userData.user.id;
    }
    
    return data.claims.sub as string;
  } catch {
    return null;
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
// YOUTUBE SHORTS
// ============================================================
async function publishToYouTube(
  videoUrl: string,
  caption: string,
  youtubeConnection: any
): Promise<PublishResult> {
  // YouTube requires OAuth tokens stored per-user
  // For now, return a "not connected" message
  // Full implementation would need youtube_connections table with OAuth tokens
  
  if (!youtubeConnection?.access_token) {
    return { 
      platform: "youtube", 
      success: false, 
      error: "YouTube not connected. Please connect your YouTube account in Settings → Integrations." 
    };
  }

  try {
    const accessToken = youtubeConnection.access_token;
    
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
          },
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    if (!initRes.ok) {
      const errorText = await initRes.text();
      console.error("[YT] Init error:", errorText);
      return { platform: "youtube", success: false, error: "YouTube upload initialization failed" };
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

    // Get user ID from auth header
    const authHeader = req.headers.get("authorization");
    const userId = await getUserId(authHeader, supabase);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { videoUrl, caption, platforms, thumbnailUrl }: PublishRequest = await req.json();

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

    // Fetch user's platform connections
    const { data: metaConnection } = await supabase
      .from("meta_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // TODO: Add youtube_connections and tiktok_connections tables
    const youtubeConnection = null; // await supabase.from("youtube_connections")...
    const tiktokConnection = null; // await supabase.from("tiktok_connections")...

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
      publishPromises.push(publishToYouTube(videoUrl, caption, youtubeConnection));
    }
    if (platforms.includes("tiktok")) {
      publishPromises.push(publishToTikTok(videoUrl, caption, tiktokConnection));
    }

    const publishResults = await Promise.all(publishPromises);
    results.push(...publishResults);

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
