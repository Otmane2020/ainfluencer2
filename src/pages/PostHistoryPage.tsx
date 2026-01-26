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
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Posts</h1>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="h-9 w-[120px] text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border z-50">
            <SelectItem value="all">All</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: project.theme_color }}
                  />
                  <span className="truncate max-w-[80px]">{project.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ContentHistory
        projectId={selectedProject !== "all" ? selectedProject : undefined}
        onShare={handleShareFromHistory}
        onPreview={(item) => {
          if (item.media_url) {
            window.open(item.media_url, "_blank");
          }
        }}
      />

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
