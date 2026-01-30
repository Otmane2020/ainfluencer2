import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  console.log(`[linkedin-oauth] Action: ${action}, Method: ${req.method}`);

  try {
    // Check required env vars
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error("[linkedin-oauth] Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET");
      return new Response(
        JSON.stringify({ error: "LinkedIn OAuth not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader && action !== "callback") {
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
        console.error("[linkedin-oauth] User auth error:", userError);
        return new Response(
          JSON.stringify({ error: "Invalid authorization token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    }

    // Get redirect URI
    const redirectUri = `${SUPABASE_URL}/functions/v1/linkedin-oauth?action=callback`;

    // ========== AUTHORIZE ==========
    if (action === "authorize") {
      // Generate state with user ID for callback
      const state = btoa(JSON.stringify({ userId }));
      
      // LinkedIn OpenID Connect scopes for posting
      const scopes = [
        "openid",
        "profile",
        "email",
        "w_member_social", // Required for posting
      ].join(" ");

      const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", LINKEDIN_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("state", state);

      console.log("[linkedin-oauth] Generated auth URL");

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CALLBACK ==========
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error) {
        console.error("[linkedin-oauth] OAuth error:", error, errorDescription);
        return new Response(generateCallbackHtml({ error: errorDescription || error }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      if (!code || !stateParam) {
        return new Response(generateCallbackHtml({ error: "Missing code or state" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      // Parse state
      let stateData: { userId: string };
      try {
        stateData = JSON.parse(atob(stateParam));
      } catch {
        return new Response(generateCallbackHtml({ error: "Invalid state" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok || tokens.error) {
        console.error("[linkedin-oauth] Token exchange error:", tokens);
        return new Response(generateCallbackHtml({ error: tokens.error_description || "Token exchange failed" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      console.log("[linkedin-oauth] Token exchange successful");

      // Get LinkedIn profile info using OpenID userinfo endpoint
      const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const profile = await profileResponse.json();

      if (!profileResponse.ok) {
        console.error("[linkedin-oauth] Profile fetch error:", profile);
        return new Response(generateCallbackHtml({ error: "Failed to fetch LinkedIn profile" }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const linkedinId = profile.sub;
      const displayName = profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim();
      const avatarUrl = profile.picture || null;

      console.log(`[linkedin-oauth] Profile found: ${displayName} (${linkedinId})`);

      // Calculate expiry (LinkedIn tokens typically expire in 60 days)
      const expiresAt = new Date(Date.now() + (tokens.expires_in || 5184000) * 1000).toISOString();

      // Save to database - need to create linkedin_connections table first
      const { error: upsertError } = await supabaseAdmin
        .from("linkedin_connections")
        .upsert({
          user_id: stateData.userId,
          linkedin_id: linkedinId,
          display_name: displayName,
          avatar_url: avatarUrl,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("[linkedin-oauth] Database upsert error:", upsertError);
        return new Response(generateCallbackHtml({ error: "Failed to save connection: " + upsertError.message }), {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      console.log("[linkedin-oauth] Connection saved successfully");

      return new Response(
        generateCallbackHtml({
          success: true,
          profile: { id: linkedinId, name: displayName, picture: avatarUrl },
        }),
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    // ========== STATUS ==========
    if (action === "status") {
      const { data: connection } = await supabaseAdmin
        .from("linkedin_connections")
        .select("linkedin_id, display_name, avatar_url, expires_at")
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
          profile: {
            id: connection.linkedin_id,
            name: connection.display_name,
            picture: connection.avatar_url,
          },
          expiresAt: connection.expires_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== DISCONNECT ==========
    if (action === "disconnect" && req.method === "POST") {
      await supabaseAdmin
        .from("linkedin_connections")
        .delete()
        .eq("user_id", userId);

      console.log("[linkedin-oauth] Connection deleted for user:", userId);

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
    console.error("[linkedin-oauth] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateCallbackHtml(result: { success?: boolean; profile?: { id: string; name: string; picture?: string | null }; error?: string }) {
  const messageData = result.success
    ? { type: "linkedin-oauth-success", profile: result.profile }
    : { type: "linkedin-oauth-error", error: result.error };

  return `
<!DOCTYPE html>
<html>
<head>
  <title>LinkedIn Authorization</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0a66c2; color: white; }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; }
    p { color: rgba(255,255,255,0.8); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${result.success ? "✅" : "❌"}</div>
    <h1>${result.success ? "Connected!" : "Connection Failed"}</h1>
    <p>${result.success ? `Profile: ${result.profile?.name}` : result.error}</p>
    <p>This window will close automatically...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify(messageData)}, "*");
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
}