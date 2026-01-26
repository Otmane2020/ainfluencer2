import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { VideoHistory, VideoHistoryItem } from "@/components/VideoHistory";
import { useStoredVideos } from "@/hooks/useStoredVideos";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Video, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

const VideoHistoryPage = () => {
  const navigate = useNavigate();
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const { fetchStoredVideos, isLoading: isLoadingVideos } = useStoredVideos();
  const { tasks: pendingTasks, getPendingTasks, updateTask } = useGenerationTasks();
  const { toast } = useToast();

  const activeTasks = getPendingTasks();

  useEffect(() => {
    fetchProjects();
    loadVideos();
  }, []);

  // Poll for pending tasks status
  useEffect(() => {
    if (activeTasks.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const task of activeTasks) {
        try {
          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-sora?action=status&taskId=${task.taskId}`,
            {
              method: "GET",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

            // If completed, refresh the video list
            if (status.status === "completed") {
              loadVideos();
              toast({
                title: "Video ready! 🎬",
                description: "Your video has been generated successfully",
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
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .order("name");
    if (data) setProjects(data);
  };

  const loadVideos = async () => {
    const storedVideos = await fetchStoredVideos();
    if (storedVideos.length > 0) {
      setVideoHistory(storedVideos);
    }
  };

  const handleRefreshVideos = async () => {
    const storedVideos = await fetchStoredVideos();
    setVideoHistory(storedVideos);
    toast({
      title: "Refreshed",
      description: `Found ${storedVideos.length} videos`,
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setVideoHistory((prev) => prev.filter((v) => v.id !== id));
    toast({
      title: "Video deleted",
      description: "Video has been removed from history",
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

  const handleContinueVideo = (videoUrl: string) => {
    // Navigate to video generator with the video URL as starting frame
    navigate(`/videos?continueFrom=${encodeURIComponent(videoUrl)}`);
    toast({
      title: "Continue video",
      description: "Redirecting to video generator...",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Video History</h1>
          <p className="text-muted-foreground">
            All your generated videos in one place
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All projects</SelectItem>
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshVideos}
            disabled={isLoadingVideos}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingVideos ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Generation Tasks */}
      {activeTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-6 shadow-card border border-primary/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">
                Generating {activeTasks.length} video{activeTasks.length > 1 ? "s" : ""}...
              </h3>
              <p className="text-sm text-muted-foreground">
                Your videos are being created by AI
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {activeTasks.map((task, index) => (
              <motion.div
                key={task.taskId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 rounded-xl bg-muted/50 p-4"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {task.script ? task.script.substring(0, 50) + "..." : `Video ${index + 1}`}
                    </p>
                    <span className="text-sm font-medium text-primary">
                      {task.progress}%
                    </span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.duration}s
                    </span>
                    <span>{task.model}</span>
                    <span className={
                      task.status === "queued" ? "text-muted-foreground" : 
                      task.status === "in_progress" ? "text-primary" : ""
                    }>
                      {task.status === "queued" ? "In queue..." : "Generating..."}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {videoHistory.length === 0 && activeTasks.length === 0 ? (
          <div className="rounded-2xl bg-card p-12 shadow-card text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">No videos yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first video to see it here
            </p>
            <Button onClick={() => navigate("/videos")}>
              Create Video
            </Button>
          </div>
        ) : videoHistory.length > 0 ? (
          <VideoHistory
            videos={videoHistory}
            onDelete={handleDeleteHistoryItem}
            onPlay={handlePlayHistoryItem}
            onThumbnailGenerated={handleThumbnailGenerated}
            onContinueVideo={handleContinueVideo}
          />
        ) : null}
      </motion.div>
    </div>
  );
};

export default VideoHistoryPage;
