import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MetaUser {
  id?: string;
  name: string;
  picture?: string;
}

interface InstagramAccount {
  id?: string;
  username: string;
}

interface MetaConnection {
  user: MetaUser;
  instagram?: InstagramAccount | null;
  hasPageAccess?: boolean;
  expiresAt: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const useMetaOAuth = () => {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
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

  // Check connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/meta-oauth?action=status`,
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
            user: data.user,
            instagram: data.instagram,
            expiresAt: data.expiresAt,
          });
        }
      } catch (error) {
        console.error("[useMetaOAuth] Status check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  // Listen for OAuth callback messages with origin verification
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: verify origin - allow supabase.co and our app origin
      const allowedOrigins = ["supabase.co", window.location.hostname];
      const isAllowedOrigin = allowedOrigins.some(origin => event.origin.includes(origin));
      
      if (!isAllowedOrigin) {
        console.log("[useMetaOAuth] Ignoring message from:", event.origin);
        return;
      }

      console.log("[useMetaOAuth] Received message:", event.data?.type, "from:", event.origin);

      if (event.data?.type === "meta-oauth-success") {
        const { user, instagram, hasPageAccess, expiresAt, availablePages, selectedPage } = event.data;
        
        console.log("[useMetaOAuth] OAuth success for user:", user?.name, "Pages:", availablePages?.length || 0, "Instagram:", instagram?.username || "none");

        setConnection({
          user,
          instagram,
          hasPageAccess,
          expiresAt,
        });
        
        setIsConnecting(false);

        cleanupPopup();
        
        const instagramInfo = instagram ? ` (Instagram: @${instagram.username})` : 
          (hasPageAccess ? " (No Instagram Business account linked to Page)" : " (No Facebook Page access)");
        
        toast({
          title: "Connected! 🎉",
          description: `Account ${user.name} linked successfully${instagramInfo}`,
        });

        // Refresh parent so all pages reflect the updated connection state.
        setTimeout(() => window.location.reload(), 300);
      } else if (event.data?.type === "meta-oauth-error") {
        console.error("[useMetaOAuth] OAuth error:", event.data.error);
        setIsConnecting(false);

        cleanupPopup();

        let errorMessage = "Unable to connect to Meta";
        const error = event.data.error;

        if (error?.includes("access_denied") || error?.includes("user_denied")) {
          errorMessage = "You declined the required permissions. Please make sure to select at least one Facebook Page.";
        } else if (error?.includes("invalid_client")) {
          errorMessage = "Meta app configuration error";
        } else if (error?.includes("redirect_uri")) {
          errorMessage = "Redirect URI not authorized in Meta Developer";
        } else if (error) {
          errorMessage = error;
        }

        toast({
          title: "Connection error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast, cleanupPopup]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    console.log("[useMetaOAuth] Starting OAuth flow...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/meta-oauth?action=authorize`,
        { headers }
      );

      const data = await response.json();
      console.log("[useMetaOAuth] Authorize response received");

      if (!response.ok || data.error) {
        throw new Error(data.message || data.error || "Failed to get auth URL");
      }

      // Open OAuth popup
      const popup = window.open(
        data.authUrl,
        "meta-oauth",
        "width=600,height=700,left=100,top=100"
      );

      if (!popup) {
        setIsConnecting(false);
        toast({
          title: "Popup blocked",
          description: "Please allow popups to connect to Meta",
          variant: "destructive",
        });
        return;
      }

      popupRef.current = popup;

      // Monitor popup closing
      popupMonitorRef.current = window.setInterval(() => {
        if (popup.closed) {
          cleanupPopup();
          // Wait a bit for any final messages
          setTimeout(() => {
            setIsConnecting(false);
          }, 1000);
        }
      }, 500);
    } catch (error) {
      setIsConnecting(false);
      console.error("[useMetaOAuth] Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to start authentication",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Cleanup popup when hook unmounts
  useEffect(() => {
    return () => cleanupPopup();
  }, [cleanupPopup]);

  const disconnect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await fetch(
          `${SUPABASE_URL}/functions/v1/meta-oauth?action=disconnect`,
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
        description: "Your Meta account has been disconnected",
      });
    } catch (error) {
      console.error("[useMetaOAuth] Disconnect error:", error);
      setConnection(null);
    }
  }, [toast]);

  const shareToMeta = useCallback(
    async (
      platform: "facebook" | "instagram",
      content: string,
      videoUrl?: string,
      imageUrl?: string
    ): Promise<{ success: boolean; postId?: string; error?: string }> => {
      if (!connection) {
        toast({
          title: "Not connected",
          description: "Connect to Meta to share",
          variant: "destructive",
        });
        return { success: false, error: "Not connected to Meta" };
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Not authenticated",
            description: "Please log in to share content",
            variant: "destructive",
          });
          return { success: false, error: "Not authenticated" };
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/meta-oauth?action=share`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              platform,
              content,
              videoUrl,
              imageUrl,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          // Don't show toast here - let the caller (CalendarPage) show feedback
          console.log(`[shareToMeta] Successfully posted to ${platform}:`, data.postId);
          return { success: true, postId: data.postId };
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } catch (error) {
        console.error("Share error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unable to publish content";
        toast({
          title: "Share error",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      }
    },
    [connection, toast]
  );

  return {
    connection,
    isConnecting,
    isLoading,
    isConnected: !!connection,
    connect,
    disconnect,
    shareToMeta,
    // Convenience getters
    userName: connection?.user?.name,
    userPicture: connection?.user?.picture,
    instagramUsername: connection?.instagram?.username,
  };
};
