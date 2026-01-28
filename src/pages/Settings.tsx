import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bell,
  LogOut,
  Loader2,
  Crown,
  Coins,
  Image,
  Video,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreditPacks } from "@/components/CreditPacks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";

const Settings = () => {
  const { profile, signOut } = useAuth();
  const { 
    currentPlan, 
    balance, 
    transactions, 
    isLoading: creditsLoading,
    subscription,
  } = useCredits();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreditPacks, setShowCreditPacks] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

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

  const getPlanGradient = (planId: string) => {
    switch (planId) {
      case "starter": return "from-blue-500 to-cyan-500";
      case "pro": return "from-primary to-secondary";
      case "business": return "from-purple-500 to-pink-500";
      default: return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="font-display text-xl font-bold">Settings</h1>

      {/* Subscription & Credits */}
      <Card className="border-primary/20 overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${getPlanGradient(currentPlan?.id || "starter")}`} />
        <CardContent className="p-4 space-y-4">
          {/* Plan Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${getPlanGradient(currentPlan?.id || "starter")}`}>
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{currentPlan?.name || "Starter"}</p>
                  <Badge variant="outline" className="text-xs">
                    {subscription?.status || "active"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentPlan?.price}€{currentPlan?.priceUnit}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
              Upgrade
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <Separator />

          {/* Credits Balance */}
          <div className="rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Credits</p>
                  <p className="text-2xl font-bold text-gradient">
                    {creditsLoading ? "..." : balance}
                  </p>
                </div>
              </div>
              <Dialog open={showCreditPacks} onOpenChange={setShowCreditPacks}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-primary to-secondary">
                    Buy Credits
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Buy Credits</DialogTitle>
                  </DialogHeader>
                  <CreditPacks />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* AutoPost Limits */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Image className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold">
                  {currentPlan?.limits.autopostImages === -1 ? "∞" : currentPlan?.limits.autopostImages || 30}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Images/day</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Video className="h-4 w-4 text-secondary" />
                <span className="text-lg font-bold">
                  {currentPlan?.limits.autopostVideos === -1 ? "∞" : currentPlan?.limits.autopostVideos || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Videos/day</p>
            </div>
          </div>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Transactions
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {transactions.slice(0, 5).map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {tx.amount > 0 ? (
                          <TrendingUp className="h-4 w-4 text-accent" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-muted-foreground text-xs">
                          {tx.description || tx.type}
                        </span>
                      </div>
                      <span className={tx.amount > 0 ? "text-accent font-medium" : "text-destructive font-medium"}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
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

      {/* Notifications */}
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
