import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface MetaUser {
  id: string;
  name: string;
  picture?: string;
}

interface InstagramAccount {
  id: string;
  username: string;
}

interface MetaConnection {
  accessToken: string;
  expiresAt: number;
  user: MetaUser;
  instagram?: InstagramAccount;
}

const STORAGE_KEY = "meta_oauth_connection";

export const useMetaOAuth = () => {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Load connection from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MetaConnection;
        // Check if token is still valid
        if (parsed.expiresAt > Date.now()) {
          setConnection(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("[useMetaOAuth] Received message:", event.data?.type);
      
      if (event.data?.type === "meta-oauth-success") {
        const { accessToken, expiresIn, user, instagram } = event.data;
        console.log("[useMetaOAuth] OAuth success for user:", user?.name);
        
        const newConnection: MetaConnection = {
          accessToken,
          expiresAt: Date.now() + expiresIn * 1000,
          user,
          instagram,
        };
        setConnection(newConnection);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConnection));
        setIsConnecting(false);
        toast({
          title: "Connecté !",
          description: `Compte ${user.name} lié avec succès`,
        });
      } else if (event.data?.type === "meta-oauth-error") {
        console.error("[useMetaOAuth] OAuth error:", event.data.error);
        setIsConnecting(false);
        
        let errorMessage = "Impossible de se connecter à Meta";
        const error = event.data.error;
        
        // User-friendly error messages
        if (error?.includes("access_denied") || error?.includes("user_denied")) {
          errorMessage = "Vous avez refusé les permissions requises";
        } else if (error?.includes("invalid_client")) {
          errorMessage = "Configuration de l'app Meta incorrecte";
        } else if (error?.includes("redirect_uri")) {
          errorMessage = "URI de redirection non autorisée dans Meta Developer";
        } else if (error) {
          errorMessage = error;
        }
        
        toast({
          title: "Erreur de connexion",
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=authorize`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const data = await response.json();
      console.log("[useMetaOAuth] Authorize response:", data);

      if (!response.ok || data.error) {
        throw new Error(data.message || data.error || "Failed to get auth URL");
      }

      // Open OAuth popup
      const popup = window.open(
        data.authUrl,
        "meta-oauth",
        "width=600,height=700,left=100,top=100"
      );

      // Check if popup was blocked
      if (!popup) {
        setIsConnecting(false);
        toast({
          title: "Popup bloqué",
          description: "Autorisez les popups pour vous connecter à Meta",
          variant: "destructive",
        });
        return;
      }

      // Monitor popup closing
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          // If still connecting after popup closed, it was cancelled
          setTimeout(() => {
            setIsConnecting(false);
          }, 500);
        }
      }, 500);
    } catch (error) {
      setIsConnecting(false);
      console.error("[useMetaOAuth] Error:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de démarrer l'authentification",
        variant: "destructive",
      });
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    setConnection(null);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Déconnecté",
      description: "Votre compte Meta a été déconnecté",
    });
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
          title: "Non connecté",
          description: "Connectez-vous à Meta pour partager",
          variant: "destructive",
        });
        return { success: false };
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=share`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              platform,
              accessToken: connection.accessToken,
              content,
              videoUrl,
              imageUrl,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          toast({
            title: "Publié !",
            description: `Contenu partagé sur ${platform === "facebook" ? "Facebook" : "Instagram"}`,
          });
          return { success: true, postId: data.postId };
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error("Share error:", error);
        toast({
          title: "Erreur de partage",
          description: error instanceof Error ? error.message : "Impossible de publier le contenu",
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
    isConnected: !!connection,
    connect,
    disconnect,
    shareToMeta,
  };
};
