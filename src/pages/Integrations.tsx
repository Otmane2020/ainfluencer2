import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Plug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SocialConnections } from "@/components/SocialConnections";

const Integrations = () => {
  const { toast } = useToast();

  const [connections, setConnections] = useState([
    { platform: "instagram" as const, connected: false },
    { platform: "facebook" as const, connected: false },
    { platform: "linkedin" as const, connected: false },
    { platform: "tiktok" as const, connected: false },
  ]);

  const handleConnect = (platform: "instagram" | "facebook" | "linkedin" | "tiktok") => {
    if (platform === "linkedin") {
      toast({
        title: "LinkedIn",
        description: "LinkedIn connection coming soon",
      });
    } else if (platform === "tiktok") {
      toast({
        title: "TikTok",
        description: "TikTok connection coming soon",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts for direct publishing
        </p>
      </div>

      {/* Connected Accounts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SocialConnections 
              connections={connections} 
              onConnect={handleConnect}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Future Integrations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Plug className="h-5 w-5" />
              More Integrations Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We're working on adding more integrations like YouTube, Pinterest, Twitter/X, and more.
              Stay tuned for updates!
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Integrations;
