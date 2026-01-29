import { useState, useEffect } from "react";
import { Bell, BellRing, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [preferences, setPreferences] = useState({
    postScheduled: true,
    postPublished: true,
    campaignUpdates: true,
    creditAlerts: true,
  });

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        new Notification("ClipMotion", {
          body: "Notifications enabled! You'll receive alerts for your content.",
          icon: "/logo.png",
        });
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive alerts for your content activity.",
        });
      } else if (result === "denied") {
        toast({
          title: "Permission Denied",
          description: "You can enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Preference Updated",
      description: "Your notification preference has been saved.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive alerts about your content and campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            {permission === "granted" ? (
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <BellRing className="h-5 w-5 text-primary" />
              </div>
            ) : permission === "denied" ? (
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <X className="h-5 w-5 text-destructive" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">
                {permission === "granted"
                  ? "Notifications Enabled"
                  : permission === "denied"
                  ? "Notifications Blocked"
                  : "Notifications Not Enabled"}
              </p>
              <p className="text-sm text-muted-foreground">
                {permission === "granted"
                  ? "You'll receive browser notifications"
                  : permission === "denied"
                  ? "Enable in browser settings"
                  : "Enable to get instant alerts"}
              </p>
            </div>
          </div>
          {permission !== "granted" && permission !== "denied" && (
            <Button onClick={requestPermission} className="gradient-primary">
              <Bell className="h-4 w-4 mr-2" />
              Enable
            </Button>
          )}
          {permission === "granted" && (
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <Check className="h-4 w-4" />
              Active
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        {permission === "granted" && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Notification Types
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <Label htmlFor="postScheduled" className="flex-1 cursor-pointer">
                  <span className="font-medium">Scheduled Posts</span>
                  <p className="text-sm text-muted-foreground">When a post is scheduled for publishing</p>
                </Label>
                <Switch
                  id="postScheduled"
                  checked={preferences.postScheduled}
                  onCheckedChange={() => handlePreferenceChange("postScheduled")}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <Label htmlFor="postPublished" className="flex-1 cursor-pointer">
                  <span className="font-medium">Published Content</span>
                  <p className="text-sm text-muted-foreground">When content is successfully published</p>
                </Label>
                <Switch
                  id="postPublished"
                  checked={preferences.postPublished}
                  onCheckedChange={() => handlePreferenceChange("postPublished")}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <Label htmlFor="campaignUpdates" className="flex-1 cursor-pointer">
                  <span className="font-medium">Campaign Updates</span>
                  <p className="text-sm text-muted-foreground">Status changes and completion alerts</p>
                </Label>
                <Switch
                  id="campaignUpdates"
                  checked={preferences.campaignUpdates}
                  onCheckedChange={() => handlePreferenceChange("campaignUpdates")}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <Label htmlFor="creditAlerts" className="flex-1 cursor-pointer">
                  <span className="font-medium">Credit Alerts</span>
                  <p className="text-sm text-muted-foreground">Low balance and usage notifications</p>
                </Label>
                <Switch
                  id="creditAlerts"
                  checked={preferences.creditAlerts}
                  onCheckedChange={() => handlePreferenceChange("creditAlerts")}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;
