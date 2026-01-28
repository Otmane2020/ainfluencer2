import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ImageGenerator } from "@/components/ImageGenerator";
import { ImagePreview } from "@/components/ImagePreview";
import { PaywallGuard } from "@/components/PaywallGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

const Images = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [latestImage, setLatestImage] = useState<GeneratedImage | null>(null);

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

  const handleImageGenerated = (image: GeneratedImage) => {
    setLatestImage(image);
    setGeneratedImages((prev) => [image, ...prev]);
  };

  const handleDeleteImage = (id: string) => {
    setGeneratedImages((prev) => prev.filter((img) => img.id !== id));
    if (latestImage?.id === id) {
      setLatestImage(generatedImages[1] || null);
    }
  };

  return (
    <PaywallGuard feature="images" requiredPlan="starter">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Image Generator</h1>
            <p className="text-muted-foreground">
              Create AI images for your social media
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
          {/* Left Column - Image Generator */}
          <div className="space-y-6 lg:col-span-2">
            <ImageGenerator onImageGenerated={handleImageGenerated} />
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <ImagePreview
              latestImage={latestImage}
              recentImages={generatedImages}
              onDelete={handleDeleteImage}
            />
          </div>
        </motion.div>
      </div>
    </PaywallGuard>
  );
};

export default Images;
