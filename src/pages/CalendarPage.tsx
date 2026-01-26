import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Video,
  ImageIcon,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay, addWeeks, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { ScheduledPostModal } from "@/components/ScheduledPostModal";
import { ContentSuggestions } from "@/components/ContentSuggestions";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  theme_color: string;
  description?: string;
  url?: string;
}

interface ScheduledPost {
  id: string;
  project_id: string;
  user_id: string;
  content_type: string;
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  scheduled_for: string;
  status: string | null;
  platforms: string[] | null;
  ai_prompt: string | null;
  published_at: string | null;
  error_message: string | null;
}

const CalendarPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewStartDate] = useState(new Date()); // Always start from today
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [currentMonth, selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color, description, url")
      .order("name");

    if (data) {
      setProjects(data);
    }
  };

  const handlePostClick = (post: ScheduledPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to delete post",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Post deleted",
      description: "Post has been successfully deleted",
    });
    fetchPosts();
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    const { error } = await supabase
      .from("scheduled_posts")
      .update({ status: "scheduled", scheduled_for: new Date().toISOString() })
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to schedule publication",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Publication scheduled",
      description: "Post will be published shortly",
    });
    fetchPosts();
  };

  const getSelectedProjectContext = () => {
    if (selectedProject === "all") return undefined;
    const project = projects.find((p) => p.id === selectedProject);
    if (!project) return undefined;
    return {
      name: project.name,
      description: project.description,
      url: project.url,
    };
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    let query = supabase
      .from("scheduled_posts")
      .select("*")
      .gte("scheduled_for", start.toISOString())
      .lte("scheduled_for", end.toISOString())
      .order("scheduled_for");

    if (selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }

    const { data } = await query;
    setPosts(data || []);
    setIsLoading(false);
  };

  // Start calendar from today and show 5 weeks
  const calendarStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = addWeeks(calendarStart, 5);
  
  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) =>
      isSameDay(new Date(post.scheduled_for), day)
    );
  };

  const getProjectColor = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.theme_color || "#6366F1";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle2 className="h-3 w-3 text-primary" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      case "scheduled":
        return <Clock className="h-3 w-3 text-accent" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-3 w-3" />;
      case "image":
        return <ImageIcon className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // No empty days needed since we start on Monday
  const emptyDays = 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">AutoPost AI</h1>
          <p className="text-muted-foreground">
            Plan and visualize your publications
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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Info Banner when project selected */}
      {selectedProject !== "all" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: projects.find(p => p.id === selectedProject)?.theme_color || '#6366F1' }}
            >
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">
                {projects.find(p => p.id === selectedProject)?.name || "Project"}
              </p>
              <p className="text-sm text-muted-foreground">
                Generate content suggestions for this project
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: enUS })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first of the month */}
            {Array.from({ length: emptyDays }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] p-2 rounded-lg bg-muted/30"
              />
            ))}

            {/* Actual days */}
            {days.map((day, index) => {
              const dayPosts = getPostsForDay(day);
              const isPast = isBefore(day, startOfDay(new Date())) && !isToday(day);

              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                    isToday(day)
                      ? "border-primary bg-primary/5"
                      : isPast
                      ? "border-transparent bg-muted/30 opacity-60"
                      : "border-transparent bg-muted/50 hover:border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isToday(day) ? "text-primary" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayPosts.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{dayPosts.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handlePostClick(post)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: `${getProjectColor(post.project_id)}20`,
                          borderLeft: `2px solid ${getProjectColor(post.project_id)}`,
                        }}
                      >
                        {getStatusIcon(post.status || "draft")}
                        {getContentIcon(post.content_type)}
                        <span className="truncate flex-1">
                          {post.text_content?.slice(0, 20) || "Post"}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content Suggestions */}
      {selectedProject !== "all" && (
        <ContentSuggestions
          projectId={selectedProject}
          projectContext={getSelectedProjectContext()}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Draft
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          Scheduled
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Published
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Failed
        </div>
      </div>

      {/* Post Detail Modal */}
      <ScheduledPostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPost(null);
        }}
        onDelete={handleDeletePost}
        onPublishNow={handlePublishNow}
      />
    </div>
  );
};

export default CalendarPage;
