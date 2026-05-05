import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useTheme } from "@/hooks/useTheme";
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
  Sun,
  Moon,
  Store,
  Camera,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
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
  const { theme, setTheme } = useTheme();
  const { 
    currentPlan, 
    balance, 
    transactions, 
    isLoading: creditsLoading,
    subscription,
  } = useCredits();
  const { isSubscribed, subscription: stripeSubscription } = useSubscription();
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

  // Use Stripe subscription status for accurate plan display
  const effectivePlanName = isSubscribed ? (currentPlan?.name || "Starter") : "Free";
  const effectiveStatus = isSubscribed ? "active" : (stripeSubscription.status === "orphan" ? "invalid" : "inactive");
  const showPrice = isSubscribed;

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
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${isSubscribed ? getPlanGradient(currentPlan?.id || "starter") : "from-gray-400 to-gray-500"}`}>
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{effectivePlanName}</p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${effectiveStatus === "invalid" ? "border-destructive text-destructive" : ""}`}
                  >
                    {effectiveStatus}
                  </Badge>
                </div>
                {showPrice && currentPlan && (
                  <p className="text-sm text-muted-foreground">
                    ${currentPlan.price}{currentPlan.priceUnit}
                  </p>
                )}
                {!isSubscribed && (
                  <p className="text-sm text-muted-foreground">
                    Subscribe to unlock features
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
              {isSubscribed ? "Manage" : "Subscribe"}
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

          {/* Product Shot quota */}
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold">
                {isSubscribed ? "Unlimited" : 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Pro product shots / month</p>
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

      {/* Appearance */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            Appearance
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                theme === "dark"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 hover:border-primary/50"
              }`}
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Moon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium">Dark</span>
              {theme === "dark" && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-primary/30">Active</Badge>
              )}
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                theme === "light"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 hover:border-primary/50"
              }`}
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Sun className="h-4 w-4 text-secondary" />
              </div>
              <span className="text-xs font-medium">Light</span>
              {theme === "light" && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-primary/30">Active</Badge>
              )}
            </button>
          </div>
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

      {/* Connected Stores */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Store className="h-4 w-4 text-primary" />
            Connected stores
          </div>
          <p className="text-xs text-muted-foreground">
            Push generated product shots straight to your storefront.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/integrations")} className="h-9">
              Shopify
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/integrations")} className="h-9">
              WooCommerce
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Shot defaults */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4 text-primary" />
            Product Shot defaults
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Square format (1:1)</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Portrait format (9:16)</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Landscape format (16:9)</span>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto background removal</span>
              <Switch defaultChecked />
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
