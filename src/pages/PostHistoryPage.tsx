import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PostAgendaView } from "@/components/PostAgendaView";
import { SocialShareModal } from "@/components/SocialShareModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

interface ContentItem {
  id: string;
  content_type: "video" | "image" | "text";
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  ai_prompt: string | null;
  status: string;
  created_at: string;
  platforms: string[] | null;
  campaign_id: string | null;
  campaign?: { name: string } | null;
  project_id: string;
  project?: { name: string } | null;
}

interface ShareContent {
  text?: string;
  mediaUrl?: string;
  type?: "video" | "image" | "text";
}

type TimeRange = "all" | "week" | "month";
type ContentFilter = "all" | "video" | "image" | "text";

const PostHistoryPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareModal, setShareModal] = useState<{ open: boolean; content?: ShareContent }>({ open: false });

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, selectedProject, timeRange, contentFilter]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .eq("user_id", user.id)
      .order("name");
    if (data) setProjects(data);
  };

  const fetchPosts = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from("scheduled_posts")
        .select("id, content_type, text_content, media_url, thumbnail_url, ai_prompt, status, created_at, platforms, campaign_id, project_id, campaigns(name), projects(name)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedProject !== "all") {
        query = query.eq("project_id", selectedProject);
      }

      if (contentFilter !== "all") {
        query = query.eq("content_type", contentFilter);
      }

      // Apply time range filter
      if (timeRange !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        ...item,
        campaign: item.campaigns ? { name: item.campaigns.name } : null,
        project: item.projects ? { name: item.projects.name } : null,
      }));

      setItems(mappedData as ContentItem[]);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareFromHistory = (item: ContentItem) => {
    setShareModal({
      open: true,
      content: {
        text: item.text_content || item.ai_prompt || "",
        mediaUrl: item.media_url || undefined,
        type: item.content_type,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Post History</h1>
            <p className="text-sm text-muted-foreground">{items.length} published posts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.theme_color }}
                    />
                    <span className="truncate max-w-[100px]">{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="h-9 w-[110px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={contentFilter} onValueChange={(v) => setContentFilter(v as ContentFilter)}>
            <SelectTrigger className="h-9 w-[100px] text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agenda View */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-4 md:p-6 shadow-card"
      >
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-20 shrink-0">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-20 h-20 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PostAgendaView
            items={items}
            onShare={handleShareFromHistory}
            onPreview={(item) => {
              if (item.media_url) {
                window.open(item.media_url, "_blank");
              }
            }}
          />
        )}
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
