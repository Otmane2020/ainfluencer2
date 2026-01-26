import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ContentHistory } from "@/components/ContentHistory";
import { SocialShareModal } from "@/components/SocialShareModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const PostHistoryPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [shareModal, setShareModal] = useState<{ open: boolean; content?: ShareContent }>({ open: false });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Post History</h1>
          <p className="text-muted-foreground">
            All your generated posts and images
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
      >
        <ContentHistory
          projectId={selectedProject !== "all" ? selectedProject : undefined}
          onShare={handleShareFromHistory}
          onPreview={(item) => {
            if (item.media_url) {
              window.open(item.media_url, "_blank");
            }
          }}
        />
      </motion.div>

      {/* Share Modal */}
      <SocialShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false })}
        content={shareModal.content}
      />
    </div>
  );
};

export default PostHistoryPage;
