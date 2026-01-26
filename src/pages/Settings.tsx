import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Bell,
  LogOut,
  Loader2,
  Crown,
  Zap,
  Image,
  Video,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PricingPacks } from "@/components/PricingPacks";
import { PRICING_PACKS, PricingPack } from "@/lib/commercialProducts";

const Settings = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });

  const [currentPack] = useState<PricingPack | null>(PRICING_PACKS.find(p => p.id === "starter") || null);
  const [credits] = useState({
    images: 8,
    videos: 1,
    influencerVideos: 0,
  });

  const handleUpdateProfile = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your information has been saved",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Unable to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="font-display text-xl font-bold">Settings</h1>

      {/* Subscription - Compact */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{currentPack?.name || "No plan"}</p>
                <p className="text-xs text-muted-foreground">${currentPack?.price}{currentPack?.priceUnit}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Change</Button>
          </div>

          {/* Credits - Compact */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <Image className="h-3 w-3 text-primary" />
                <span className="text-sm font-bold">{credits.images}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Images</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <Video className="h-3 w-3 text-secondary" />
                <span className="text-sm font-bold">{credits.videos}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Videos</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-accent" />
                <span className="text-sm font-bold">{credits.influencerVideos}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">AI Avatar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile - Compact */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full gradient-primary p-[2px] shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                <span className="text-lg font-bold text-gradient">
                  {displayName?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Label htmlFor="displayName" className="text-xs">Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="h-9"
              />
            </div>
          </div>
          <Button onClick={handleUpdateProfile} disabled={isLoading} className="w-full h-9">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </CardContent>
      </Card>


      {/* Notifications - Compact */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-accent" />
            Notifications
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Email notifications</span>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, email: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Weekly report</span>
              <Switch
                checked={notifications.weekly}
                onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, weekly: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button variant="destructive" onClick={handleSignOut} className="w-full gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
};

export default Settings;
