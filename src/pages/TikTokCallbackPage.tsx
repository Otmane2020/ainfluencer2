import { useEffect } from "react";

/**
 * /api/tiktok/callback
 * TikTok redirects here after OAuth authorisation.
 * We forward every query-param to the edge function's callback action.
 */
const TikTokCallbackPage = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("action", "callback");

    const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-oauth?${params.toString()}`;

    // Replace current location so the edge function handles the token exchange
    // and returns the postMessage HTML page.
    window.location.replace(edgeFnUrl);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Connecting to TikTok…</p>
    </div>
  );
};

export default TikTokCallbackPage;
