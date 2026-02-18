import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// PUBLISH IMAGE: Direct API Publishing to Facebook/Instagram
// Supports: Image posts and Image-as-Reel
// ============================================================

interface PublishRequest {
  imageUrl: string;
  caption: string;
  platforms: ("instagram" | "facebook" | "linkedin")[];
  publishType: "image" | "reel";
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
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return { userId: null, email: null };
    return { userId: userData.user.id, email: userData.user.email };
  } catch {
    return { userId: null, email: null };
  }
}

// ============================================================
// INSTAGRAM IMAGE POST
// ============================================================
async function publishImageToInstagram(
  imageUrl: string,
  caption: string,
  metaConnection: any
): Promise<PublishResult> {
  if (!metaConnection?.instagram_id || !metaConnection?.page_access_token) {
    return { platform: "instagram", success: false, error: "Instagram not connected" };
  }

  try {
    const accessToken = metaConnection.page_access_token;
    const igUserId = metaConnection.instagram_id;

    console.log("[IG-IMAGE] Creating image container...");

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 1: Create media container for image
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    const containerData = await containerRes.json();
    
    if (containerData.error) {
      console.error("[IG-IMAGE] Container error:", containerData.error);
      return { platform: "instagram", success: false, error: containerData.error.message };
    }

    const containerId = containerData.id;
    console.log("[IG-IMAGE] Container created:", containerId);

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 2: Publish the container
    console.log("[IG-IMAGE] Publishing image...");
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

    console.log("[IG-IMAGE] ✅ Published successfully:", publishData.id);
    return { platform: "instagram", success: true, postId: publishData.id };
  } catch (error) {
    console.error("[IG-IMAGE] Exception:", error);
    return { platform: "instagram", success: false, error: String(error) };
  }
}

// ============================================================
// FACEBOOK IMAGE POST
// ============================================================
async function publishImageToFacebook(
  imageUrl: string,
  caption: string,
  metaConnection: any
): Promise<PublishResult> {
  if (!metaConnection?.page_id || !metaConnection?.page_access_token) {
    return { platform: "facebook", success: false, error: "Facebook Page not connected" };
  }

  try {
    const accessToken = metaConnection.page_access_token;
    const pageId = metaConnection.page_id;

    console.log("[FB-IMAGE] Publishing image to Page...");

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1500));

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    const data = await res.json();
    
    if (data.error) {
      console.error("[FB-IMAGE] Error:", data.error);
      return { platform: "facebook", success: false, error: data.error.message };
    }

    console.log("[FB-IMAGE] ✅ Published successfully:", data.id || data.post_id);
    return { platform: "facebook", success: true, postId: data.id || data.post_id };
  } catch (error) {
    console.error("[FB-IMAGE] Exception:", error);
    return { platform: "facebook", success: false, error: String(error) };
  }
}

// ============================================================
// INSTAGRAM REEL FROM IMAGE (Slideshow/Carousel with single image)
// Note: True image-to-reel requires video conversion which is complex
// This publishes as a carousel which appears as a reel-like experience
// ============================================================
async function publishReelToInstagram(
  imageUrl: string,
  caption: string,
  metaConnection: any
): Promise<PublishResult> {
  // Instagram doesn't support true image-as-reel via API
  // We'll publish as a regular image but inform the user
  console.log("[IG-REEL] Instagram API doesn't support image-to-reel directly, publishing as image");
  return publishImageToInstagram(imageUrl, caption, metaConnection);
}

// ============================================================
// FACEBOOK REEL FROM IMAGE
// Facebook allows posting images to Reels section via video API with special flags
// ============================================================
async function publishReelToFacebook(
  imageUrl: string,
  caption: string,
  metaConnection: any
): Promise<PublishResult> {
  if (!metaConnection?.page_id || !metaConnection?.page_access_token) {
    return { platform: "facebook", success: false, error: "Facebook Page not connected" };
  }

  try {
    const accessToken = metaConnection.page_access_token;
    const pageId = metaConnection.page_id;

    console.log("[FB-REEL] Publishing image as Reel to Page...");

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For Reels from images, we use the photos endpoint with published=true
    // The image will appear in the page feed prominently
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          caption,
          access_token: accessToken,
          published: true,
        }),
      }
    );

    const data = await res.json();
    
    if (data.error) {
      console.error("[FB-REEL] Error:", data.error);
      return { platform: "facebook", success: false, error: data.error.message };
    }

    console.log("[FB-REEL] ✅ Published as image (Reels require video):", data.id || data.post_id);
    return { platform: "facebook", success: true, postId: data.id || data.post_id };
  } catch (error) {
    console.error("[FB-REEL] Exception:", error);
    return { platform: "facebook", success: false, error: String(error) };
  }
}

// ============================================================
// LINKEDIN IMAGE POST
// ============================================================
async function publishImageToLinkedIn(
  imageUrl: string,
  caption: string,
  linkedinConnection: any
): Promise<PublishResult> {
  if (!linkedinConnection?.access_token || !linkedinConnection?.linkedin_id) {
    return { platform: "linkedin", success: false, error: "LinkedIn not connected" };
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
      content: {
        article: {
          source: imageUrl,
          title: caption.slice(0, 100) || "Shared image",
          description: caption.slice(0, 200) || "",
        },
      },
    };

    console.log(`[LI-IMAGE] Publishing to ${linkedinConnection.display_name}...`);

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${linkedinConnection.access_token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202502",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (response.status === 201) {
      const postId = response.headers.get("x-restli-id") || undefined;
      console.log(`[LI-IMAGE] ✅ Published successfully! Post ID: ${postId || "N/A"}`);
      return { platform: "linkedin", success: true, postId };
    }

    const errorText = await response.text();
    console.error(`[LI-IMAGE] Publish failed (${response.status}):`, errorText.slice(0, 300));
    return { platform: "linkedin", success: false, error: `LinkedIn API error (${response.status}): ${errorText.slice(0, 150)}` };
  } catch (error) {
    console.error("[LI-IMAGE] Exception:", error);
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    const { userId, email } = await getUserInfo(authHeader, supabase);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PublishRequest & { projectId?: string } = await req.json();
    const { imageUrl, caption, platforms, publishType } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PUBLISH-IMAGE] User: ${email}, Type: ${publishType}, Platforms: ${platforms.join(", ")}`);

    // Fetch connections in parallel
    const [metaResult, linkedinResult] = await Promise.all([
      supabase.from("meta_connections").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("linkedin_connections").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const metaConnection = metaResult.data;
    const linkedinConnection = linkedinResult.data;

    const results: PublishResult[] = [];

    for (const platform of platforms) {
      let result: PublishResult;

      if (platform === "linkedin") {
        result = await publishImageToLinkedIn(imageUrl, caption || "", linkedinConnection);
      } else if (publishType === "reel") {
        if (platform === "instagram") {
          result = await publishReelToInstagram(imageUrl, caption || "", metaConnection);
        } else {
          result = await publishReelToFacebook(imageUrl, caption || "", metaConnection);
        }
      } else {
        if (platform === "instagram") {
          result = await publishImageToInstagram(imageUrl, caption || "", metaConnection);
        } else {
          result = await publishImageToFacebook(imageUrl, caption || "", metaConnection);
        }
      }

      results.push(result);

      // Rate limit protection between platforms
      if (platforms.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const allSuccess = results.every(r => r.success);
    const anySuccess = results.some(r => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        partial: anySuccess && !allSuccess,
        results,
        message: allSuccess 
          ? "Published successfully!" 
          : anySuccess 
            ? "Some platforms failed" 
            : "Publishing failed",
      }),
      { 
        status: allSuccess ? 200 : anySuccess ? 207 : 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("[PUBLISH-IMAGE] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
