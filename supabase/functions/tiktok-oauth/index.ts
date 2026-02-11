import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")?.trim();
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")?.trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  console.log("[tiktok-oauth] Action:", action, "Has code:", !!code, "Has state:", !!state);

  const redirectUri = "https://clipmotion.ai/api/tiktok/callback";

  try {
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      console.error("[tiktok-oauth] Missing TikTok credentials");
      return new Response(
        JSON.stringify({ error: "TikTok not configured. Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token for protected actions
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claims } = await supabaseAdmin.auth.getUser(token);
      userId = claims?.user?.id || null;
    }

    // ========== AUTHORIZE ==========
    if (action === "authorize") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const projectId = url.searchParams.get("projectId");
      if (!projectId) {
        return new Response(
          JSON.stringify({ error: "projectId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statePayload = btoa(JSON.stringify({ userId, projectId }));

      const scopes = [
        "user.info.basic",
        "video.publish",
        "video.upload",
      ].join(",");

      const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
      authUrl.searchParams.set("client_key", TIKTOK_CLIENT_KEY);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", statePayload);

      console.log("[tiktok-oauth] Generated auth URL for project:", projectId);

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CALLBACK ==========
    if (action === "callback" || code) {
      console.log("[tiktok-oauth] Processing callback...");

      if (error) {
        console.error("[tiktok-oauth] OAuth error from TikTok:", error);
        return generateCallbackHtml(false, null, error);
      }

      if (!code || !state) {
        console.error("[tiktok-oauth] Missing code or state");
        return generateCallbackHtml(false, null, "Missing authorization code or state");
      }

      let stateData: { userId: string; projectId?: string };
      try {
        stateData = JSON.parse(atob(state));
        console.log("[tiktok-oauth] State decoded, userId:", stateData.userId, "projectId:", stateData.projectId);
      } catch (e) {
        console.error("[tiktok-oauth] Failed to decode state:", e);
        return generateCallbackHtml(false, null, "Invalid state parameter");
      }

      // Exchange code for token
      const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || tokenData.error) {
        console.error("[tiktok-oauth] Token exchange failed:", tokenData);
        return generateCallbackHtml(false, null, tokenData.error_description || tokenData.error || "Failed to exchange authorization code");
      }

      const { access_token, refresh_token, expires_in, open_id, scope } = tokenData;
      console.log("[tiktok-oauth] Got tokens, open_id:", open_id, "scope:", scope);

      // Fetch user info
      const userInfoResponse = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const userInfoData = await userInfoResponse.json();
      let displayName = "TikTok User";
      let avatarUrl: string | null = null;

      if (userInfoData.data?.user) {
        displayName = userInfoData.data.user.display_name || displayName;
        avatarUrl = userInfoData.data.user.avatar_url || null;
      }

      const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

      // Upsert connection scoped to user + project
      const upsertData: Record<string, unknown> = {
        user_id: stateData.userId,
        project_id: stateData.projectId || null,
        open_id,
        display_name: displayName,
        avatar_url: avatarUrl,
        access_token,
        refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabaseAdmin
        .from("tiktok_connections")
        .upsert(upsertData, { onConflict: "user_id,project_id" });

      if (upsertError) {
        console.error("[tiktok-oauth] Failed to save connection:", upsertError);
        return generateCallbackHtml(false, null, "Failed to save connection");
      }

      console.log("[tiktok-oauth] Connection saved for project:", stateData.projectId);

      return generateCallbackHtml(true, { displayName, avatarUrl, openId: open_id }, null);
    }

    // ========== STATUS ==========
    if (action === "status") {
      if (!userId) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const projectId = url.searchParams.get("projectId");

      let query = supabaseAdmin
        .from("tiktok_connections")
        .select("open_id, display_name, avatar_url, expires_at, project_id")
        .eq("user_id", userId);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data: connection } = await query.maybeSingle();

      if (connection) {
        return new Response(
          JSON.stringify({
            connected: true,
            user: {
              openId: connection.open_id,
              displayName: connection.display_name,
              avatarUrl: connection.avatar_url,
            },
            expiresAt: connection.expires_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ connected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== DISCONNECT ==========
    if (action === "disconnect") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const projectId = url.searchParams.get("projectId");

      let query = supabaseAdmin
        .from("tiktok_connections")
        .delete()
        .eq("user_id", userId);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { error: deleteError } = await query;

      if (deleteError) {
        console.error("[tiktok-oauth] Delete error:", deleteError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[tiktok-oauth] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateCallbackHtml(
  success: boolean,
  user: { displayName: string; avatarUrl: string | null; openId: string } | null,
  errorMessage: string | null
): Response {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>TikTok ${success ? "Connected" : "Error"}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: linear-gradient(135deg, #000 0%, #25F4EE 50%, #FE2C55 100%);
      color: white;
    }
    .container { text-align: center; padding: 2rem; background: rgba(0,0,0,0.8); border-radius: 1rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 400px; }
    .success { color: #25F4EE; }
    .error { color: #FE2C55; }
    h1 { margin-bottom: 0.5rem; font-size: 1.5rem; }
    p { color: rgba(255,255,255,0.8); margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    ${success ? `
      <h1 class="success">✓ TikTok Connected!</h1>
      <p>Welcome, ${user?.displayName || "TikTok User"}</p>
      <p>This window will close automatically...</p>
    ` : `
      <h1 class="error">✗ Connection Failed</h1>
      <p>${errorMessage || "An error occurred"}</p>
      <p>Please close this window and try again.</p>
    `}
  </div>
  <script>
    ${success ? `
      if (window.opener) {
        window.opener.postMessage({
          type: "tiktok-oauth-success",
          user: ${JSON.stringify(user)}
        }, "*");
      }
      setTimeout(() => window.close(), 2000);
    ` : `
      if (window.opener) {
        window.opener.postMessage({
          type: "tiktok-oauth-error",
          error: "${errorMessage?.replace(/"/g, '\\"') || "Unknown error"}"
        }, "*");
      }
    `}
  </script>
</body>
</html>
  `;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
