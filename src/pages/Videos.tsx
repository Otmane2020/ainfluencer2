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
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [showPaywall, setShowPaywall] = useState(false);
  const { toast } = useToast();
  const { subscription, canAccessFeature } = useSubscription();

  // Get starting frame URL from search params (for video continuation)
  const startingFrameUrl = searchParams.get("continueFrom") || undefined;

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
    if (!canAccessFeature("video")) {
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
              onVideosGenerated={handleVideosGenerated}
              onTasksUpdated={setGenerationTasks}
              initialStartingFrameUrl={startingFrameUrl}
              onBeforeGenerate={handleBeforeGenerate}
            />
            {generationTasks.length > 0 && (
              <GenerationTracker tasks={generationTasks} />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <VideoPreview
              segments={videoSegments}
              onMerge={handleMergeVideos}
              onDeleteSegment={handleDeleteVideoSegment}
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
