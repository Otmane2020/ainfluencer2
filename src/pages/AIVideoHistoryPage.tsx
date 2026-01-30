import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VideoHistory, VideoHistoryItem } from "@/components/VideoHistory";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

const AIVideoHistoryPage = () => {
  const navigate = useNavigate();
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const { tasks, getPendingTasks, updateTask } = useGenerationTasks();
  const { toast } = useToast();
  const { user } = useAuth();

  // Get all in-progress tasks for AI videos
  const activeTasks = getPendingTasks().filter(t => t.model?.includes("sora") || t.model?.includes("kling"));

  useEffect(() => {
    if (user) {
      fetchProjects();
      loadAIVideos();
    }
  }, [user]);

  // Poll for pending tasks status every 10 seconds
  useEffect(() => {
    if (activeTasks.length === 0) return;

    const pollInterval = setInterval(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return;

      for (const task of activeTasks) {
        try {
          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-video?action=status&taskId=${task.taskId}`,
            {
              method: "GET",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (statusResponse.ok) {
            const status = await statusResponse.json();
            updateTask(task.taskId, {
              status: status.status,
              progress: status.progress || 0,
              finishTime: status.finishTime,
              videoUrl: status.videoUrl,
            });

            if (status.status === "completed") {
              loadAIVideos();
              toast({
                title: "AI Video ready!",
                description: "Your AI video has been generated successfully",
              });
            }
          }
        } catch (error) {
          console.error("Status check error:", error);
        }
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [activeTasks, updateTask]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .eq("user_id", user.id)
      .order("name");
    if (data) setProjects(data);
  };

  const loadAIVideos = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch AI videos from generations table - filter for AI video types
      const { data, error } = await supabase
        .from("generations")
        .select("id, type, status, media_url, script, duration, model, prompt, created_at, thumbnail_url, project_id")
        .eq("type", "video")
        .eq("user_id", user.id)
        .in("status", ["completed", "ready"])
        .or("model.ilike.%sora%,model.ilike.%kling%")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching AI videos:", error);
        return;
      }

      if (data) {
        const videos: VideoHistoryItem[] = data
          .filter(gen => gen.media_url)
          .map(gen => ({
            id: gen.id,
            title: `AI Video - ${gen.model || "Sora-2"}`,
            script: gen.script || gen.prompt || "AI generated video",
            duration: gen.duration || 0,
            videoUrl: gen.media_url!,
            thumbnailUrl: gen.thumbnail_url || undefined,
            createdAt: new Date(gen.created_at),
            voice: gen.model || "Sora-2",
            status: "ready" as const,
          }));

        setVideoHistory(videos);
      }
    } catch (error) {
      console.error("Error loading AI videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshVideos = async () => {
    await loadAIVideos();
    toast({
      title: "Refreshed",
      description: `Found ${videoHistory.length} AI videos`,
    });
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const { error: dbError } = await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      if (dbError) {
        console.error("DB delete error:", dbError);
      }

      const video = videoHistory.find(v => v.id === id);
      if (video?.videoUrl?.includes("supabase.co/storage")) {
        try {
          const urlParts = video.videoUrl.split("/media/");
          if (urlParts[1]) {
            await supabase.storage.from("media").remove([urlParts[1]]);
          }
        } catch (storageErr) {
          console.error("Storage delete error:", storageErr);
        }
      }

      setVideoHistory((prev) => prev.filter((v) => v.id !== id));
      toast({
        title: "Video deleted",
        description: "AI video has been removed from history",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const handlePlayHistoryItem = (video: VideoHistoryItem) => {
    console.log("Playing AI video:", video.id);
  };

  const handleThumbnailGenerated = (id: string, thumbnailUrl: string) => {
    setVideoHistory((prev) =>
      prev.map((v) => (v.id === id ? { ...v, thumbnailUrl } : v))
    );
  };

  const handleContinueVideo = (videoUrl: string) => {
    navigate(`/ai-video?continueFrom=${encodeURIComponent(videoUrl)}`);
    toast({
      title: "Continue video",
      description: "Redirecting to AI video generator...",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold">AI Videos</h1>
          <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">Sora-2</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.theme_color }}
                    />
                    <span className="truncate max-w-[100px]">{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshVideos}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Video List with Generating Tasks */}
      {videoHistory.length === 0 && activeTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">No AI videos yet</p>
          <Button size="sm" onClick={() => navigate("/ai-video")}>
            Create AI Video
          </Button>
        </div>
      ) : (
        <VideoHistory
          videos={videoHistory}
          generatingTasks={activeTasks.map(task => ({
            id: task.id,
            taskId: task.taskId,
            status: task.status,
            progress: task.progress,
            model: task.model,
            duration: task.duration,
            script: task.script,
          }))}
          onDelete={handleDeleteHistoryItem}
          onPlay={handlePlayHistoryItem}
          onThumbnailGenerated={handleThumbnailGenerated}
          onContinueVideo={handleContinueVideo}
        />
      )}
    </div>
  );
};

export default AIVideoHistoryPage;
