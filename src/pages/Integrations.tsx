import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Plug, Instagram, Facebook, Linkedin, Check, AlertCircle, LogOut, Loader2, Clock, ChevronRight, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMetaOAuth } from "@/hooks/useMetaOAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

interface MetaConnectionData {
  fb_user_name: string;
  fb_picture_url: string | null;
  instagram_username: string | null;
  page_id: string | null;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

interface Project {
  id: string;
  name: string;
  theme_color: string | null;
  instagram_enabled: boolean;
  facebook_enabled: boolean;
}

const Integrations = () => {
  const { toast } = useToast();
  const { connection, isConnecting, connect, disconnect, isConnected, isLoading } = useMetaOAuth();
  const [metaConnectionData, setMetaConnectionData] = useState<MetaConnectionData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetchMetaConnection();
    fetchProjects();
  }, [isConnected]);

  const fetchMetaConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("meta_connections")
        .select("fb_user_name, fb_picture_url, instagram_username, page_id, expires_at, created_at, updated_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setMetaConnectionData(data);
      }
    } catch (error) {
      console.error("Error fetching meta connection:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from("projects")
        .select("id, name, theme_color, instagram_enabled, facebook_enabled")
        .order("name", { ascending: true });

      if (data) {
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const platformConfig = {
    facebook: {
      icon: Facebook,
      name: "Facebook",
      gradient: "from-[#1877F2] to-[#0D65D9]",
    },
    instagram: {
      icon: Instagram,
      name: "Instagram",
      gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
    },
    linkedin: {
      icon: Linkedin,
      name: "LinkedIn",
      gradient: "from-[#0A66C2] to-[#004182]",
    },
    tiktok: {
      icon: TikTokIcon,
      name: "TikTok",
      gradient: "from-[#000000] via-[#25F4EE] to-[#FE2C55]",
    },
  };

  const isTokenExpired = metaConnectionData?.expires_at 
    ? new Date(metaConnectionData.expires_at) < new Date()
    : false;

  // Check if "just connected" (within last 5 minutes)
  const isJustConnected = metaConnectionData?.updated_at
    ? (Date.now() - new Date(metaConnectionData.updated_at).getTime()) < 5 * 60 * 1000
    : false;

  const getConnectionAge = () => {
    if (!metaConnectionData?.updated_at) return null;
    return formatDistanceToNow(new Date(metaConnectionData.updated_at), { 
      addSuffix: true, 
      locale: enUS 
    });
  };

  // Projects using Meta platforms
  const projectsWithMeta = projects.filter(p => p.instagram_enabled || p.facebook_enabled);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">Manage your connected social media accounts</p>
      </div>

      {/* Meta (Facebook & Instagram) Connection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1877F2] to-[#E1306C]">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Meta Platforms</CardTitle>
                <CardDescription>Facebook & Instagram</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isJustConnected && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  Just connected
                </Badge>
              )}
              {isConnected && !isJustConnected && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isConnected && metaConnectionData ? (
          <div className="space-y-4">
              {/* Connection Age */}
              {getConnectionAge() && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Connected {getConnectionAge()}
                </div>
              )}

              {/* Facebook Account */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${platformConfig.facebook.gradient}`}>
                    <Facebook className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Facebook</p>
                    <p className="text-xs text-muted-foreground">{metaConnectionData.fb_user_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {metaConnectionData.page_id ? (
                    <Badge variant="secondary" className="text-xs">
                      Page linked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                      No Page
                    </Badge>
                  )}
                  {metaConnectionData.page_id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>

              {/* No Facebook Page Warning */}
              {!metaConnectionData.page_id && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-destructive">
                        No Facebook Page Found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        To publish automatically, you need a <strong>Facebook Page</strong> (not a personal profile). Meta only allows publishing to Pages.
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>Create a Facebook Page if you don't have one</li>
                        <li>Make sure you are an <strong>Admin</strong> of the Page</li>
                        <li>During OAuth, select the Pages you want to grant access to</li>
                      </ul>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { disconnect(); setTimeout(connect, 500); }}
                        className="mt-2"
                      >
                        Reconnect with Pages
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram Account */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${platformConfig.instagram.gradient}`}>
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Instagram</p>
                    {metaConnectionData.instagram_username ? (
                      <p className="text-xs text-muted-foreground">@{metaConnectionData.instagram_username}</p>
                    ) : (
                      <p className="text-xs text-amber-500">No Business account linked</p>
                    )}
                  </div>
                </div>
                {metaConnectionData.instagram_username ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
              </div>

              {/* Instagram Business Account Info */}
              {!metaConnectionData.instagram_username && metaConnectionData.page_id && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Instagram Business Account Required
                      </p>
                      <p className="text-xs text-muted-foreground">
                        To publish automatically to Instagram, you need:
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>An <strong>Instagram Business</strong> or <strong>Creator</strong> account (not Personal)</li>
                        <li>The Instagram account must be <strong>linked to your Facebook Page</strong></li>
                        <li>You must be an <strong>admin</strong> of the Facebook Page</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        After linking your Instagram Business account to your Page, click <strong>Disconnect</strong> below and reconnect.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Token Status */}
              {isTokenExpired && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Your access token has expired. Please reconnect.</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={disconnect}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Meta account to publish directly to Facebook and Instagram
              </p>
              <Button onClick={connect} disabled={isConnecting} className="gradient-primary">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Connect with Meta
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects Using Meta */}
      {isConnected && projectsWithMeta.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Building2 className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Projects Using This Connection</CardTitle>
                <CardDescription>{projectsWithMeta.length} project{projectsWithMeta.length > 1 ? 's' : ''} with Meta platforms enabled</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {projectsWithMeta.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: project.theme_color || "#6366F1" }}
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{project.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {project.facebook_enabled && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          <Facebook className="h-2.5 w-2.5 mr-0.5" />
                          FB
                        </Badge>
                      )}
                      {project.instagram_enabled && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          <Instagram className="h-2.5 w-2.5 mr-0.5" />
                          IG
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Other Platforms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Other Platforms</CardTitle>
          <CardDescription>Manual share options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* LinkedIn */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${platformConfig.linkedin.gradient}`}>
                <Linkedin className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">LinkedIn</p>
                <p className="text-xs text-muted-foreground">Manual share</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Coming soon</Badge>
          </div>

          {/* TikTok */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${platformConfig.tiktok.gradient}`}>
                <TikTokIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">TikTok</p>
                <p className="text-xs text-muted-foreground">Download & share</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">Coming soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-3">
          <Plug className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            YouTube, Pinterest, X coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
