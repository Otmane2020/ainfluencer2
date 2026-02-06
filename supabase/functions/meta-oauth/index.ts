import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Meta App credentials
const META_APP_ID = Deno.env.get("META_APP_ID");
const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDIRECT_URI = Deno.env.get("META_REDIRECT_URI") || 
  "https://vgffjuvaedmxoxvzovoq.supabase.co/functions/v1/meta-oauth?action=callback";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UserProfile {
  id: string;
  name: string;
  picture?: { data: { url: string } };
}

interface PageData {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  console.log(`[meta-oauth] Action: ${action}, Method: ${req.method}`);

  try {
    switch (action) {
      case "authorize": {
        if (!META_APP_ID) {
          return new Response(
            JSON.stringify({ error: "Meta App ID not configured" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user from auth header
        const authHeader = req.headers.get("Authorization");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        let userId: string | null = null;
        if (authHeader) {
          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id || null;
        }

        const scopes = [
          "public_profile",
          "pages_show_list",
          "pages_read_engagement",
          "pages_read_user_content",
          "pages_manage_posts",
          "business_management",
          "instagram_basic",
          "instagram_content_publish",
          "instagram_manage_comments",
        ].join(",");

        // Encode userId in state for callback
        const state = userId ? `${crypto.randomUUID()}_${userId}` : crypto.randomUUID();
        // Force re-authorization to ensure all pages/Instagram accounts are selectable
        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}&auth_type=rerequest`;

        console.log(`[meta-oauth] Generated auth URL for user: ${userId || "anonymous"}`);

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "callback": {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        const state = url.searchParams.get("state");

        console.log(`[meta-oauth] Callback - Code: ${code ? "present" : "missing"}, State: ${state}`);

        if (error) {
          const errorMsg = errorDescription || error;
          return new Response(generateErrorHtml(errorMsg), { headers: { "Content-Type": "text/html" } });
        }

        if (!code || !META_APP_ID || !META_APP_SECRET) {
          return new Response(generateErrorHtml("Missing credentials"), { headers: { "Content-Type": "text/html" } });
        }

        // Extract userId from state if present
        const userId = state?.includes("_") ? state.split("_")[1] : null;

        // Exchange code for token
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`;
        const tokenResponse = await fetch(tokenUrl);
        const tokenData: TokenResponse = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
          console.error("[meta-oauth] Token exchange failed:", tokenData);
          return new Response(generateErrorHtml("Token exchange failed"), { headers: { "Content-Type": "text/html" } });
        }

        // Get user profile
        const profileResponse = await fetch(
          `https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`
        );
        const profile: UserProfile = await profileResponse.json();

        // Get pages with Instagram accounts - request ALL pages user has access to
        console.log(`[meta-oauth] Fetching pages for user ${profile.id}...`);
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&limit=100&access_token=${tokenData.access_token}`
        );
        const pagesData = await pagesResponse.json();
        
        console.log(`[meta-oauth] Pages response:`, JSON.stringify(pagesData, null, 2));

        let pageData: PageData | null = null;
        let instagramId: string | null = null;
        let instagramUsername: string | null = null;
        let allPages: Array<{id: string, name: string, instagram?: {id: string, username: string}}> = [];

        if (pagesData.data?.length > 0) {
          // Store all available pages
          allPages = pagesData.data.map((p: PageData) => ({
            id: p.id,
            name: p.name,
            instagram: p.instagram_business_account ? {
              id: p.instagram_business_account.id,
              username: p.instagram_business_account.username,
            } : undefined,
          }));
          
          // Try to find a page with Instagram first, otherwise use first page
          pageData = pagesData.data.find((p: PageData) => p.instagram_business_account) || pagesData.data[0];
          if (pageData?.instagram_business_account) {
            instagramId = pageData.instagram_business_account.id;
            instagramUsername = pageData.instagram_business_account.username;
          }
          
          console.log(`[meta-oauth] Found ${allPages.length} pages, selected: ${pageData?.name}, Instagram: ${instagramUsername || "none"}`);
        } else {
          console.log(`[meta-oauth] No pages found for user. Error:`, pagesData.error || "none");
        }

        // Calculate expiration (Meta tokens usually 60 days)
        const expiresIn = tokenData.expires_in || 60 * 60 * 24 * 60; // Default 60 days
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Store in database if user is authenticated
        if (userId) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          
          const { error: upsertError } = await supabase
            .from("meta_connections")
            .upsert({
              user_id: userId,
              access_token: tokenData.access_token,
              expires_at: expiresAt,
              fb_user_id: profile.id,
              fb_user_name: profile.name,
              fb_picture_url: profile.picture?.data?.url || null,
              instagram_id: instagramId,
              instagram_username: instagramUsername,
              page_id: pageData?.id || null,
              page_access_token: pageData?.access_token || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "user_id",
            });

          if (upsertError) {
            console.error("[meta-oauth] DB upsert error:", upsertError);
          } else {
            console.log(`[meta-oauth] Saved connection for user: ${userId}`);
          }
        }

        // Send success back to opener (without exposing token)
        const result = {
          type: "meta-oauth-success",
          user: {
            id: profile.id,
            name: profile.name,
            picture: profile.picture?.data?.url,
          },
          instagram: instagramId ? {
            id: instagramId,
            username: instagramUsername,
          } : null,
          hasPageAccess: !!pageData,
          availablePages: allPages,
          selectedPage: pageData ? { id: pageData.id, name: pageData.name } : null,
          expiresAt,
        };

        console.log(`[meta-oauth] Success for ${profile.name}, Pages: ${allPages.length}, Instagram: ${instagramUsername || "none"}`);

        // Close popup and notify opener, then redirect
        return new Response(generateSuccessHtml(result), { headers: { "Content-Type": "text/html" } });
      }

      case "status": {
        // Check connection status for authenticated user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ connected: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (!user) {
          return new Response(
            JSON.stringify({ connected: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: connection } = await supabase
          .from("meta_connections")
          .select("fb_user_name, fb_picture_url, instagram_username, expires_at")
          .eq("user_id", user.id)
          .single();

        if (!connection || new Date(connection.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ connected: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            connected: true,
            user: {
              name: connection.fb_user_name,
              picture: connection.fb_picture_url,
            },
            instagram: connection.instagram_username ? {
              username: connection.instagram_username,
            } : null,
            expiresAt: connection.expires_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pages": {
        // Fetch all available Facebook pages for the user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (!user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: connection } = await supabase
          .from("meta_connections")
          .select("access_token, expires_at, page_id")
          .eq("user_id", user.id)
          .single();

        if (!connection || new Date(connection.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Meta connection expired" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch pages from Meta API
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${connection.access_token}`
        );
        const pagesData = await pagesResponse.json();

        if (pagesData.error) {
          console.error("[meta-oauth] Pages fetch error:", pagesData.error);
          return new Response(
            JSON.stringify({ error: pagesData.error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const pages = (pagesData.data || []).map((page: PageData) => ({
          id: page.id,
          name: page.name,
          instagram: page.instagram_business_account ? {
            id: page.instagram_business_account.id,
            username: page.instagram_business_account.username,
          } : null,
        }));

        return new Response(
          JSON.stringify({ 
            pages,
            selectedPageId: connection.page_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "select-page": {
        // Select a specific page for posting
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (!user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const body = await req.json();
        const { pageId } = body;

        if (!pageId) {
          return new Response(
            JSON.stringify({ error: "Page ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current connection
        const { data: connection } = await supabase
          .from("meta_connections")
          .select("access_token, expires_at")
          .eq("user_id", user.id)
          .single();

        if (!connection || new Date(connection.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Meta connection expired" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch page details from Meta API
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${connection.access_token}`
        );
        const pagesData = await pagesResponse.json();

        const selectedPage = (pagesData.data || []).find((p: PageData) => p.id === pageId);

        if (!selectedPage) {
          return new Response(
            JSON.stringify({ error: "Page not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update connection with selected page
        const { error: updateError } = await supabase
          .from("meta_connections")
          .update({
            page_id: selectedPage.id,
            page_access_token: selectedPage.access_token,
            instagram_id: selectedPage.instagram_business_account?.id || null,
            instagram_username: selectedPage.instagram_business_account?.username || null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("[meta-oauth] Page selection update error:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update page selection" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            page: {
              id: selectedPage.id,
              name: selectedPage.name,
            },
            instagram: selectedPage.instagram_business_account ? {
              id: selectedPage.instagram_business_account.id,
              username: selectedPage.instagram_business_account.username,
            } : null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (!user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("meta_connections")
          .delete()
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "share": {
        // Share content using stored token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (!user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get stored connection
        const { data: connection } = await supabase
          .from("meta_connections")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!connection || new Date(connection.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Meta connection expired, please reconnect" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const body = await req.json();
        const { platform, content, videoUrl, imageUrl } = body;

        if (platform === "facebook") {
          if (!connection.page_id || !connection.page_access_token) {
            return new Response(
              JSON.stringify({ error: "No Facebook page connected" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          let postResult;
          if (videoUrl) {
            postResult = await fetch(
              `https://graph.facebook.com/v19.0/${connection.page_id}/videos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file_url: videoUrl,
                  description: content,
                  access_token: connection.page_access_token,
                }),
              }
            );
          } else {
            postResult = await fetch(
              `https://graph.facebook.com/v19.0/${connection.page_id}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: content,
                  link: imageUrl,
                  access_token: connection.page_access_token,
                }),
              }
            );
          }

          const result = await postResult.json();
          console.log(`[meta-oauth] Facebook post result:`, result);

          if (result.error) {
            return new Response(
              JSON.stringify({ error: result.error.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, postId: result.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (platform === "instagram") {
          if (!connection.instagram_id) {
            return new Response(
              JSON.stringify({ error: "No Instagram business account connected. Please reconnect and select a Facebook Page with a linked Instagram Business account." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Instagram requires media (image or video)
          if (!imageUrl && !videoUrl) {
            return new Response(
              JSON.stringify({ error: "Instagram requires an image or video. Text-only posts are not supported." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Use page_access_token for Instagram API calls (required for business accounts)
          const accessToken = connection.page_access_token || connection.access_token;

          console.log(`[meta-oauth] Instagram share - Account: ${connection.instagram_id}, Has video: ${!!videoUrl}, Has image: ${!!imageUrl}`);

          const mediaParams: Record<string, string> = {
            access_token: accessToken,
            caption: content || "",
          };

          if (videoUrl) {
            mediaParams.media_type = "REELS";
            mediaParams.video_url = videoUrl;
          } else if (imageUrl) {
            mediaParams.image_url = imageUrl;
          }

          console.log(`[meta-oauth] Creating Instagram media container...`);

          // Create media container
          const createMediaResponse = await fetch(
            `https://graph.facebook.com/v19.0/${connection.instagram_id}/media`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mediaParams),
            }
          );

          const mediaResult = await createMediaResponse.json();
          console.log(`[meta-oauth] Instagram media container result:`, JSON.stringify(mediaResult));

          if (mediaResult.error || !mediaResult.id) {
            const errorMsg = mediaResult.error?.message || "Failed to create Instagram media container";
            console.error(`[meta-oauth] Instagram media error:`, errorMsg);
            return new Response(
              JSON.stringify({ error: errorMsg }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Wait for media processing (especially for videos)
          if (videoUrl) {
            console.log(`[meta-oauth] Waiting for video processing...`);
            // Poll for status instead of fixed wait
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              const statusResponse = await fetch(
                `https://graph.facebook.com/v19.0/${mediaResult.id}?fields=status_code&access_token=${accessToken}`
              );
              const statusData = await statusResponse.json();
              console.log(`[meta-oauth] Video status check ${attempts + 1}:`, statusData.status_code);
              if (statusData.status_code === "FINISHED") break;
              if (statusData.status_code === "ERROR") {
                return new Response(
                  JSON.stringify({ error: "Video processing failed" }),
                  { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
              attempts++;
            }
          } else {
            // Short delay for images
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          console.log(`[meta-oauth] Publishing Instagram media...`);

          // Publish media
          const publishResponse = await fetch(
            `https://graph.facebook.com/v19.0/${connection.instagram_id}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: mediaResult.id,
                access_token: accessToken,
              }),
            }
          );

          const publishResult = await publishResponse.json();
          console.log(`[meta-oauth] Instagram publish result:`, JSON.stringify(publishResult));

          if (publishResult.error) {
            return new Response(
              JSON.stringify({ error: publishResult.error.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, postId: publishResult.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Invalid platform" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("[meta-oauth] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateErrorHtml(errorMessage: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Meta Authorization</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1877f2; color: white; }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; }
    p { color: rgba(255,255,255,0.8); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>Connection Failed</h1>
    <p>${errorMessage}</p>
    <p>This window will close automatically...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({"type":"meta-oauth-error","error":"${errorMessage.replace(/"/g, '\\"')}"}, "*");
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
}

function generateSuccessHtml(result: Record<string, unknown>): string {
  const userName = (result.user as { name?: string })?.name || "Unknown";
  return `<!DOCTYPE html>
<html>
<head>
  <title>Meta Authorization</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1877f2; color: white; }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; }
    p { color: rgba(255,255,255,0.8); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>Connected!</h1>
    <p>Account: ${userName}</p>
    <p>This window will close automatically...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify(result)}, "*");
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
}
