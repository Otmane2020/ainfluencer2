import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  console.log(`[youtube-oauth] Action: ${action}, Method: ${req.method}`);

  try {
    // Check required env vars
    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      console.error("[youtube-oauth] Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET");
      return new Response(
        JSON.stringify({ error: "YouTube OAuth not configured. Please add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    // ✅ FIX: OAuth callback has NO auth header - detect via ?code param
    const authHeader = req.headers.get("Authorization");
    const hasCode = url.searchParams.has("code");
    
    if (!authHeader && !hasCode) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        console.error("[youtube-oauth] User auth error:", userError);
        return new Response(
          JSON.stringify({ error: "Invalid authorization token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    }

    // Get redirect URI - NO query params (YouTube requirement)
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    const origin = referer ? new URL(referer).origin : "https://ainfluencer2.lovable.app";
    const redirectUri = `${SUPABASE_URL}/functions/v1/youtube-oauth`;

    // ========== AUTHORIZE ==========
    if (action === "authorize") {
      // Generate state with user ID for callback
      const state = btoa(JSON.stringify({ userId, origin }));
      
      // Only request scopes we actually use
      const scopes = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ].join(" ");

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", YOUTUBE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      console.log("[youtube-oauth] Generated auth URL");

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CALLBACK (detect via code param, not action) ==========
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    
    if (code && stateParam) {
      const error = url.searchParams.get("error");

      if (error) {
        console.error("[youtube-oauth] OAuth error:", error);
        return new Response(generateCallbackHtml({ error }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      // Parse state
      let stateData: { userId: string; origin: string };
      try {
        stateData = JSON.parse(atob(stateParam));
      } catch {
        return new Response(generateCallbackHtml({ error: "Invalid state" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      // Validate state payload has required userId
      if (!stateData.userId) {
        return new Response(generateCallbackHtml({ error: "Invalid state payload" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: YOUTUBE_CLIENT_ID,
          client_secret: YOUTUBE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok || tokens.error) {
        console.error("[youtube-oauth] Token exchange error:", tokens);
        return new Response(generateCallbackHtml({ error: tokens.error_description || "Token exchange failed" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      console.log("[youtube-oauth] Token exchange successful, access_token length:", tokens.access_token?.length);

      // Get YouTube channel info
      const channelResponse = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        {
          headers: { 
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/json",
          },
        }
      );

      const channelData = await channelResponse.json();
      console.log("[youtube-oauth] Channel API response status:", channelResponse.status);

      if (!channelResponse.ok) {
        console.error("[youtube-oauth] Channel API error:", JSON.stringify(channelData));
        return new Response(generateCallbackHtml({ error: channelData.error?.message || "Failed to fetch channel info" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      if (!channelData.items || channelData.items.length === 0) {
        console.error("[youtube-oauth] No YouTube channel found for this account");
        return new Response(generateCallbackHtml({ error: "No YouTube channel found for this account. Please ensure you have a YouTube channel created." }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const channel = channelData.items[0];
      const channelId = channel.id;
      const channelName = channel.snippet.title;
      const channelPictureUrl = channel.snippet.thumbnails?.default?.url || null;

      console.log(`[youtube-oauth] Channel found: ${channelName} (${channelId})`);

      // Calculate expiry with fallback
      const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

      // Safe refresh token handling - don't overwrite if not provided
      // Google only returns refresh_token on first consent
      const refreshToken = tokens.refresh_token || undefined;

      // Save to database - undefined values won't overwrite existing data
      const { error: upsertError } = await supabaseAdmin
        .from("youtube_connections")
        .upsert({
          user_id: stateData.userId,
          channel_id: channelId,
          channel_name: channelName,
          channel_picture_url: channelPictureUrl,
          access_token: tokens.access_token,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("[youtube-oauth] Database upsert error:", upsertError);
        return new Response(generateCallbackHtml({ error: "Failed to save connection" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      console.log("[youtube-oauth] Connection saved successfully");

      return new Response(
        generateCallbackHtml({
          success: true,
          channel: { id: channelId, name: channelName, picture: channelPictureUrl },
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    // ========== STATUS ==========
    if (action === "status") {
      const { data: connection } = await supabaseAdmin
        .from("youtube_connections")
        .select("channel_id, channel_name, channel_picture_url, expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!connection) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          connected: true,
          channel: {
            id: connection.channel_id,
            name: connection.channel_name,
            picture: connection.channel_picture_url,
          },
          expiresAt: connection.expires_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== DISCONNECT ==========
    if (action === "disconnect" && req.method === "POST") {
      await supabaseAdmin
        .from("youtube_connections")
        .delete()
        .eq("user_id", userId);

      console.log("[youtube-oauth] Connection deleted for user:", userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[youtube-oauth] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateCallbackHtml(result: { success?: boolean; channel?: { id: string; name: string; picture?: string | null }; error?: string }) {
  const messageData = result.success
    ? { type: "youtube-oauth-success", channel: result.channel }
    : { type: "youtube-oauth-error", error: result.error };

  return `
<!DOCTYPE html>
<html>
<head>
  <title>YouTube Authorization</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f0f0f; color: white; }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; }
    p { color: #aaa; }
    .close-btn { margin-top: 1.5rem; padding: 0.75rem 2rem; background: #ff0000; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    .close-btn:hover { background: #cc0000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${result.success ? "✅" : "❌"}</div>
    <h1>${result.success ? "Connected!" : "Connection Failed"}</h1>
    <p>${result.success ? `Channel: ${result.channel?.name}` : result.error}</p>
    <p id="status">Closing automatically...</p>
    <button class="close-btn" onclick="closeWindow()">Close Window</button>
  </div>
  <script>
    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify(messageData)}, "*");
    }
    
    function closeWindow() {
      try {
        window.close();
      } catch (e) {
        document.getElementById('status').textContent = 'Please close this tab manually';
      }
    }
    
    // Try to close after 1.5 seconds
    setTimeout(() => {
      closeWindow();
      // If still open after another 500ms, show manual close message
      setTimeout(() => {
        if (!window.closed) {
          document.getElementById('status').textContent = 'You can close this tab now';
        }
      }, 500);
    }, 1500);
  </script>
</body>
</html>`;
}