import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Clock,
  Sparkles,
  FolderKanban,
  Scissors,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PWAInstallButton } from "@/components/PWAInstall";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const createNavItem = { title: "AI Studio", url: "/images", icon: Sparkles };

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "ClipMotion AI", url: "/clipmotion", icon: Scissors },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "History", url: "/history", icon: Clock },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-glow">
            <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-display text-xl font-bold text-gradient truncate">ClipMotion</span>
              <span className="text-xs text-muted-foreground truncate">AI Creative Studio</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(createNavItem.url)} tooltip={createNavItem.title}>
                  <NavLink
                    to={createNavItem.url}
                    end
                    className={`flex items-center gap-3 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow transition-opacity hover:opacity-90 ${collapsed ? "justify-center" : ""}`}
                  >
                    <createNavItem.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{createNavItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex flex-col gap-3">
          {!collapsed && <CreditsDisplay />}
          {collapsed && (
            <div className="flex justify-center">
              <CreditsDisplay compact />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full gradient-primary p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                <span className="text-sm font-bold text-gradient">
                  {profile?.display_name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{profile?.display_name || "Creator"}</p>
                <p className="text-xs text-muted-foreground truncate">ClipMotion</p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!collapsed && <PWAInstallButton />}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
