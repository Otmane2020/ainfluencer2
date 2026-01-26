import { motion } from "framer-motion";
import { Instagram, Facebook, Linkedin, Check, AlertCircle, Link2, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMetaOAuth } from "@/hooks/useMetaOAuth";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

interface SocialConnection {
  platform: "instagram" | "facebook" | "linkedin" | "tiktok";
  connected: boolean;
  username?: string;
}

interface SocialConnectionsProps {
  connections: SocialConnection[];
  onConnect: (platform: "instagram" | "facebook" | "linkedin" | "tiktok") => void;
  onDisconnect?: (platform: "instagram" | "facebook" | "linkedin" | "tiktok") => void;
  compact?: boolean;
}

export const SocialConnections = ({ connections, onConnect, onDisconnect, compact = false }: SocialConnectionsProps) => {
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
    linkedin: {
      icon: Linkedin,
      name: "LinkedIn",
      gradient: "from-[#0A66C2] to-[#004182]",
      color: "text-[#0A66C2]",
    },
    tiktok: {
      icon: TikTokIcon,
      name: "TikTok",
      gradient: "from-[#000000] via-[#25F4EE] to-[#FE2C55]",
      color: "text-foreground",
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

  const handleConnect = (platform: "instagram" | "facebook" | "linkedin" | "tiktok") => {
    if (platform === "linkedin" || platform === "tiktok") {
      // LinkedIn and TikTok need separate OAuth flows
      onConnect(platform);
      return;
    }
    
    if (isConnected) {
      // Already connected via Meta OAuth
      onConnect(platform);
    } else {
      // Start Meta OAuth flow
      connect();
    }
  };

  const handleDisconnect = (platform: "instagram" | "facebook" | "linkedin" | "tiktok") => {
    if (platform === "instagram" || platform === "facebook") {
      // Disconnect Meta OAuth
      disconnect();
    } else if (onDisconnect) {
      onDisconnect(platform);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {mergedConnections.map((connection) => {
          const config = platformConfig[connection.platform];
          const Icon = config.icon;

          return (
            <div
              key={connection.platform}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${config.gradient}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">{config.name}</p>
                  {connection.connected && connection.username && (
                    <p className="text-xs text-muted-foreground">@{connection.username}</p>
                  )}
                </div>
              </div>

              {connection.connected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    <span className="text-xs font-medium">Connected</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDisconnect(connection.platform)}
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(connection.platform)}
                  disabled={isConnecting}
                  className="text-xs h-7"
                >
                  {isConnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-card p-4 md:p-6 shadow-card"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Link2 className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h3 className="font-display text-base md:text-lg font-semibold">Connected Accounts</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Link your social networks</p>
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
              className="flex items-center justify-between rounded-xl border border-border p-3 md:p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient}`}>
                  <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm md:text-base">{config.name}</p>
                  {connection.connected && connection.username && (
                    <p className="text-xs md:text-sm text-muted-foreground">@{connection.username}</p>
                  )}
                </div>
              </div>

              {connection.connected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 md:gap-2 rounded-full bg-green-500/20 px-2 md:px-3 py-1 md:py-1.5 text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="text-xs md:text-sm font-medium">Connected</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => handleDisconnect(connection.platform)}
                  >
                    <LogOut className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(connection.platform)}
                  disabled={isConnecting}
                  className="rounded-full text-xs md:text-sm"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent/10 p-3">
        <AlertCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0 text-accent mt-0.5" />
        <p className="text-xs md:text-sm text-muted-foreground">
          {isConnected 
            ? "Your Meta accounts are connected. You can now share your videos directly."
            : "Connect with Meta to automatically share to Facebook and Instagram."
          }
        </p>
      </div>
    </motion.div>
  );
};
