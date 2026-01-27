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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color, description, url")
      .order("name");

    if (data) {
      setProjects(data);
    }
  };

  const handlePostClick = (post: ScheduledPost, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleDayClick = (day: Date, dayPosts: ScheduledPost[]) => {
    setSelectedDate(day);
    if (dayPosts.length === 1) {
      // Only one post - open it directly
      setSelectedPost(dayPosts[0]);
      setIsModalOpen(true);
    } else {
      // Multiple or no posts - open day modal
      setIsDayModalOpen(true);
    }
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
    // Fetch posts for 5 weeks starting from current week
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addWeeks(weekStart, 5);

    let query = supabase
      .from("scheduled_posts")
      .select("*")
      .gte("scheduled_for", weekStart.toISOString())
      .lte("scheduled_for", weekEnd.toISOString())
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
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
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
          <Button size="sm" className="h-9 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Removed info banner for minimalism - project context shows via filter */}

      {/* Calendar */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base capitalize">
              {format(currentMonth, "MMM yyyy", { locale: enUS })}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          {/* Week days header - minimal */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day.charAt(0)}
              </div>
            ))}
          </div>

          {/* Calendar grid - compact for mobile */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, index) => {
              const dayPosts = getPostsForDay(day);
              const isPast = isBefore(day, startOfDay(new Date())) && !isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day, dayPosts)}
                  className={`min-h-[48px] md:min-h-[80px] p-1 rounded transition-colors cursor-pointer hover:ring-2 hover:ring-primary/30 ${
                    isToday(day)
                      ? "bg-primary/10 border border-primary/30"
                      : isPast
                      ? "bg-muted/20 opacity-50"
                      : "bg-muted/30"
                  }`}
                >
                  <span className={`text-xs font-medium ${isToday(day) ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {/* Show dots for posts on mobile, full on desktop */}
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        onClick={(e) => handlePostClick(post, e)}
                        className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full cursor-pointer hover:scale-150 transition-transform"
                        style={{ backgroundColor: getProjectColor(post.project_id) }}
                      />
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">+{dayPosts.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content Suggestions - only when project selected */}
      {selectedProject !== "all" && (
        <ContentSuggestions
          projectId={selectedProject}
          projectContext={getSelectedProjectContext()}
        />
      )}

      {/* Compact Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> Draft
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-accent" /> Scheduled
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-primary" /> Published
        </div>
      </div>

      {/* Day Posts Modal */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "EEEE, MMMM d", { locale: enUS })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedDate && getPostsForDay(selectedDate).length > 0 ? (
              getPostsForDay(selectedDate).map((post) => (
                <div
                  key={post.id}
                  onClick={() => {
                    setIsDayModalOpen(false);
                    setSelectedPost(post);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: getProjectColor(post.project_id) }}
                  >
                    {getContentIcon(post.content_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {post.ai_prompt || post.text_content?.slice(0, 40) || "Untitled post"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.scheduled_for), "HH:mm")}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">
                        {post.status || "draft"}
                      </Badge>
                    </div>
                  </div>
                  {getStatusIcon(post.status || "draft")}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No posts scheduled for this day</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setIsDayModalOpen(false);
                    // Navigate to create new post
                    toast({
                      title: "Coming soon",
                      description: "Quick post creation will be available soon",
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create post
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
