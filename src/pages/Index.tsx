import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { StatsOverview } from "@/components/StatsOverview";
import { AIContentGenerator } from "@/components/AIContentGenerator";
import { PostPreview } from "@/components/PostPreview";
import { SocialConnections } from "@/components/SocialConnections";
import { PostQueue } from "@/components/PostQueue";
import { VideoGenerator } from "@/components/VideoGenerator";
import { VideoPreview } from "@/components/VideoPreview";
import { AvatarManager } from "@/components/AvatarManager";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Video } from "lucide-react";

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

interface VideoSegment {
  id: string;
  script: string;
  duration: number;
  status: "pending" | "generating" | "ready" | "error";
  videoUrl?: string;
  audioUrl?: string;
}

const Index = () => {
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("posts");
  const [connections, setConnections] = useState([
    { platform: "instagram" as const, connected: false },
    { platform: "facebook" as const, connected: false },
  ]);
  const { toast } = useToast();

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

  const handleConnect = (platform: "instagram" | "facebook") => {
    toast({
      title: "Connexion en cours...",
      description: `Redirection vers ${platform === "instagram" ? "Instagram" : "Facebook"} pour l'authentification`,
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
        description: `Votre compte ${platform === "instagram" ? "Instagram" : "Facebook"} est maintenant lié`,
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

  const handleVideosGenerated = (videos: VideoSegment[]) => {
    setVideoSegments(videos);
  };

  const handleMergeVideos = () => {
    toast({
      title: "Fusion en cours...",
      description: "Les vidéos sont en cours de fusion",
    });
    // In real implementation, this would call a video merging API
  };

  const handleDeleteVideoSegment = (id: string) => {
    setVideoSegments((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="font-display text-3xl font-bold mb-2">
            Bonjour, <span className="text-gradient">Créateur</span> 👋
          </h2>
          <p className="text-muted-foreground">
            Prêt à créer du contenu viral aujourd'hui ?
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8">
          <StatsOverview />
        </div>

        {/* Content Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Vidéos
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="posts" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-3"
              >
                {/* Left Column - Generator & Preview */}
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

                {/* Right Column - Connections & Queue */}
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
            </TabsContent>

            <TabsContent value="videos" className="mt-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-3"
              >
                {/* Left Column - Video Generator */}
                <div className="space-y-6 lg:col-span-2">
                  <VideoGenerator
                    avatarUrl={avatarUrl}
                    onVideosGenerated={handleVideosGenerated}
                  />
                </div>

                {/* Right Column - Avatar & Preview */}
                <div className="space-y-6">
                  <AvatarManager
                    currentAvatar={avatarUrl}
                    onAvatarChange={setAvatarUrl}
                  />
                  <VideoPreview
                    segments={videoSegments}
                    avatarUrl={avatarUrl}
                    onMerge={handleMergeVideos}
                    onDeleteSegment={handleDeleteVideoSegment}
                  />
                </div>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
