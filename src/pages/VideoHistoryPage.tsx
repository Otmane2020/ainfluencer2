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
import { RefreshCw, Video, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

interface Campaign {
  id: string;
  name: string;
  project_id: string;
}

const VideoHistoryPage = () => {
  const navigate = useNavigate();
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const { fetchStoredVideos, isLoading: isLoadingVideos } = useStoredVideos();
  const { tasks, getPendingTasks, updateTask } = useGenerationTasks();
  const { toast } = useToast();
  const { user } = useAuth();

  // Get all in-progress tasks (queued or in_progress status)
  const activeTasks = getPendingTasks();
  
  // Get completed tasks to merge into history
  const completedTasks = tasks.filter(t => t.status === "completed" && t.videoUrl);

  // Convert completed tasks to VideoHistoryItem format and merge with stored videos
  useEffect(() => {
    const completedVideos: VideoHistoryItem[] = completedTasks.map(task => ({
      id: task.taskId,
      title: `AI Video - ${task.model}`,
      script: task.script || "AI generated video",
      duration: task.duration,
      videoUrl: task.videoUrl,
      createdAt: task.finishTime ? new Date(task.finishTime * 1000) : new Date(),
      voice: task.model,
      status: "ready" as const,
    }));

    if (completedVideos.length > 0) {
      setVideoHistory(prev => {
        // Merge: add completed tasks that don't exist in current history
        const existingIds = new Set(prev.map(v => v.id));
        const newVideos = completedVideos.filter(v => !existingIds.has(v.id));
        if (newVideos.length > 0) {
          return [...newVideos, ...prev];
        }
        return prev;
      });
    }
  }, [completedTasks]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      loadVideos();
    }
  }, [user]);

  // Immediate status check for any pending tasks on mount
  useEffect(() => {
    const checkImmediateStatus = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return;

      for (const task of activeTasks) {
        try {
          console.log("[VideoHistory] Checking status for task:", task.taskId);
          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-sora?action=status&taskId=${task.taskId}`,
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
            console.log("[VideoHistory] Status response:", status);
            updateTask(task.taskId, {
              status: status.status,
              progress: status.progress || 0,
              finishTime: status.finishTime,
              videoUrl: status.videoUrl,
            });

            if (status.status === "completed") {
              loadVideos();
              toast({
                title: "Video ready!",
                description: "Your video has been generated successfully",
              });
            }
          }
        } catch (error) {
          console.error("[VideoHistory] Status check error:", error);
        }
      }
    };

    if (activeTasks.length > 0) {
      checkImmediateStatus();
    }
  }, []); // Only on mount

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
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-sora?action=status&taskId=${task.taskId}`,
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
              loadVideos();
              toast({
                title: "Video ready!",
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
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .eq("user_id", user.id)
      .order("name");
    if (data) setProjects(data);
  };

  const fetchCampaigns = async () => {
    if (!user) return;
    let query = supabase
      .from("campaigns")
      .select("id, name, project_id")
      .eq("user_id", user.id)
      .order("name");
    
    if (selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }
    
    const { data } = await query;
    if (data) setCampaigns(data);
  };

  useEffect(() => {
    fetchCampaigns();
    setSelectedCampaign("all");
  }, [selectedProject, user]);

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

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      // Delete from database (generations table)
      const { error: dbError } = await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      if (dbError) {
        console.error("DB delete error:", dbError);
      }

      // Also try to delete from storage if it's a stored video
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

      // Remove from local state
      setVideoHistory((prev) => prev.filter((v) => v.id !== id));
      toast({
        title: "Video deleted",
        description: "Video has been removed from history",
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

  // Filter videos by campaign
  const filteredVideos = selectedCampaign === "all" 
    ? videoHistory 
    : videoHistory.filter(v => v.campaignId === selectedCampaign);

  return (
    <div className="space-y-4">
      {/* Minimal Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-xl font-bold">Videos</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.theme_color }}
                    />
                    <span className="truncate max-w-[80px]">{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <span className="truncate max-w-[100px]">{campaign.name}</span>
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

      {/* Video List with Generating Tasks */}
      {filteredVideos.length === 0 && activeTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {selectedCampaign !== "all" ? "No videos for this campaign" : "No videos yet"}
          </p>
          <Button size="sm" onClick={() => navigate("/videos")}>
            Create Video
          </Button>
        </div>
      ) : (
        <VideoHistory
          videos={filteredVideos}
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

export default VideoHistoryPage;
