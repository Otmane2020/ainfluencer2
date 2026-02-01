import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LinkedInProfile {
  id: string;
  name: string;
  picture?: string | null;
}

interface LinkedInConnection {
  profile: LinkedInProfile;
  expiresAt: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const useLinkedInOAuth = () => {
  const [connection, setConnection] = useState<LinkedInConnection | null>(null);
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
          `${SUPABASE_URL}/functions/v1/linkedin-oauth?action=status`,
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
            profile: data.profile,
            expiresAt: data.expiresAt,
          });
        }
      } catch (error) {
        console.error("[useLinkedInOAuth] Status check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "linkedin-oauth-success") {
        const { profile } = event.data;
        
        console.log("[useLinkedInOAuth] OAuth success for profile:", profile?.name);

        setConnection({
          profile,
          expiresAt: new Date(Date.now() + 5184000000).toISOString(), // ~60 days
        });
        
        setIsConnecting(false);

        // Close popup reliably (even if the popup didn't auto-close)
        cleanupPopup();
        
        toast({
          title: "LinkedIn Connected! 🎉",
          description: `Profile "${profile.name}" linked successfully`,
        });

        // Force refresh so all pages (dashboard/campaigns/integrations) reflect the new connection.
        // (This app does not use a shared cache for connection state yet.)
        setTimeout(() => window.location.reload(), 300);
      } else if (event.data?.type === "linkedin-oauth-error") {
        console.error("[useLinkedInOAuth] OAuth error:", event.data.error);
        setIsConnecting(false);

        cleanupPopup();

        toast({
          title: "Connection Error",
          description: event.data.error || "Failed to connect to LinkedIn",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast, cleanupPopup]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    console.log("[useLinkedInOAuth] Starting OAuth flow...");

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

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/linkedin-oauth?action=authorize`,
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
        "linkedin-oauth",
        "width=600,height=700,left=100,top=100"
      );

      if (!popup) {
        setIsConnecting(false);
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to connect to LinkedIn",
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
      console.error("[useLinkedInOAuth] Error:", error);
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
          `${SUPABASE_URL}/functions/v1/linkedin-oauth?action=disconnect`,
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
        description: "Your LinkedIn account has been disconnected",
      });
    } catch (error) {
      console.error("[useLinkedInOAuth] Disconnect error:", error);
      setConnection(null);
    }
  }, [toast]);

  return {
    connection,
    isConnecting,
    isLoading,
    isConnected: !!connection,
    connect,
    disconnect,
    profileName: connection?.profile?.name,
    profilePicture: connection?.profile?.picture,
  };
};