import { useState } from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { Menu, LogOut, LayoutDashboard, FolderKanban, Library, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { PWAInstallButton } from "@/components/PWAInstall";
import { CreditsDisplay } from "@/components/CreditsDisplay";

const navItems = [
  { title: "Create", url: "/create", icon: Sparkles },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Library", url: "/history", icon: Library },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/create") {
      return ["/create", "/images", "/videos", "/image-to-video"].includes(location.pathname);
    }
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="md:hidden h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden ring-1 ring-border/50 shadow-lg shadow-primary/20">
          <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
        </div>
        <div>
          <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
          <p className="text-[10px] leading-none text-muted-foreground">Product Motion Studio</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CreditsDisplay compact />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
                  <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
                </div>
                <div className="text-left">
                  <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
                  <p className="text-xs text-muted-foreground font-normal">Create product visuals that move</p>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col h-[calc(100%-80px)]">
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item, index) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                      index === 0
                        ? "gradient-primary text-primary-foreground font-medium mb-3"
                        : isActive(item.url)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                    }`}
                    activeClassName={index === 0 ? "" : "bg-primary/10 text-primary font-medium"}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>

              <div className="p-4 border-t border-border space-y-3">
                <CreditsDisplay />
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full gradient-primary p-[2px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                      <span className="text-sm font-bold text-gradient">
                        {profile?.display_name?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{profile?.display_name || "Creator"}</p>
                    <p className="text-xs text-muted-foreground truncate">ClipMotion</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
                <PWAInstallButton />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
