import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SupportWidget } from "@/components/SupportWidget";
import { PWAInstallBanner } from "@/components/PWAInstall";

export function AppLayout() {
  const { user, isLoading } = useAuth();
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  // Gate: unsubscribed users must pick a plan first
  useEffect(() => {
    if (!isLoading && !subLoading && user && !isSubscribed) {
      navigate("/choose-plan", { replace: true });
    }
  }, [user, isLoading, subLoading, isSubscribed, navigate]);

  if (isLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isSubscribed) {
    return null;
  }

  // Mobile layout with sheet menu
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <MobileHeader />
      <main className="flex-1 p-3 overflow-x-hidden">
          <Outlet />
        </main>
        <SupportWidget />
        <PWAInstallBanner />
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <main className="flex-1 p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </SidebarInset>
        <SupportWidget />
        <PWAInstallBanner />
      </div>
    </SidebarProvider>
  );
}
