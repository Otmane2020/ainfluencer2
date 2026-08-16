import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ExternalLink,
  Instagram,
  Facebook,
  Linkedin,
  Calendar,
  Video,
  FileText,
  Settings,
  Loader2,
  Palette,
  Share2,
  ChevronDown,
  Pencil,
  Sparkles,
  Check,
  AlertCircle,
  Link2,
  Brain,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketingContextEditor, MarketingContext } from "@/components/MarketingContextEditor";
import { useYouTubeOAuth } from "@/hooks/useYouTubeOAuth";
import { useTikTokOAuth } from "@/hooks/useTikTokOAuth";

// TikTok icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// Language options for project
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "it", label: "Italian", flag: "🇮🇹" },
  { value: "pt", label: "Portuguese", flag: "🇧🇷" },
];

interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  theme_color: string | null;
  instagram_enabled: boolean;
  facebook_enabled: boolean;
  linkedin_enabled: boolean;
  tiktok_enabled: boolean;
  youtube_enabled: boolean;
  posts_per_week: number;
  automation_mode: string;
  detected_language: string | null;
  ai_context_summary: string | null;
  scraped_markdown: string | null;
  marketing_context: unknown;
  meta_page_id: string | null;
  meta_instagram_id: string | null;
  meta_instagram_username: string | null;
  linkedin_page_url: string | null;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  content_type: string;
  text_content: string | null;
  scheduled_for: string;
  status: string | null;
}

interface MetaConnection {
  id: string;
  fb_user_name: string;
  fb_picture_url: string | null;
  page_id: string | null;
  instagram_id: string | null;
  instagram_username: string | null;
}

interface MetaPage {
  id: string;
  name: string;
  instagram: {
    id: string;
    username: string;
  } | null;
}

interface YouTubeConnectionData {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_picture_url: string | null;
  project_id: string | null;
}

interface LinkedInConnection {
  id: string;
  linkedin_id: string;
  display_name: string;
  avatar_url: string | null;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTab, setEditTab] = useState("info");
  const [isSaving, setIsSaving] = useState(false);
  const [metaConnection, setMetaConnection] = useState<MetaConnection | null>(null);
  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [linkedinConnection, setLinkedinConnection] = useState<LinkedInConnection | null>(null);
  
  // Per-project YouTube OAuth
  const {
    isConnected: isYouTubeConnected,
    isConnecting: isYouTubeConnecting,
    isLoading: isYouTubeLoading,
    connect: connectYouTube,
    disconnect: disconnectYouTube,
    channelName: youtubeChannelName,
    channelPicture: youtubeChannelPicture,
  } = useYouTubeOAuth(id);

  // Per-project TikTok OAuth
  const {
    isConnected: isTikTokConnected,
    isConnecting: isTikTokConnecting,
    isLoading: isTikTokLoading,
    connect: connectTikTok,
    disconnect: disconnectTikTok,
    displayName: tiktokDisplayName,
  } = useTikTokOAuth(id);
  
  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editThemeColor, setEditThemeColor] = useState("#6366F1");
  const [editInstagram, setEditInstagram] = useState(true);
  const [editFacebook, setEditFacebook] = useState(true);
  const [editLinkedin, setEditLinkedin] = useState(false);
  const [editTiktok, setEditTiktok] = useState(false);
  const [editYoutube, setEditYoutube] = useState(false);
  const [editLanguage, setEditLanguage] = useState("en");
  const [editLinkedinPageUrl, setEditLinkedinPageUrl] = useState("");
  const [selectedPublishMode, setSelectedPublishMode] = useState<"auto" | "manual">("manual");

  const themeColors = [
    "#F97316", "#EC4899", "#8B5CF6", "#3B82F6", 
    "#10B981", "#F59E0B", "#EF4444", "#6366F1",
  ];

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchPosts();
      fetchMetaConnection();
      fetchLinkedinConnection();
    }
  }, [id]);

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || "");
      setEditUrl(project.url || "");
      setEditThemeColor(project.theme_color || "#6366F1");
      setEditInstagram(project.instagram_enabled);
      setEditFacebook(project.facebook_enabled);
      setEditLinkedin(project.linkedin_enabled);
      setEditTiktok(project.tiktok_enabled);
      setEditYoutube(project.youtube_enabled);
      setEditLanguage(project.detected_language || "en");
      setEditLinkedinPageUrl(project.linkedin_page_url || "");
      // Load per-project page selection
      setSelectedPageId(project.meta_page_id || null);
    }
  }, [project]);

  const fetchMetaConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("meta_connections")
      .select("id, fb_user_name, fb_picture_url, page_id, instagram_id, instagram_username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setMetaConnection(data);
      // Don't set selectedPageId from global connection - use project-level instead
    }
  };

  // YouTube connection is now handled by useYouTubeOAuth hook

  const fetchLinkedinConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("linkedin_connections")
      .select("id, linkedin_id, display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setLinkedinConnection(data);
    }
  };

  const fetchMetaPages = async () => {
    if (isLoadingPages) return;
    setIsLoadingPages(true);
    setTokenExpired(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoadingPages(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=pages`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();
      
      if (res.ok) {
        setMetaPages(data.pages || []);
        // Project-level selectedPageId is already set from project.meta_page_id on load
      } else {
        // Check for token expiration/authorization errors
        const errorMsg = data.error || "";
        if (errorMsg.includes("access token") || errorMsg.includes("not authorized") || errorMsg.includes("OAuthException")) {
          setTokenExpired(true);
          console.error("Meta token expired or revoked:", errorMsg);
        } else {
          console.error("Error fetching pages:", errorMsg);
        }
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    if (!project) return;
    try {
      const selectedPage = metaPages.find(p => p.id === pageId);
      const instagramId = selectedPage?.instagram?.id || null;
      const instagramUsername = selectedPage?.instagram?.username || null;

      // Save to project (per-project)
      const { error } = await supabase
        .from("projects")
        .update({
          meta_page_id: pageId,
          meta_instagram_id: instagramId,
          meta_instagram_username: instagramUsername,
        })
        .eq("id", project.id);

      if (error) throw error;

      setSelectedPageId(pageId);
      
      // Per-project only — no global meta_connections update

      toast({
        title: "Page selected ✓",
        description: `Now posting to ${selectedPage?.name || pageId}`,
      });
    } catch (error) {
      console.error("Error selecting page:", error);
      toast({
        title: "Error",
        description: "Failed to select page",
        variant: "destructive",
      });
    }
  };

  // Fetch pages when opening platforms tab
  useEffect(() => {
    if (editTab === "platforms" && metaConnection && metaPages.length === 0) {
      fetchMetaPages();
    }
  }, [editTab, metaConnection]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching project:", error);
      navigate("/projects");
      return;
    }

    setProject(data);
    setIsLoading(false);
  };

  const fetchPosts = async () => {
    // Fetch both scheduled (upcoming) and published (recent) posts
    const { data } = await supabase
      .from("scheduled_posts")
      .select("id, content_type, text_content, scheduled_for, status")
      .eq("project_id", id)
      .order("scheduled_for", { ascending: false })
      .limit(10);

    if (data) {
      // Sort: show published first, then by date
      const sorted = data.sort((a, b) => {
        // Published posts first
        if (a.status === "published" && b.status !== "published") return -1;
        if (b.status === "published" && a.status !== "published") return 1;
        // Then by date
        return new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime();
      });
      setPosts(sorted.slice(0, 5));
    }
  };

  const handleSaveChanges = async () => {
    if (!project) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: editName,
          description: editDescription || null,
          url: editUrl || null,
          theme_color: editThemeColor,
          instagram_enabled: editInstagram,
          facebook_enabled: editFacebook,
          linkedin_enabled: editLinkedin,
          tiktok_enabled: editTiktok,
          youtube_enabled: editYoutube,
          detected_language: editLanguage,
          linkedin_page_url: editLinkedinPageUrl || null,
        })
        .eq("id", project.id);

      if (error) throw error;

      toast({
        title: "Changes saved ✓",
        description: "Project has been updated",
      });

      setEditModalOpen(false);
      fetchProject();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Unable to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (tab: string) => {
    setEditTab(tab);
    setEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  // YouTube icon for platforms display
  const YouTubeIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );

  const platforms = [
    { enabled: project.instagram_enabled, icon: Instagram, name: "Instagram" },
    { enabled: project.facebook_enabled, icon: Facebook, name: "Facebook" },
    { enabled: project.linkedin_enabled, icon: Linkedin, name: "LinkedIn" },
    { enabled: project.youtube_enabled, icon: YouTubeIcon, name: "YouTube" },
    { enabled: project.tiktok_enabled, icon: TikTokIcon, name: "TikTok" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: project.theme_color || "#6366F1" }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                Created on {format(new Date(project.created_at), "MMMM d, yyyy", { locale: enUS })}
              </p>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
            <DropdownMenuLabel>Quick edit</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openEditModal("info")}>
              <FileText className="h-4 w-4 mr-2" />
              Information
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditModal("branding")}>
              <Palette className="h-4 w-4 mr-2" />
              Visual identity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditModal("context")}>
              <Brain className="h-4 w-4 mr-2" />
              Marketing Context
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditModal("platforms")}>
              <Share2 className="h-4 w-4 mr-2" />
              Platforms
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/projects/new?edit=${id}`)}>
              <Settings className="h-4 w-4 mr-2" />
              Full wizard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description & URL */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {project.description || "No description"}
            </p>
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {project.url}
              </a>
            )}
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => openEditModal("platforms")}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Platforms</CardTitle>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {platforms.map(({ enabled, icon: Icon, name }) => (
                <Badge
                  key={name}
                  variant={enabled ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {name}
                </Badge>
              ))}
            </div>
            
            {/* Meta Connection Status */}
            {(project.facebook_enabled || project.instagram_enabled) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {metaConnection ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">
                      Meta connected as <span className="font-medium text-foreground">{metaConnection.fb_user_name}</span>
                    </span>
                    {(project.meta_instagram_username || metaConnection?.instagram_username) && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        @{project.meta_instagram_username || metaConnection.instagram_username}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-amber-500">
                      <AlertCircle className="h-3 w-3" />
                      Meta not connected
                    </div>
                    <Link to="/integrations" className="text-xs text-primary hover:underline">
                      Connect
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{project.posts_per_week}</span> posts/week
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                Mode: {project.automation_mode.replace("_", " ")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Posts</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate(`/calendar?project=${id}`)}>
            <Calendar className="h-4 w-4 mr-2" />
            View calendar
          </Button>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No posts scheduled for this project
            </p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  {post.content_type === "video" ? (
                    <Video className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">
                      {post.text_content?.slice(0, 60) || "Post without content"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(post.scheduled_for), "MMM d, yyyy 'at' HH:mm", { locale: enUS })}
                    </p>
                  </div>
                  <Badge variant={post.status === "published" ? "default" : "secondary"}>
                    {post.status || "draft"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button className="gradient-primary" onClick={() => navigate(`/videos?project=${id}`)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate with AI
        </Button>
        <Button variant="outline" onClick={() => navigate(`/videos?project=${id}`)}>
          <Video className="h-4 w-4 mr-2" />
          Generate video
        </Button>
        <Button variant="outline" onClick={() => navigate(`/posts?project=${id}`)}>
          <FileText className="h-4 w-4 mr-2" />
          Create post
        </Button>
      </div>

      {/* Quick Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className={`max-h-[85vh] flex flex-col ${editTab === "context" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          
          <Tabs value={editTab} onValueChange={setEditTab} className="w-full flex flex-col min-h-0 flex-1">
            <TabsList className="grid w-full grid-cols-4 shrink-0">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="branding">Style</TabsTrigger>
              <TabsTrigger value="context">Context</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4 overflow-y-auto max-h-[60vh] pr-1">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Project name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-url">Website URL</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content Language</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  AI-generated content will use this language
                </p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <Button
                      key={lang.value}
                      type="button"
                      variant={editLanguage === lang.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditLanguage(lang.value)}
                      className="min-w-[80px]"
                    >
                      <span className="mr-1">{lang.flag}</span>
                      {lang.label}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 mt-4 overflow-y-auto max-h-[60vh] pr-1">
              <div className="space-y-2">
                <Label>Theme Color</Label>
                <div className="flex flex-wrap gap-2">
                  {themeColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditThemeColor(color)}
                      className={`h-10 w-10 rounded-full border-2 transition-all ${
                        editThemeColor === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Avatar for AI Context */}
              <div className="space-y-2">
                <Label>Brand Avatar</Label>
                <p className="text-xs text-muted-foreground">
                  Optional spokesperson/avatar for AI-generated content
                </p>
                <div className="flex items-center gap-3">
                  {project?.avatar_url ? (
                    <div className="relative">
                      <img 
                        src={project.avatar_url} 
                        alt="Brand avatar" 
                        className="h-16 w-16 rounded-full object-cover border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground"
                        onClick={async () => {
                          await supabase
                            .from("projects")
                            .update({ avatar_url: null })
                            .eq("id", project.id);
                          fetchProject();
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground border-2 border-dashed border-border">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Set avatar in Video Generator
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="context" className="mt-4 overflow-y-auto max-h-[60vh] pr-1">
              {project && (
                <MarketingContextEditor
                  projectId={project.id}
                  projectName={project.name}
                  projectUrl={project.url}
                  projectDescription={project.description}
                  projectLogoUrl={project.logo_url}
                  scrapedMarkdown={project.scraped_markdown}
                  initialContext={project.marketing_context as MarketingContext | null}
                  onSave={async (context) => {
                    await supabase
                      .from("projects")
                      .update({ marketing_context: JSON.parse(JSON.stringify(context)) })
                      .eq("id", project.id);
                    fetchProject();
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="platforms" className="space-y-4 mt-4 overflow-y-auto max-h-[60vh] pr-1">
              <div className="space-y-4">
                {/* Facebook - Connected via Meta */}
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2]">
                        <Facebook className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">Facebook</span>
                        {metaConnection ? (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            Connected as {metaConnection.fb_user_name}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Not connected
                          </div>
                        )}
                      </div>
                    </div>
                    <Switch 
                      checked={editFacebook} 
                      onCheckedChange={setEditFacebook}
                      disabled={!metaConnection}
                    />
                  </div>
                  
                  {/* Page Selector for this project */}
                  {metaConnection && editFacebook && (
                    <div className="pl-10 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Facebook Page for this project</Label>
                        {isLoadingPages ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading pages...
                          </div>
                        ) : tokenExpired ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-destructive">
                              <AlertCircle className="h-4 w-4" />
                              Your Meta connection has expired
                            </div>
                            <Link 
                              to="/integrations" 
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Link2 className="h-3 w-3" />
                              Reconnect in Integrations
                            </Link>
                          </div>
                        ) : metaPages.length > 0 ? (
                          <Select value={selectedPageId || ""} onValueChange={handleSelectPage}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select a page for this project..." />
                            </SelectTrigger>
                            <SelectContent>
                              {metaPages.map((page) => (
                                <SelectItem key={page.id} value={page.id}>
                                  {page.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No pages found. Make sure you have admin access to a Facebook Page.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {!metaConnection && (
                    <Link to="/integrations" className="text-xs text-primary hover:underline flex items-center gap-1 pl-10">
                      <Link2 className="h-3 w-3" />
                      Connect in Integrations
                    </Link>
                  )}
                </div>

                {/* Instagram - Connected via Meta, per-project page selection */}
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]">
                        <Instagram className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">Instagram</span>
                        {project?.meta_instagram_id ? (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            @{project.meta_instagram_username}
                          </div>
                        ) : metaConnection?.instagram_id ? (
                          <div className="flex items-center gap-1 text-xs text-amber-500">
                            <AlertCircle className="h-3 w-3" />
                            Select a page below to link Instagram
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Not connected
                          </div>
                        )}
                      </div>
                    </div>
                    <Switch 
                      checked={editInstagram} 
                      onCheckedChange={setEditInstagram}
                      disabled={!project?.meta_instagram_id && !metaConnection?.instagram_id}
                    />
                  </div>

                  {/* Instagram page selector for this project */}
                  {metaConnection && (
                    <div className="pl-10 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Instagram account for this project</Label>
                        {isLoadingPages ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        ) : metaPages.filter(p => p.instagram).length > 0 ? (
                          <Select 
                            value={selectedPageId || ""} 
                            onValueChange={handleSelectPage}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select Instagram account..." />
                            </SelectTrigger>
                            <SelectContent>
                              {metaPages.filter(p => p.instagram).map((page) => (
                                <SelectItem key={page.id} value={page.id}>
                                  @{page.instagram!.username} ({page.name})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : metaPages.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No Instagram Business accounts linked to your Facebook Pages.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Select a Facebook Page above first.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!metaConnection && (
                    <p className="text-xs text-muted-foreground pl-10">
                      Connect Meta in Integrations to link Instagram
                    </p>
                  )}
                </div>

                {/* LinkedIn - With connection status */}
                <div className={`rounded-lg border p-3 space-y-3 ${!linkedinConnection ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A66C2]">
                        <Linkedin className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">LinkedIn</span>
                        {linkedinConnection ? (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            {linkedinConnection.display_name}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Not connected
                          </div>
                        )}
                      </div>
                    </div>
                    <Switch 
                      checked={editLinkedin} 
                      onCheckedChange={setEditLinkedin}
                      disabled={!linkedinConnection}
                    />
                  </div>
                  {!linkedinConnection && (
                    <Link 
                      to="/integrations" 
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline pl-10"
                    >
                      <Link2 className="h-3 w-3" />
                      Connect in Integrations
                    </Link>
                  )}
                  
                  {/* LinkedIn Page URL */}
                  {linkedinConnection && editLinkedin && (
                    <div className="pl-10 space-y-2">
                      <Label className="text-xs font-medium">LinkedIn Page/Profile URL</Label>
                      <p className="text-xs text-muted-foreground">
                        Used to tag your page in posts and include links
                      </p>
                      <Input
                        value={editLinkedinPageUrl}
                        onChange={(e) => setEditLinkedinPageUrl(e.target.value)}
                        placeholder="https://linkedin.com/company/your-company"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* YouTube - Per-project connection */}
                <div className={`rounded-lg border p-3 space-y-3 ${!isYouTubeConnected ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF0000]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium">YouTube</span>
                        {isYouTubeLoading ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading...
                          </div>
                        ) : isYouTubeConnected ? (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            {youtubeChannelName}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Not connected for this project
                          </div>
                        )}
                      </div>
                    </div>
                    <Switch 
                      checked={editYoutube} 
                      onCheckedChange={setEditYoutube}
                      disabled={!isYouTubeConnected}
                    />
                  </div>
                  
                  {/* Connect/Disconnect buttons */}
                  <div className="pl-10 space-y-2">
                    {isYouTubeConnected ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Videos will be published as YouTube Shorts to this channel.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={disconnectYouTube}
                          className="text-xs h-7"
                        >
                          <LogOut className="h-3 w-3 mr-1" />
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={connectYouTube}
                        disabled={isYouTubeConnecting}
                        className="text-xs h-7"
                      >
                        {isYouTubeConnecting ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3 w-3 mr-1" />
                            Connect YouTube for this project
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* TikTok - Per-project OAuth */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black">
                        <TikTokIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">TikTok</span>
                        {isTikTokConnected && tiktokDisplayName && (
                          <div className="text-xs text-muted-foreground">@{tiktokDisplayName}</div>
                        )}
                        {!isTikTokConnected && (
                          <div className="text-xs text-muted-foreground">Auto-publish videos</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={editTiktok} onCheckedChange={setEditTiktok} />
                    </div>
                  </div>
                  {editTiktok && (
                    <div className="mt-3 pt-3 border-t border-border">
                      {isTikTokLoading ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : isTikTokConnected ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{tiktokDisplayName || "TikTok Account"}</span>
                          </div>
                          <Button variant="outline" size="sm" onClick={disconnectTikTok} className="h-7 text-xs">
                            <LogOut className="h-3 w-3 mr-1" />
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={connectTikTok}
                          disabled={isTikTokConnecting}
                          className="w-full bg-gradient-to-r from-pink-500 to-cyan-400 hover:from-pink-600 hover:to-cyan-500 h-8 text-xs"
                        >
                          {isTikTokConnecting ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <TikTokIcon className="h-3 w-3 mr-1" />
                          )}
                          Connect TikTok
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
