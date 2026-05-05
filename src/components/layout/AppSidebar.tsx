import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Megaphone,
  CalendarDays,
  Video,
  ImageIcon,
  Settings,
  LogOut,
  Clock,
  FileText,
  Plug,
  Image,
  Camera,
  Sparkles,
  
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Product Shots", url: "/product-shots", icon: Camera, label: "FLAGSHIP" },
  { title: "Projects", url: "/projects", icon: FolderKanban },
];

const contentNavItems = [
  { title: "AI Image", url: "/images", icon: Image },
];

const historyNavItems = [
  { title: "History", url: "/history", icon: Clock },
  { title: "Post History", url: "/history/posts", icon: FileText },
];

const accountNavItems = [
  { title: "Integrations", url: "/integrations", icon: Plug },
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
              <span className="font-display text-xl font-bold text-gradient truncate">
                ClipMotion
              </span>
              <span className="text-xs text-muted-foreground truncate">
                AI Studio
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
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

        <SidebarGroup>
          <SidebarGroupLabel>Create</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {"label" in item && item.label && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0">
                              {item.label}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {historyNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
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

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
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
          {/* Credits Display */}
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
                <p className="font-medium text-sm truncate">
                  {profile?.display_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">Creator</p>
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
