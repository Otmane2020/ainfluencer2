import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { StatsOverview } from "@/components/StatsOverview";
import { AIContentGenerator } from "@/components/AIContentGenerator";
import { PostPreview } from "@/components/PostPreview";
import { SocialConnections } from "@/components/SocialConnections";
import { PostQueue } from "@/components/PostQueue";
import { VideoGenerator, GenerationTask } from "@/components/VideoGenerator";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoHistory, VideoHistoryItem } from "@/components/VideoHistory";
import { AvatarManager } from "@/components/AvatarManager";
import { GenerationTracker } from "@/components/GenerationTracker";
import { useToast } from "@/hooks/use-toast";
import { useStoredVideos } from "@/hooks/useStoredVideos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ImageIcon, Video, RefreshCw } from "lucide-react";

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
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("posts");
  const [connections, setConnections] = useState([
    { platform: "instagram" as const, connected: false },
    { platform: "facebook" as const, connected: false },
  ]);
  const { toast } = useToast();
  const { fetchStoredVideos, isLoading: isLoadingVideos } = useStoredVideos();

  // Load stored videos on mount
  useEffect(() => {
    const loadVideos = async () => {
      const storedVideos = await fetchStoredVideos();
      if (storedVideos.length > 0) {
        setVideoHistory(storedVideos);
      }
    };
    loadVideos();
  }, []);

  const handleRefreshVideos = async () => {
    const storedVideos = await fetchStoredVideos();
    setVideoHistory((prev) => {
      // Merge with existing, avoiding duplicates
      const existingIds = new Set(prev.map((v) => v.videoUrl));
      const newVideos = storedVideos.filter((v) => !existingIds.has(v.videoUrl));
      return [...prev, ...newVideos];
    });
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
    
    // Add to history
    const readyVideos = videos.filter((v) => v.status === "ready");
    const historyItems: VideoHistoryItem[] = readyVideos.map((v, index) => ({
      id: `${Date.now()}-${index}`,
      title: `Vidéo ${videoHistory.length + index + 1}`,
      script: v.script,
      duration: v.duration,
      videoUrl: v.videoUrl,
      audioUrl: v.audioUrl,
      createdAt: new Date(),
      voice: "Sarah",
      status: "ready" as const,
    }));
    
    if (historyItems.length > 0) {
      setVideoHistory((prev) => [...historyItems, ...prev]);
    }
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

  const handleDeleteHistoryItem = (id: string) => {
    setVideoHistory((prev) => prev.filter((v) => v.id !== id));
    toast({
      title: "Vidéo supprimée",
      description: "La vidéo a été retirée de l'historique",
    });
  };

  const handlePlayHistoryItem = (video: VideoHistoryItem) => {
    console.log("Playing video:", video.id);
  };

  const handleThumbnailGenerated = (id: string, thumbnailUrl: string) => {
    setVideoHistory((prev) =>
      prev.map((v) => (v.id === id ? { ...v, thumbnailUrl } : v))
    );
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

          <TabsContent value="posts" className="mt-6">
            <motion.div
              key="posts-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
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
              key="videos-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-3"
            >
              {/* Left Column - Video Generator */}
              <div className="space-y-6 lg:col-span-2">
                <VideoGenerator
                  avatarUrl={avatarUrl}
                  onVideosGenerated={handleVideosGenerated}
                  onTasksUpdated={setGenerationTasks}
                />
                {generationTasks.length > 0 && (
                  <GenerationTracker tasks={generationTasks} />
                )}
              </div>

              {/* Right Column - Avatar, Preview & History */}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Historique</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshVideos}
                      disabled={isLoadingVideos}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingVideos ? "animate-spin" : ""}`} />
                      Actualiser
                    </Button>
                  </div>
                  <VideoHistory
                    videos={videoHistory}
                    onDelete={handleDeleteHistoryItem}
                    onPlay={handlePlayHistoryItem}
                    onThumbnailGenerated={handleThumbnailGenerated}
                  />
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
