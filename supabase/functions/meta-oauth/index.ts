import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Meta App credentials - must be configured in secrets
const META_APP_ID = Deno.env.get("META_APP_ID");
const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
const REDIRECT_URI = Deno.env.get("META_REDIRECT_URI") || "https://vgffjuvaedmxoxvzovoq.supabase.co/functions/v1/meta-oauth?action=callback";

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

interface InstagramAccount {
  id: string;
  username: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  console.log(`[meta-oauth] Action: ${action}, Method: ${req.method}`);

  try {
    switch (action) {
      case "authorize": {
        // Generate OAuth authorization URL
        if (!META_APP_ID) {
          console.error("[meta-oauth] META_APP_ID not configured");
          return new Response(
            JSON.stringify({ 
              error: "Meta App ID not configured",
              message: "Please configure META_APP_ID in secrets" 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[meta-oauth] Using redirect URI: ${REDIRECT_URI}`);
        console.log(`[meta-oauth] App ID configured: ${META_APP_ID ? "Yes" : "No"}`);
        console.log(`[meta-oauth] App Secret configured: ${META_APP_SECRET ? "Yes" : "No"}`);

        const scopes = [
          "public_profile",
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
          "instagram_basic",
          "instagram_content_publish",
        ].join(",");

        const state = crypto.randomUUID();
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`;

        console.log(`[meta-oauth] Generated auth URL with state: ${state}`);

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "callback": {
        // Handle OAuth callback
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorReason = url.searchParams.get("error_reason");
        const errorDescription = url.searchParams.get("error_description");
        const state = url.searchParams.get("state");

        console.log(`[meta-oauth] Callback received - Code: ${code ? "present" : "missing"}, Error: ${error || "none"}, State: ${state}`);

        if (error) {
          console.error(`[meta-oauth] Auth error: ${error}, Reason: ${errorReason}, Description: ${errorDescription}`);
          const errorMsg = errorDescription || errorReason || error;
          return new Response(
            `<html><body><script>window.opener.postMessage({type:'meta-oauth-error',error:'${errorMsg}'},'*');window.close();</script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        if (!code) {
          console.error("[meta-oauth] No authorization code received");
          return new Response(
            `<html><body><script>window.opener.postMessage({type:'meta-oauth-error',error:'no_auth_code'},'*');window.close();</script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        if (!META_APP_ID || !META_APP_SECRET) {
          console.error("[meta-oauth] Missing app credentials");
          return new Response(
            `<html><body><script>window.opener.postMessage({type:'meta-oauth-error',error:'missing_app_credentials'},'*');window.close();</script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        // Exchange code for access token
        console.log("[meta-oauth] Exchanging code for access token...");
        const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`;

        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();

        console.log(`[meta-oauth] Token response status: ${tokenResponse.status}`);

        if (!tokenResponse.ok || tokenData.error) {
          console.error("[meta-oauth] Token exchange failed:", tokenData);
          const errorMsg = tokenData.error?.message || tokenData.error || "token_exchange_failed";
          return new Response(
            `<html><body><script>window.opener.postMessage({type:'meta-oauth-error',error:'${errorMsg}'},'*');window.close();</script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        if (!tokenData.access_token) {
          console.error("[meta-oauth] No access token in response");
          return new Response(
            `<html><body><script>window.opener.postMessage({type:'meta-oauth-error',error:'no_access_token'},'*');window.close();</script></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        console.log("[meta-oauth] Access token obtained successfully");

        // Get user profile
        const profileResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`
        );
        const profile: UserProfile = await profileResponse.json();

        // Get Instagram accounts
        const accountsResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${tokenData.access_token}`
        );
        const accountsData = await accountsResponse.json();

        let instagramAccount: InstagramAccount | null = null;
        if (accountsData.data) {
          for (const page of accountsData.data) {
            if (page.instagram_business_account) {
              instagramAccount = {
                id: page.instagram_business_account.id,
                username: page.instagram_business_account.username,
              };
              break;
            }
          }
        }

        console.log(`[meta-oauth] Auth successful for user: ${profile.name}`);

        // Send data back to opener window
        const result = {
          type: "meta-oauth-success",
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in,
          user: {
            id: profile.id,
            name: profile.name,
            picture: profile.picture?.data?.url,
          },
          instagram: instagramAccount,
        };

        return new Response(
          `<html><body><script>window.opener.postMessage(${JSON.stringify(result)},'*');window.close();</script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      case "share": {
        // Share content to Facebook/Instagram
        const body = await req.json();
        const { platform, accessToken, content, videoUrl, imageUrl } = body;

        if (!accessToken) {
          return new Response(
            JSON.stringify({ error: "Access token required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (platform === "facebook") {
          // Post to Facebook page
          const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
          );
          const pagesData = await pagesResponse.json();

          if (!pagesData.data || pagesData.data.length === 0) {
            return new Response(
              JSON.stringify({ error: "No Facebook pages found" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const page = pagesData.data[0];
          const pageAccessToken = page.access_token;

          // Post video or image
          let postResult;
          if (videoUrl) {
            postResult = await fetch(
              `https://graph.facebook.com/v18.0/${page.id}/videos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file_url: videoUrl,
                  description: content,
                  access_token: pageAccessToken,
                }),
              }
            );
          } else {
            postResult = await fetch(
              `https://graph.facebook.com/v18.0/${page.id}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: content,
                  link: imageUrl,
                  access_token: pageAccessToken,
                }),
              }
            );
          }

          const result = await postResult.json();
          console.log(`[meta-oauth] Facebook post result:`, result);

          return new Response(
            JSON.stringify({ success: true, postId: result.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (platform === "instagram") {
          // Get Instagram business account
          const accountsResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
          );
          const accountsData = await accountsResponse.json();

          let igAccountId: string | null = null;
          for (const page of accountsData.data || []) {
            if (page.instagram_business_account) {
              igAccountId = page.instagram_business_account.id;
              break;
            }
          }

          if (!igAccountId) {
            return new Response(
              JSON.stringify({ error: "No Instagram business account found" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Create media container
          const mediaParams: Record<string, string> = {
            access_token: accessToken,
            caption: content,
          };

          if (videoUrl) {
            mediaParams.media_type = "REELS";
            mediaParams.video_url = videoUrl;
          } else if (imageUrl) {
            mediaParams.image_url = imageUrl;
          }

          const createMediaResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}/media`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mediaParams),
            }
          );

          const mediaResult = await createMediaResponse.json();

          if (!mediaResult.id) {
            return new Response(
              JSON.stringify({ error: "Failed to create media container", details: mediaResult }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Publish media
          const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
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
          console.log(`[meta-oauth] Instagram publish result:`, publishResult);

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
