import { motion } from "framer-motion";
import { Instagram, Facebook, Check, AlertCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        {connections.map((connection, index) => {
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
                <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-green-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Connecté</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConnect(connection.platform)}
                  className="rounded-full"
                >
                  Connecter
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent/10 p-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">
          La publication automatique nécessite une approbation des APIs Meta. 
          Pour l'instant, les posts seront copiés dans votre presse-papiers.
        </p>
      </div>
    </motion.div>
  );
};
