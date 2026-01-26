import { useState, useEffect, useCallback } from "react";
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
    let receivedMessage = false;

    const handleMessage = (event: MessageEvent) => {
      // Security: verify origin
      if (!event.origin.includes("supabase.co") && !event.origin.includes(window.location.hostname)) {
        return;
      }

      console.log("[useMetaOAuth] Received message:", event.data?.type);

      if (event.data?.type === "meta-oauth-success") {
        receivedMessage = true;
        const { user, instagram, hasPageAccess, expiresAt } = event.data;
        
        console.log("[useMetaOAuth] OAuth success for user:", user?.name);

        setConnection({
          user,
          instagram,
          hasPageAccess,
          expiresAt,
        });
        
        setIsConnecting(false);
        
        toast({
          title: "Connected! 🎉",
          description: `Account ${user.name} linked successfully${instagram ? ` (Instagram: @${instagram.username})` : ""}`,
        });
      } else if (event.data?.type === "meta-oauth-error") {
        receivedMessage = true;
        console.error("[useMetaOAuth] OAuth error:", event.data.error);
        setIsConnecting(false);

        let errorMessage = "Unable to connect to Meta";
        const error = event.data.error;

        if (error?.includes("access_denied") || error?.includes("user_denied")) {
          errorMessage = "You declined the required permissions";
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
  }, [toast]);

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

      // Monitor popup closing
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
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
    ) => {
      if (!connection) {
        toast({
          title: "Not connected",
          description: "Connect to Meta to share",
          variant: "destructive",
        });
        return { success: false };
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Not authenticated",
            description: "Please log in to share content",
            variant: "destructive",
          });
          return { success: false };
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
          toast({
            title: "Published! 🎉",
            description: `Content shared on ${platform === "facebook" ? "Facebook" : "Instagram"}`,
          });
          return { success: true, postId: data.postId };
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error("Share error:", error);
        toast({
          title: "Share error",
          description: error instanceof Error ? error.message : "Unable to publish content",
          variant: "destructive",
        });
        return { success: false };
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
