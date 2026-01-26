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
    <div className="space-y-4">
      {/* Minimal Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Videos</h1>
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
            disabled={isLoadingVideos}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingVideos ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Active Generation Tasks - Compact */}
      {activeTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card p-4 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">
              Generating {activeTasks.length} video{activeTasks.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-2">
            {activeTasks.map((task, index) => (
              <motion.div
                key={task.taskId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium truncate">
                      {task.script ? task.script.substring(0, 30) + "..." : `Video ${index + 1}`}
                    </p>
                    <span className="text-xs font-medium text-primary ml-2">
                      {task.progress}%
                    </span>
                  </div>
                  <Progress value={task.progress} className="h-1.5" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Video List */}
      {videoHistory.length === 0 && activeTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">No videos yet</p>
          <Button size="sm" onClick={() => navigate("/videos")}>
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
    </div>
  );
};

export default VideoHistoryPage;
