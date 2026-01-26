import { motion } from "framer-motion";
import { Instagram, Facebook, Check, AlertCircle, Link2, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMetaOAuth } from "@/hooks/useMetaOAuth";

interface SocialConnection {
  platform: "instagram" | "facebook";
  connected: boolean;
  username?: string;
}

interface SocialConnectionsProps {
  connections: SocialConnection[];
  onConnect: (platform: "instagram" | "facebook") => void;
}

export const SocialConnections = ({ connections, onConnect }: SocialConnectionsProps) => {
  const { connection: metaConnection, isConnecting, connect, disconnect, isConnected } = useMetaOAuth();

  const platformConfig = {
    instagram: {
      icon: Instagram,
      name: "Instagram",
      gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
      color: "text-[#E1306C]",
    },
    facebook: {
      icon: Facebook,
      name: "Facebook",
      gradient: "from-[#1877F2] to-[#0D65D9]",
      color: "text-[#1877F2]",
    },
  };

  // Merge local connections with Meta OAuth state
  const mergedConnections = connections.map((conn) => {
    if (isConnected && metaConnection) {
      if (conn.platform === "facebook") {
        return {
          ...conn,
          connected: true,
          username: metaConnection.user.name,
        };
      }
      if (conn.platform === "instagram" && metaConnection.instagram) {
        return {
          ...conn,
          connected: true,
          username: metaConnection.instagram.username,
        };
      }
    }
    return conn;
  });

  const handleConnect = (platform: "instagram" | "facebook") => {
    if (isConnected) {
      // Already connected via Meta OAuth
      onConnect(platform);
    } else {
      // Start Meta OAuth flow
      connect();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-card p-6 shadow-card"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Link2 className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Comptes connectés</h3>
          <p className="text-sm text-muted-foreground">Liez vos réseaux sociaux</p>
        </div>
      </div>

      <div className="space-y-3">
        {mergedConnections.map((connection, index) => {
          const config = platformConfig[connection.platform];
          const Icon = config.icon;

          return (
            <motion.div
              key={connection.platform}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center justify-between rounded-xl border-2 border-border p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{config.name}</p>
                  {connection.connected && connection.username && (
                    <p className="text-sm text-muted-foreground">@{connection.username}</p>
                  )}
                </div>
              </div>

              {connection.connected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1.5 text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Connecté</span>
                  </div>
                  {isConnected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={disconnect}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(connection.platform)}
                  disabled={isConnecting}
                  className="rounded-full"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    "Connecter"
                  )}
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent/10 p-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">
          {isConnected 
            ? "Vos comptes Meta sont connectés. Vous pouvez maintenant partager directement vos vidéos."
            : "Connectez-vous avec Meta pour partager automatiquement sur Facebook et Instagram."
          }
        </p>
      </div>
    </motion.div>
  );
};
