import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Zap,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

// TikTok icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  theme_color: string | null;
  instagram_enabled: boolean;
  facebook_enabled: boolean;
  linkedin_enabled: boolean;
  tiktok_enabled: boolean;
  posts_per_week: number;
  automation_mode: string;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  content_type: string;
  text_content: string | null;
  scheduled_for: string;
  status: string | null;
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

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editThemeColor, setEditThemeColor] = useState("#6366F1");
  const [editInstagram, setEditInstagram] = useState(true);
  const [editFacebook, setEditFacebook] = useState(true);
  const [editLinkedin, setEditLinkedin] = useState(false);
  const [editTiktok, setEditTiktok] = useState(false);
  const [editPostsPerWeek, setEditPostsPerWeek] = useState(3);
  const [editAutomationMode, setEditAutomationMode] = useState("semi_auto");

  const themeColors = [
    "#F97316", "#EC4899", "#8B5CF6", "#3B82F6", 
    "#10B981", "#F59E0B", "#EF4444", "#6366F1",
  ];

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchPosts();
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
      setEditPostsPerWeek(project.posts_per_week);
      setEditAutomationMode(project.automation_mode);
    }
  }, [project]);

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
    const { data } = await supabase
      .from("scheduled_posts")
      .select("id, content_type, text_content, scheduled_for, status")
      .eq("project_id", id)
      .order("scheduled_for", { ascending: false })
      .limit(5);

    if (data) setPosts(data);
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
          posts_per_week: editPostsPerWeek,
          automation_mode: editAutomationMode,
        })
        .eq("id", project.id);

      if (error) throw error;

      toast({
        title: "Modifications enregistrées ✓",
        description: "Le projet a été mis à jour",
      });

      setEditModalOpen(false);
      fetchProject();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
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

  const platforms = [
    { enabled: project.instagram_enabled, icon: Instagram, name: "Instagram" },
    { enabled: project.facebook_enabled, icon: Facebook, name: "Facebook" },
    { enabled: project.linkedin_enabled, icon: Linkedin, name: "LinkedIn" },
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
                Créé le {format(new Date(project.created_at), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
            <DropdownMenuLabel>Modification rapide</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openEditModal("info")}>
              <FileText className="h-4 w-4 mr-2" />
              Informations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditModal("branding")}>
              <Palette className="h-4 w-4 mr-2" />
              Identité visuelle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditModal("platforms")}>
              <Share2 className="h-4 w-4 mr-2" />
              Plateformes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditModal("automation")}>
              <Zap className="h-4 w-4 mr-2" />
              Automatisation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/projects/new?edit=${id}`)}>
              <Settings className="h-4 w-4 mr-2" />
              Wizard complet
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
            <CardTitle>À propos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {project.description || "Aucune description"}
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

        <Card>
          <CardHeader>
            <CardTitle>Plateformes</CardTitle>
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
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{project.posts_per_week}</span> posts/semaine
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
          <CardTitle>Posts récents</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate(`/calendar?project=${id}`)}>
            <Calendar className="h-4 w-4 mr-2" />
            Voir calendrier
          </Button>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun post programmé pour ce projet
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
                      {post.text_content?.slice(0, 60) || "Post sans contenu"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(post.scheduled_for), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <Badge variant={post.status === "published" ? "default" : "secondary"}>
                    {post.status || "brouillon"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button onClick={() => navigate(`/videos?project=${id}`)}>
          <Video className="h-4 w-4 mr-2" />
          Générer une vidéo
        </Button>
        <Button variant="outline" onClick={() => navigate(`/posts?project=${id}`)}>
          <FileText className="h-4 w-4 mr-2" />
          Créer un post
        </Button>
      </div>

      {/* Quick Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
          </DialogHeader>
          
          <Tabs value={editTab} onValueChange={setEditTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="branding">Style</TabsTrigger>
              <TabsTrigger value="platforms">Réseaux</TabsTrigger>
              <TabsTrigger value="automation">Auto</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom du projet</Label>
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
                <Label htmlFor="edit-url">URL du site</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Couleur du thème</Label>
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
            </TabsContent>

            <TabsContent value="platforms" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-5 w-5" />
                    <span>Instagram</span>
                  </div>
                  <Switch checked={editInstagram} onCheckedChange={setEditInstagram} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Facebook className="h-5 w-5" />
                    <span>Facebook</span>
                  </div>
                  <Switch checked={editFacebook} onCheckedChange={setEditFacebook} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5" />
                    <span>LinkedIn</span>
                  </div>
                  <Switch checked={editLinkedin} onCheckedChange={setEditLinkedin} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TikTokIcon className="h-5 w-5" />
                    <span>TikTok</span>
                  </div>
                  <Switch checked={editTiktok} onCheckedChange={setEditTiktok} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="automation" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-posts">Posts par semaine</Label>
                <Input
                  id="edit-posts"
                  type="number"
                  min={1}
                  max={14}
                  value={editPostsPerWeek}
                  onChange={(e) => setEditPostsPerWeek(parseInt(e.target.value) || 3)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mode d'automatisation</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "manual", label: "Manuel" },
                    { value: "semi_auto", label: "Semi-auto" },
                    { value: "full_auto", label: "Full auto" },
                  ].map((mode) => (
                    <Button
                      key={mode.value}
                      type="button"
                      variant={editAutomationMode === mode.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditAutomationMode(mode.value)}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
