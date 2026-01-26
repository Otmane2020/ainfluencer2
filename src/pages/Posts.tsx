import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AIContentGenerator } from "@/components/AIContentGenerator";
import { PostPreview } from "@/components/PostPreview";
import { SocialConnections } from "@/components/SocialConnections";
import { PostQueue } from "@/components/PostQueue";
import { AvatarManager } from "@/components/AvatarManager";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GeneratedContent {
  text: string;
  imageUrl?: string;
}

interface ScheduledPost {
  id: string;
  content: GeneratedContent;
  scheduledFor?: Date;
  platforms: ("instagram" | "facebook")[];
  status: "draft" | "scheduled" | "published";
}

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

const Posts = () => {
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [connections, setConnections] = useState([
    { platform: "instagram" as const, connected: false },
    { platform: "facebook" as const, connected: false },
    { platform: "linkedin" as const, connected: false },
    { platform: "tiktok" as const, connected: false },
  ]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .order("name");
    if (data) setProjects(data);
  };

  const handleContentGenerated = (content: GeneratedContent) => {
    setGeneratedContent(content);

    const newPost: ScheduledPost = {
      id: Date.now().toString(),
      content,
      platforms: ["instagram", "facebook"],
      status: "draft",
    };
    setScheduledPosts((prev) => [newPost, ...prev]);
  };

  const handleConnect = (platform: "instagram" | "facebook" | "linkedin" | "tiktok") => {
    toast({
      title: "Connexion en cours...",
      description: `Redirection vers ${platform} pour l'authentification`,
    });

    setTimeout(() => {
      setConnections((prev) =>
        prev.map((c) =>
          c.platform === platform
            ? { ...c, connected: true, username: "demo_user" }
            : c
        )
      );
      toast({
        title: "Connecté !",
        description: `Votre compte ${platform} est maintenant lié`,
      });
    }, 1500);
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    try {
      await navigator.clipboard.writeText(post.content.text);
      toast({
        title: "Contenu copié !",
        description: "Collez-le dans votre application Instagram ou Facebook",
      });

      setScheduledPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, status: "published" } : p
        )
      );
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le contenu",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = (id: string) => {
    setScheduledPosts((prev) => prev.filter((p) => p.id !== id));
    toast({
      title: "Post supprimé",
      description: "Le post a été retiré de la file d'attente",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Générateur de posts</h1>
          <p className="text-muted-foreground">
            Créez du contenu texte et image pour vos réseaux
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous les projets" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.theme_color }}
                    />
                    {project.name.slice(0, 30)}{project.name.length > 30 ? "..." : ""}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          <AIContentGenerator onContentGenerated={handleContentGenerated} />

          {generatedContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h3 className="mb-4 font-display text-lg font-semibold">
                Aperçu du post
              </h3>
              <div className="max-w-md">
                <PostPreview content={generatedContent} avatar={avatarUrl} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <AvatarManager
            currentAvatar={avatarUrl}
            onAvatarChange={setAvatarUrl}
          />
          <SocialConnections
            connections={connections}
            onConnect={handleConnect}
          />
          <PostQueue
            posts={scheduledPosts}
            onPublishNow={handlePublishNow}
            onDelete={handleDeletePost}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Posts;
