import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VideoGenerator, GenerationTask } from "@/components/VideoGenerator";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoHistory, VideoHistoryItem } from "@/components/VideoHistory";
import { AvatarManager } from "@/components/AvatarManager";
import { GenerationTracker } from "@/components/GenerationTracker";
import { useStoredVideos } from "@/hooks/useStoredVideos";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoSegment {
  id: string;
  script: string;
  duration: number;
  status: "pending" | "generating" | "ready" | "error";
  videoUrl?: string;
  audioUrl?: string;
}

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

const Videos = () => {
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const { fetchStoredVideos, isLoading: isLoadingVideos } = useStoredVideos();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    loadVideos();
  }, []);

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
    setVideoHistory((prev) => {
      const existingIds = new Set(prev.map((v) => v.videoUrl));
      const newVideos = storedVideos.filter((v) => !existingIds.has(v.videoUrl));
      return [...prev, ...newVideos];
    });
  };

  const handleVideosGenerated = (videos: VideoSegment[]) => {
    setVideoSegments(videos);
    
    const readyVideos = videos.filter((v) => v.status === "ready");
    const historyItems: VideoHistoryItem[] = readyVideos.map((v, index) => ({
      id: `${Date.now()}-${index}`,
      title: `Video ${videoHistory.length + index + 1}`,
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
      title: "Merging...",
      description: "Videos are being merged",
    });
  };

  const handleDeleteVideoSegment = (id: string) => {
    setVideoSegments((prev) => prev.filter((s) => s.id !== id));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Video Generator</h1>
          <p className="text-muted-foreground">
            Create AI videos for your social media
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
        </div>
      </div>

      <motion.div
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

        {/* Right Column */}
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
              <h3 className="font-display text-lg font-semibold">History</h3>
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
            <VideoHistory
              videos={videoHistory}
              onDelete={handleDeleteHistoryItem}
              onPlay={handlePlayHistoryItem}
              onThumbnailGenerated={handleThumbnailGenerated}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Videos;
