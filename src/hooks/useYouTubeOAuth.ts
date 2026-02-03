import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface YouTubeChannel {
  id: string;
  name: string;
  picture?: string | null;
}

interface YouTubeConnection {
  channel: YouTubeChannel;
  expiresAt: string;
  projectId?: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const useYouTubeOAuth = (projectId?: string) => {
  const [connection, setConnection] = useState<YouTubeConnection | null>(null);
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

    try {
      popupRef.current?.close();
    } catch {
      // ignore
    }

    popupRef.current = null;
  }, []);

  // Check connection status on mount or when projectId changes
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        const params = new URLSearchParams({ action: "status" });
        if (projectId) {
          params.set("project_id", projectId);
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/youtube-oauth?${params.toString()}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json();
        
        if (data.connected) {
          setConnection({
            channel: data.channel,
            expiresAt: data.expiresAt,
            projectId: data.projectId,
          });
        } else {
          setConnection(null);
        }
      } catch (error) {
        console.error("[useYouTubeOAuth] Status check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [projectId]);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "youtube-oauth-success") {
        const { channel, projectId: returnedProjectId } = event.data;
        
        console.log("[useYouTubeOAuth] OAuth success for channel:", channel?.name, "project:", returnedProjectId);

        setConnection({
          channel,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          projectId: returnedProjectId,
        });
        
        setIsConnecting(false);

        cleanupPopup();
        
        toast({
          title: "YouTube Connected! 🎉",
          description: `Channel "${channel.name}" linked successfully`,
        });

        // Refresh parent to update all pages that read connection state.
        setTimeout(() => window.location.reload(), 300);
      } else if (event.data?.type === "youtube-oauth-error") {
        console.error("[useYouTubeOAuth] OAuth error:", event.data.error);
        setIsConnecting(false);

        cleanupPopup();

        toast({
          title: "Connection Error",
          description: event.data.error || "Failed to connect to YouTube",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast, cleanupPopup]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    console.log("[useYouTubeOAuth] Starting OAuth flow for project:", projectId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Not Authenticated",
          description: "Please sign in first",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }

      const params = new URLSearchParams({ action: "authorize" });
      if (projectId) {
        params.set("project_id", projectId);
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/youtube-oauth?${params.toString()}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to get auth URL");
      }

      // Open OAuth popup
      const popup = window.open(
        data.authUrl,
        "youtube-oauth",
        "width=600,height=700,left=100,top=100"
      );

      if (!popup) {
        setIsConnecting(false);
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to connect to YouTube",
          variant: "destructive",
        });
        return;
      }

      popupRef.current = popup;

      // Monitor popup closing
      popupMonitorRef.current = window.setInterval(() => {
        if (popup.closed) {
          cleanupPopup();
          setTimeout(() => setIsConnecting(false), 1000);
        }
      }, 500);
    } catch (error) {
      setIsConnecting(false);
      console.error("[useYouTubeOAuth] Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to start authentication",
        variant: "destructive",
      });
    }
  }, [toast, projectId, cleanupPopup]);

  // Cleanup popup when hook unmounts
  useEffect(() => {
    return () => cleanupPopup();
  }, [cleanupPopup]);

  const disconnect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const params = new URLSearchParams({ action: "disconnect" });
        if (projectId) {
          params.set("project_id", projectId);
        }

        await fetch(
          `${SUPABASE_URL}/functions/v1/youtube-oauth?${params.toString()}`,
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
      toast({
        title: "Disconnected",
        description: "Your YouTube account has been disconnected",
      });
    } catch (error) {
      console.error("[useYouTubeOAuth] Disconnect error:", error);
      setConnection(null);
    }
  }, [toast, projectId]);

  return {
    connection,
    isConnecting,
    isLoading,
    isConnected: !!connection,
    connect,
    disconnect,
    channelName: connection?.channel?.name,
    channelPicture: connection?.channel?.picture,
    projectId: connection?.projectId,
  };
};
