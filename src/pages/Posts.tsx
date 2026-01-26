import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AIContentGenerator } from "@/components/AIContentGenerator";
import { PostPreview } from "@/components/PostPreview";
import { SocialConnections } from "@/components/SocialConnections";
import { PostQueue } from "@/components/PostQueue";
import { AvatarManager } from "@/components/AvatarManager";
import { ContentHistory } from "@/components/ContentHistory";
import { SocialShareModal } from "@/components/SocialShareModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, History, Settings2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface ShareContent {
  text?: string;
  mediaUrl?: string;
  type?: "video" | "image" | "text";
}

const Posts = () => {
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [shareModal, setShareModal] = useState<{ open: boolean; content?: ShareContent }>({ open: false });
  const [activeTab, setActiveTab] = useState("create");
  const isMobile = useIsMobile();
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
      title: "Connecting...",
      description: `Redirecting to ${platform} for authentication`,
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
        title: "Connected!",
        description: `Your ${platform} account is now linked`,
      });
    }, 1500);
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    // Open share modal instead of just copying
    setShareModal({
      open: true,
      content: {
        text: post.content.text,
        mediaUrl: post.content.imageUrl,
        type: post.content.imageUrl ? "image" : "text",
      },
    });
  };

  const handleDeletePost = (id: string) => {
    setScheduledPosts((prev) => prev.filter((p) => p.id !== id));
    toast({
      title: "Post deleted",
      description: "The post has been removed from the queue",
    });
  };

  const handleShareFromHistory = (item: any) => {
    setShareModal({
      open: true,
      content: {
        text: item.text_content || item.ai_prompt || "",
        mediaUrl: item.media_url,
        type: item.content_type,
      },
    });
  };

  const handleShareGenerated = () => {
    if (!generatedContent) return;
    setShareModal({
      open: true,
      content: {
        text: generatedContent.text,
        mediaUrl: generatedContent.imageUrl,
        type: generatedContent.imageUrl ? "image" : "text",
      },
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold">Post Generator</h1>
          <p className="text-sm text-muted-foreground">
            Create text and image content for your socials
          </p>
        </div>
        
        {/* Project Selector - Full width on mobile */}
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border z-50">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.theme_color }}
                  />
                  <span className="truncate">
                    {project.name.slice(0, 25)}{project.name.length > 25 ? "..." : ""}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="create" className="flex items-center gap-1.5 text-xs md:text-sm">
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Create</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs md:text-sm">
            <History className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs md:text-sm">
            <Settings2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create" className="mt-0 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 md:space-y-6"
          >
            {/* AI Generator */}
            <AIContentGenerator onContentGenerated={handleContentGenerated} />

            {/* Generated Content Preview */}
            {generatedContent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base md:text-lg font-semibold">
                    Post Preview
                  </h3>
                  <Button
                    size="sm"
                    onClick={handleShareGenerated}
                    className="gradient-primary"
                  >
                    <Share2 className="h-4 w-4 mr-1.5" />
                    Share
                  </Button>
                </div>
                <div className="max-w-full md:max-w-md mx-auto">
                  <PostPreview content={generatedContent} avatar={avatarUrl} />
                </div>
              </motion.div>
            )}

            {/* Post Queue - Always visible */}
            <PostQueue
              posts={scheduledPosts}
              onPublishNow={handlePublishNow}
              onDelete={handleDeletePost}
            />
          </motion.div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-0">
          <ContentHistory
            projectId={selectedProject !== "all" ? selectedProject : undefined}
            onShare={handleShareFromHistory}
            onPreview={(item) => {
              // Could open a preview modal here
              if (item.media_url) {
                window.open(item.media_url, "_blank");
              }
            }}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-0 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <AvatarManager
              currentAvatar={avatarUrl}
              onAvatarChange={setAvatarUrl}
            />
            <SocialConnections
              connections={connections}
              onConnect={handleConnect}
            />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Share Modal */}
      <SocialShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false })}
        content={shareModal.content}
      />
    </div>
  );
};

export default Posts;
