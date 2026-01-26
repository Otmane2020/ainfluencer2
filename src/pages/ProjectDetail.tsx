import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchPosts();
    }
  }, [id]);

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
        <Button variant="outline" onClick={() => navigate(`/projects/new?edit=${id}`)}>
          <Settings className="h-4 w-4 mr-2" />
          Modifier
        </Button>
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
    </div>
  );
};

export default ProjectDetail;
