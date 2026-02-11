import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TikTokUser {
  openId: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface TikTokConnection {
  user: TikTokUser;
  expiresAt: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * TikTok OAuth hook – scoped per project.
 * Pass `projectId` to scope connections to a specific project.
 */
export const useTikTokOAuth = (projectId?: string) => {
  const [connection, setConnection] = useState<TikTokConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const popupRef = useRef<Window | null>(null);
  const popupMonitorRef = useRef<number | null>(null);

  const cleanupPopup = useCallback(() => {
    if (popupMonitorRef.current) {
      window.clearInterval(popupMonitorRef.current);
      popupMonitorRef.current = null;
    }
    try { popupRef.current?.close(); } catch { /* ignore */ }
    popupRef.current = null;
  }, []);

  // Check connection status on mount / projectId change
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setIsLoading(false); return; }

        const params = new URLSearchParams({ action: "status" });
        if (projectId) params.set("projectId", projectId);

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/tiktok-oauth?${params.toString()}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json();
        if (data.connected) {
          setConnection({ user: data.user, expiresAt: data.expiresAt });
        } else {
          setConnection(null);
        }
      } catch (error) {
        console.error("[useTikTokOAuth] Status check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [projectId]);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "tiktok-oauth-success") {
        const { user } = event.data;
        console.log("[useTikTokOAuth] OAuth success for user:", user?.displayName);
        setConnection({
          user,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        });
        setIsConnecting(false);
        cleanupPopup();
        toast({
          title: "TikTok Connected! 🎉",
          description: `Account "${user?.displayName || "TikTok User"}" linked successfully`,
        });
        setTimeout(() => window.location.reload(), 300);
      } else if (event.data?.type === "tiktok-oauth-error") {
        console.error("[useTikTokOAuth] OAuth error:", event.data.error);
        setIsConnecting(false);
        cleanupPopup();
        toast({
          title: "Connection Error",
          description: event.data.error || "Failed to connect to TikTok",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast, cleanupPopup]);

  const connect = useCallback(async () => {
    if (!projectId) {
      toast({
        title: "Project Required",
        description: "Please connect TikTok from a specific project's settings",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    console.log("[useTikTokOAuth] Starting OAuth flow for project:", projectId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Not Authenticated", description: "Please sign in first", variant: "destructive" });
        setIsConnecting(false);
        return;
      }

      const params = new URLSearchParams({ action: "authorize", projectId });

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tiktok-oauth?${params.toString()}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Failed to get auth URL");

      const popup = window.open(data.authUrl, "tiktok-oauth", "width=600,height=700,left=100,top=100");
      if (!popup) {
        setIsConnecting(false);
        toast({ title: "Popup Blocked", description: "Please allow popups to connect to TikTok", variant: "destructive" });
        return;
      }

      popupRef.current = popup;
      popupMonitorRef.current = window.setInterval(() => {
        if (popup.closed) {
          cleanupPopup();
          setTimeout(() => setIsConnecting(false), 1000);
        }
      }, 500);
    } catch (error) {
      setIsConnecting(false);
      console.error("[useTikTokOAuth] Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to start authentication",
        variant: "destructive",
      });
    }
  }, [projectId, toast, cleanupPopup]);

  useEffect(() => {
    return () => cleanupPopup();
  }, [cleanupPopup]);

  const disconnect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const params = new URLSearchParams({ action: "disconnect" });
        if (projectId) params.set("projectId", projectId);

        await fetch(
          `${SUPABASE_URL}/functions/v1/tiktok-oauth?${params.toString()}`,
          {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
      }

      setConnection(null);
      toast({ title: "Disconnected", description: "Your TikTok account has been disconnected" });
    } catch (error) {
      console.error("[useTikTokOAuth] Disconnect error:", error);
      setConnection(null);
    }
  }, [projectId, toast]);

  return {
    connection,
    isConnecting,
    isLoading,
    isConnected: !!connection,
    connect,
    disconnect,
    displayName: connection?.user?.displayName,
    avatarUrl: connection?.user?.avatarUrl,
  };
};
