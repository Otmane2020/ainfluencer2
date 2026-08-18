import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import {
  Check,
  Coins,
  CreditCard,
  LogOut,
  Mic2,
  Moon,
  Save,
  Sparkles,
  Sun,
  User,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import {
  CLIPMOTION_CREDIT_PACKS,
  CLIPMOTION_PLANS,
  getProductMotionCreditCost,
  getProductVisualCreditCost,
  getVoiceoverCreditCost,
} from "@/lib/clipmotionEconomics";

const Settings = () => {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { balance, transactions, isLoading: creditsLoading } = useCredits();
  const {
    subscription,
    currentPlan,
    isSubscribed,
    openCustomerPortal,
    startCheckout,
  } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
  }, [profile?.display_name]);

  const updateProfile = async () => {
    if (!profile?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", profile.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
    } catch (error) {
      toast({
        title: "Could not update profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const manageBilling = async () => {
    if (!isSubscribed) {
      navigate("/choose-plan");
      return;
    }
    const result = await openCustomerPortal();
    if (!result.success) {
      toast({ title: "Could not open billing", variant: "destructive" });
    }
  };

  const buyCredits = async (packId: string) => {
    setCheckoutId(packId);
    try {
      const result = await startCheckout("credits", { packId });
      if (!result.success) {
        throw new Error(result.error instanceof Error ? result.error.message : "Checkout failed");
      }
    } catch (error) {
      toast({
        title: "Credit purchase failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setCheckoutId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const plan = CLIPMOTION_PLANS.find((item) => item.id === currentPlan.id) || CLIPMOTION_PLANS[0];
  const monthlyAllowance = isSubscribed ? plan.credits : 0;

  const generationExamples = [
    {
      icon: ImageIcon,
      title: "Product visual",
      detail: "720p standard visual",
      credits: getProductVisualCreditCost("720p"),
    },
    {
      icon: Video,
      title: "Product motion",
      detail: "5-second 720p motion",
      credits: getProductMotionCreditCost(5, "720p"),
    },
    {
      icon: Mic2,
      title: "Voiceover",
      detail: "Up to 1,500 characters",
      credits: getVoiceoverCreditCost(1500),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" /> ClipMotion account
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Profile, billing and generation credits.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" /> Plan & billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-bold">{isSubscribed ? plan.name : "No active plan"}</h2>
                    <Badge variant="outline" className={isSubscribed ? "border-primary/20 bg-primary/10 text-primary" : ""}>
                      {isSubscribed ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isSubscribed
                      ? `$${plan.price}${plan.priceUnit} · ${monthlyAllowance} generation credits per month`
                      : "Choose a plan to generate product visuals, motion and voiceovers."}
                  </p>
                  {subscription.subscriptionEnd && isSubscribed && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Next billing date: {new Date(subscription.subscriptionEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button variant="outline" onClick={manageBilling}>
                  {isSubscribed ? "Manage billing" : "Choose a plan"}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {generationExamples.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-border p-4">
                    <item.icon className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                    <p className="mt-2 text-sm font-bold text-primary">{item.credits} credit{item.credits > 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                The exact credit charge is shown before generation. Duration, resolution and provider compute can change the charge.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-primary" /> Credit wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Available balance</p>
                  <p className="mt-1 text-3xl font-bold text-gradient">{creditsLoading ? "—" : balance}</p>
                  <p className="text-xs text-muted-foreground">ClipMotion generation credits</p>
                </div>
                <CreditsDisplay compact />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Top up anytime</p>
                  <span className="text-xs text-muted-foreground">$0.10 / credit</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CLIPMOTION_CREDIT_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      disabled={checkoutId === pack.id}
                      onClick={() => void buyCredits(pack.id)}
                      className="rounded-2xl border border-border p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                    >
                      <p className="font-bold">{pack.credits.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">credits</p>
                      <p className="mt-2 font-semibold text-primary">${pack.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {transactions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-3 text-sm font-semibold">Recent credit activity</p>
                    <div className="space-y-2">
                      {transactions.slice(0, 6).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2.5 text-sm">
                          <div className="min-w-0">
                            <p className="truncate text-xs text-muted-foreground">
                              {transaction.description || transaction.type}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`shrink-0 font-semibold ${transaction.amount >= 0 ? "text-primary" : "text-foreground"}`}>
                            {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  className="mt-2"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
              <Button onClick={updateProfile} disabled={savingProfile} className="w-full">
                <Save className="mr-2 h-4 w-4" /> {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-2 h-4 w-4" /> Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What your plan includes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(isSubscribed ? plan.features : CLIPMOTION_PLANS[0].features.slice(0, 4)).map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
