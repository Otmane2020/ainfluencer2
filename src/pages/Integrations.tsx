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
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="font-display text-xl font-bold">Integrations</h1>

      {/* Connected Accounts - Compact */}
      <Card>
        <CardContent className="p-4">
          <SocialConnections 
            connections={connections} 
            onConnect={handleConnect}
          />
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-3">
          <Plug className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            YouTube, Pinterest, X coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
