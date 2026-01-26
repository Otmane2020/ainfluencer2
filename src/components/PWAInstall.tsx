import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, X, Bell, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
    return outcome === "accepted";
  };

  return { isInstallable, isInstalled, promptInstall };
}

export const PWAInstallBanner = React.forwardRef<HTMLDivElement>(
  function PWAInstallBannerInner(_, ref) {
    const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
    const [isDismissed, setIsDismissed] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

    useEffect(() => {
      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    }, []);

    const requestNotificationPermission = async () => {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === "granted") {
          new Notification("ClipMotion", {
            body: "Notifications enabled! You'll receive alerts for your posts.",
            icon: "/logo.png",
          });
        }
      }
    };

    if (isDismissed || (!isInstallable && isInstalled)) return null;

    return (
      <AnimatePresence>
        {(isInstallable || notificationPermission === "default") && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
          >
            <Card className="glass border-border shadow-glow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl gradient-primary p-2 shadow-primary">
                      <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <CardTitle className="text-base">ClipMotion</CardTitle>
                      <CardDescription className="text-xs">Install the app</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsDismissed(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isInstallable && (
                  <Button
                    onClick={promptInstall}
                    className="w-full gradient-primary hover:opacity-90"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Install App
                  </Button>
                )}
                
                {notificationPermission === "default" && (
                  <Button
                    variant="outline"
                    onClick={requestNotificationPermission}
                    className="w-full"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Enable Notifications
                  </Button>
                )}
                
                {notificationPermission === "granted" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Notifications enabled
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Smartphone className="h-3 w-3" />
                  <span>Quick access from your home screen</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

PWAInstallBanner.displayName = "PWAInstallBanner";

export function PWAInstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-primary" />
        App installed
      </div>
    );
  }

  if (!isInstallable) return null;

  return (
    <Button onClick={promptInstall} variant="outline" size="sm">
      <Download className="mr-2 h-4 w-4" />
      Install
    </Button>
  );
}
