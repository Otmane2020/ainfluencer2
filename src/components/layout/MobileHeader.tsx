import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { PWAInstallButton } from "@/components/PWAInstall";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Video,
  ImageIcon,
  Settings,
  Clock,
  FileText,
  Plug,
  Image,
  Megaphone,
  Camera,
} from "lucide-react";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "AutoPost AI", url: "/calendar", icon: Calendar },
];

const contentNavItems = [
  { title: "Videos", url: "/videos", icon: Video },
  { title: "Images", url: "/images", icon: Image },
  { title: "Product Shots", url: "/product-shots", icon: Camera, label: "AI Smart" },
  { title: "Posts", url: "/posts", icon: ImageIcon },
];

const historyNavItems = [
  { title: "Video History", url: "/history/videos", icon: Clock },
  { title: "Image History", url: "/history/images", icon: Image },
  { title: "Post History", url: "/history/posts", icon: FileText },
];

const accountNavItems = [
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNavClick = () => {
    setOpen(false);
  };

  const NavSection = ({ title, items }: { title: string; items: typeof mainNavItems }) => (
    <div className="space-y-1">
      <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.title}
          to={item.url}
          end
          onClick={handleNavClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive(item.url)
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-muted"
          }`}
          activeClassName="bg-primary/10 text-primary font-medium"
        >
          <item.icon className="h-5 w-5" />
          <span className="flex items-center gap-2">
            {item.title}
            {"label" in item && (item as { label?: string }).label && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0">
                {(item as { label?: string }).label}
              </Badge>
            )}
          </span>
        </NavLink>
      ))}
    </div>
  );

  return (
    <header className="md:hidden h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden ring-1 ring-border/50 shadow-lg shadow-primary/20">
          <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
        </div>
        <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
      </div>

      {/* Menu Trigger */}
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
              <div>
                <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
                <p className="text-xs text-muted-foreground">Pro Edition</p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100%-80px)]">
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
              <NavSection title="Navigation" items={mainNavItems} />
              <NavSection title="Create" items={contentNavItems} />
              <NavSection title="History" items={historyNavItems} />
              <NavSection title="Account" items={accountNavItems} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full gradient-primary p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                    <span className="text-sm font-bold text-gradient">
                      {profile?.display_name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {profile?.display_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Pro Plan</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              <PWAInstallButton />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
