import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { VideoGenerator, GenerationTask } from "@/components/VideoGenerator";
import { VideoPreview } from "@/components/VideoPreview";
import { GenerationTracker } from "@/components/GenerationTracker";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Cache version — bump this to invalidate stale localStorage prefs
const CACHE_VERSION = "v5-remotion";
const CACHE_VERSION_KEY = "video_generator_cache_version";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [showPaywall, setShowPaywall] = useState(false);
  const { toast } = useToast();
  const { isSubscribed } = useSubscription();

  // Get starting frame URL from search params (for video continuation)
  const startingFrameUrl = searchParams.get("continueFrom") || undefined;

  // 1. Clear stale cache on mount
  useEffect(() => {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (storedVersion !== CACHE_VERSION) {
      // Remove all video generator prefs so stale model IDs don't break anything
      const keysToClear = ["video_generator_prefs", "generation_tasks", "video_generator_cache_version"];
      keysToClear.forEach(k => localStorage.removeItem(k));
      // Also clear any key starting with "video_"
      Object.keys(localStorage)
        .filter(k => k.startsWith("video_") || k.startsWith("remotion_"))
        .forEach(k => localStorage.removeItem(k));
      localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
      console.log("[Videos] Full cache cleared — new version:", CACHE_VERSION);
    }

    // On every mount: clear any "in_progress" or "queued" tasks that were
    // left behind from a previous session (navigation away interrupts polling).
    try {
      const stored = localStorage.getItem("generation_tasks");
      if (stored) {
        const parsed = JSON.parse(stored);
        const cleaned = parsed.filter(
          (t: { status: string }) => t.status === "completed" || t.status === "failed"
        );
        localStorage.setItem("generation_tasks", JSON.stringify(cleaned));
      }
    } catch {
      // Ignore parse errors
    }

    // Also reset local preview state
    setVideoSegments([]);
    setGenerationTasks([]);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Clear the URL param after using it
  useEffect(() => {
    if (startingFrameUrl) {
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [startingFrameUrl, setSearchParams]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .order("name");
    if (data) setProjects(data);
  };

  const handleVideosGenerated = (videos: VideoSegment[]) => {
    setVideoSegments(videos);
    setIsVideoGenerating(false);
    setVideoProgress(0);
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

  // Check if user can generate before proceeding
  const handleBeforeGenerate = (): boolean => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">AI Video</h1>
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
          <div className="space-y-6 lg:col-span-2">
            <VideoGenerator
              onVideosGenerated={handleVideosGenerated}
              onTasksUpdated={setGenerationTasks}
              initialStartingFrameUrl={startingFrameUrl}
              onBeforeGenerate={handleBeforeGenerate}
              onGeneratingChange={(generating, prog) => {
                setIsVideoGenerating(generating);
                setVideoProgress(prog);
              }}
            />
            {generationTasks.length > 0 && (
              <GenerationTracker tasks={generationTasks} />
            )}
          </div>
          <div className="space-y-6">
            <VideoPreview
              segments={videoSegments}
              onMerge={handleMergeVideos}
              onDeleteSegment={handleDeleteVideoSegment}
              isGenerating={isVideoGenerating}
              progress={videoProgress}
            />
          </div>
        </motion.div>
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="video"
        requiredPlan="pro"
      />
    </>
  );
};

export default Videos;
