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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Subscription & Credits */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Subscription & Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Pack */}
          <div className="flex items-center justify-between rounded-xl bg-card p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold">{currentPack?.name || "No plan"}</p>
                <p className="text-sm text-muted-foreground">
                  ${currentPack?.price}{currentPack?.priceUnit}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Change Plan
            </Button>
          </div>

          {/* Credits Remaining */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card p-4 border border-border text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Image className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">
                {credits.images}/{currentPack?.included.images || 0}
              </p>
              <p className="text-xs text-muted-foreground">Images</p>
            </div>
            <div className="rounded-xl bg-card p-4 border border-border text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Video className="h-4 w-4 text-secondary" />
              </div>
              <p className="text-2xl font-bold text-secondary">
                {credits.videos}/{currentPack?.included.videos || 0}
              </p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
            <div className="rounded-xl bg-card p-4 border border-border text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold text-accent">
                {credits.influencerVideos}/{currentPack?.included.influencerVideos || 0}
              </p>
              <p className="text-xs text-muted-foreground">AI Influencer</p>
            </div>
          </div>

          <Separator />

          {/* Upgrade CTA */}
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Need more credits? Upgrade to a higher plan!
            </p>
            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              <Crown className="h-4 w-4 mr-2" />
              View Pro & Agency Plans
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full gradient-primary p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                <span className="text-xl font-bold text-gradient">
                  {displayName?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </CardContent>
      </Card>


      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive emails about your publications
              </p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, email: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Report</p>
              <p className="text-sm text-muted-foreground">
                Summary of your performance every week
              </p>
            </div>
            <Switch
              checked={notifications.weekly}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, weekly: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
