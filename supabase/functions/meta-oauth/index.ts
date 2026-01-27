import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
          "pages_manage_posts",
          "instagram_basic",
          "instagram_content_publish",
        ].join(",");

        // Encode userId in state for callback
        const state = userId ? `${crypto.randomUUID()}_${userId}` : crypto.randomUUID();
        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`;

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
          return new Response(
            `<!DOCTYPE html><html><body><script>
              window.opener.postMessage({type:'meta-oauth-error',error:'${errorMsg.replace(/'/g, "\\'")}'},'*');
              window.close();
            </script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        if (!code || !META_APP_ID || !META_APP_SECRET) {
          return new Response(
            `<!DOCTYPE html><html><body><script>
              window.opener.postMessage({type:'meta-oauth-error',error:'missing_credentials'},'*');
              window.close();
            </script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        // Extract userId from state if present
        const userId = state?.includes("_") ? state.split("_")[1] : null;

        // Exchange code for token
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`;
        const tokenResponse = await fetch(tokenUrl);
        const tokenData: TokenResponse = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
          console.error("[meta-oauth] Token exchange failed:", tokenData);
          return new Response(
            `<!DOCTYPE html><html><body><script>
              window.opener.postMessage({type:'meta-oauth-error',error:'token_exchange_failed'},'*');
              window.close();
            </script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        // Get user profile
        const profileResponse = await fetch(
          `https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`
        );
        const profile: UserProfile = await profileResponse.json();

        // Get pages with Instagram accounts
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${tokenData.access_token}`
        );
        const pagesData = await pagesResponse.json();

        let pageData: PageData | null = null;
        let instagramId: string | null = null;
        let instagramUsername: string | null = null;

        if (pagesData.data?.length > 0) {
          pageData = pagesData.data[0];
          if (pageData?.instagram_business_account) {
            instagramId = pageData.instagram_business_account.id;
            instagramUsername = pageData.instagram_business_account.username;
          }
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
          expiresAt,
        };

        console.log(`[meta-oauth] Success for ${profile.name}, Instagram: ${instagramUsername || "none"}`);

        return new Response(
          `<!DOCTYPE html><html><body><script>
            window.opener.postMessage(${JSON.stringify(result)},'*');
            window.close();
          </script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
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
              JSON.stringify({ error: "No Instagram business account connected" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const mediaParams: Record<string, string> = {
            access_token: connection.access_token,
            caption: content,
          };

          if (videoUrl) {
            mediaParams.media_type = "REELS";
            mediaParams.video_url = videoUrl;
          } else if (imageUrl) {
            mediaParams.image_url = imageUrl;
          }

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

          if (mediaResult.error || !mediaResult.id) {
            return new Response(
              JSON.stringify({ error: mediaResult.error?.message || "Failed to create media" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Wait for video processing if needed
          if (videoUrl) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          // Publish media
          const publishResponse = await fetch(
            `https://graph.facebook.com/v19.0/${connection.instagram_id}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: mediaResult.id,
                access_token: connection.access_token,
              }),
            }
          );

          const publishResult = await publishResponse.json();
          console.log(`[meta-oauth] Instagram publish result:`, publishResult);

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
