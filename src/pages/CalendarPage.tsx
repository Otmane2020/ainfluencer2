import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMetaOAuth } from "@/hooks/useMetaOAuth";
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
  Sparkles,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaTiktok, FaLinkedinIn, FaYoutube } from "react-icons/fa";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay, addWeeks, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { ScheduledPostModal } from "@/components/ScheduledPostModal";
import { ContentSuggestions } from "@/components/ContentSuggestions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Platform styling with official brand colors
const PLATFORM_STYLES: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  instagram: { 
    icon: <FaInstagram className="h-3 w-3" />, 
    color: "#E4405F",
    bg: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)"
  },
  facebook: { 
    icon: <FaFacebookF className="h-3 w-3" />, 
    color: "#1877F2",
    bg: "#1877F2"
  },
  tiktok: { 
    icon: <FaTiktok className="h-3 w-3" />, 
    color: "#000000",
    bg: "linear-gradient(45deg, #00f2ea 0%, #ff0050 100%)"
  },
  linkedin: { 
    icon: <FaLinkedinIn className="h-3 w-3" />, 
    color: "#0A66C2",
    bg: "#0A66C2"
  },
  youtube: { 
    icon: <FaYoutube className="h-3 w-3" />, 
    color: "#FF0000",
    bg: "#FF0000"
  },
};

interface Project {
  id: string;
  name: string;
  theme_color: string;
  description?: string;
  url?: string;
}

interface Campaign {
  id: string;
  name: string;
  project_id: string;
  campaign_type: string;
  status: string;
  posting_hour: number | null;
  timezone: string | null;
}

interface ScheduledPost {
  id: string;
  project_id: string;
  campaign_id: string | null;
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
  const { isConnected, shareToMeta, connection } = useMetaOAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewStartDate] = useState(new Date()); // Always start from today
  const [projects, setProjects] = useState<Project[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [selectedProject, selectedCampaign]);

  // Reset campaign when project changes
  useEffect(() => {
    setSelectedCampaign("all");
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

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, project_id, campaign_type, status, posting_hour, timezone")
      .order("created_at", { ascending: false });

    if (data) {
      setCampaigns(data);
    }
  };

  // Filter campaigns by selected project
  const filteredCampaigns = selectedProject === "all" 
    ? campaigns 
    : campaigns.filter(c => c.project_id === selectedProject);

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
    // 1. Check Meta connection for Facebook/Instagram
    const platforms = post.platforms || [];
    const metaPlatforms = platforms.filter(p => p === "facebook" || p === "instagram");
    
    if (metaPlatforms.length > 0 && !isConnected) {
      toast({
        title: "Not connected to Meta",
        description: "Go to Integrations to connect your Facebook/Instagram account",
        variant: "destructive",
      });
      return;
    }

    // 2. Validate media_url exists for video posts
    if (post.content_type === "video" && !post.media_url) {
      toast({
        title: "Video not ready",
        description: "Please wait for video generation to complete",
        variant: "destructive",
      });
      return;
    }

    // 3. Instagram REQUIRES media (image or video) - cannot post text only
    if (platforms.includes("instagram") && !post.media_url) {
      toast({
        title: "Instagram requires media",
        description: "Instagram posts must have an image or video. Generate media first or remove Instagram from platforms.",
        variant: "destructive",
      });
      return;
    }

    // 4. Post to each selected Meta platform
    const results: { platform: string; success: boolean; error?: string }[] = [];
    
    for (const platform of metaPlatforms) {
      if (platform === "facebook" || platform === "instagram") {
        const result = await shareToMeta(
          platform,
          post.text_content || "",
          post.content_type === "video" ? post.media_url || undefined : undefined,
          (post.content_type === "image" || post.content_type === "text") ? post.media_url || undefined : undefined
        );
        results.push({ platform, success: result.success, error: result.error });
      }
    }

    // 4. Update database based on results
    const metaResults = results.filter(r => r.platform === "facebook" || r.platform === "instagram");
    const allMetaSuccess = metaResults.length === 0 || metaResults.every(r => r.success);
    const someSuccess = results.some(r => r.success);
    
    const newStatus = allMetaSuccess ? "published" : (someSuccess ? "scheduled" : "failed");
    const errorMessage = !allMetaSuccess 
      ? `Failed: ${results.filter(r => !r.success).map(r => r.platform).join(", ")}`
      : null;

    const { error } = await supabase
      .from("scheduled_posts")
      .update({ 
        status: newStatus,
        published_at: allMetaSuccess ? new Date().toISOString() : null,
        error_message: errorMessage,
      })
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to update post status",
        variant: "destructive",
      });
      return;
    }

    // 5. Show feedback and throw if failed (so modal catches it)
    if (allMetaSuccess && metaResults.length > 0) {
      toast({
        title: "Published!",
        description: `Posted to ${metaResults.map(r => r.platform).join(" & ")}`,
      });
    } else if (someSuccess) {
      toast({
        title: "Partial success",
        description: `Some platforms failed: ${errorMessage}`,
        variant: "destructive",
      });
      throw new Error(errorMessage || "Some platforms failed");
    } else if (metaResults.length === 0) {
      toast({
        title: "Post scheduled ✓",
        description: "No Meta platforms selected",
      });
    } else {
      toast({
        title: "Publishing failed",
        description: errorMessage || "Unable to post to social media",
        variant: "destructive",
      });
      throw new Error(errorMessage || "Publishing failed");
    }
    
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
      // Calendar only shows pending posts (draft/scheduled), not published
      .neq("status", "published")
      .order("scheduled_for");

    if (selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }

    if (selectedCampaign !== "all") {
      query = query.eq("campaign_id", selectedCampaign);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">AutoPost AI</h1>
            <p className="text-sm text-muted-foreground">Scheduled content calendar</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project Filter */}
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

          {/* Campaign Filter */}
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All Campaigns</SelectItem>
              {filteredCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {campaign.campaign_type === "video" ? "🎬" : campaign.campaign_type === "image" ? "🖼️" : "📝"}
                    </span>
                    <span className="truncate max-w-[100px]">{campaign.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" className="h-9 px-3 gradient-primary text-white shadow-glow">
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
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  onClick={() => handleDayClick(day, dayPosts)}
                  className={`min-h-[52px] md:min-h-[85px] p-1.5 rounded-lg transition-all cursor-pointer hover:ring-2 hover:ring-primary/40 hover:scale-[1.02] ${
                    isToday(day)
                      ? "bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/40 shadow-glow"
                      : isPast
                      ? "bg-muted/20 opacity-40"
                      : dayPosts.length > 0
                      ? "bg-card/80 border border-border/50"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[9px] font-medium text-accent bg-accent/20 px-1 rounded">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Styled post indicators */}
                  <div className="flex flex-col gap-1 mt-1">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        onClick={(e) => handlePostClick(post, e)}
                        className="group flex items-center gap-1 p-0.5 rounded cursor-pointer hover:bg-muted/50 transition-all"
                      >
                        {/* Content type icon */}
                        <div 
                          className="h-4 w-4 rounded flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: getProjectColor(post.project_id) }}
                        >
                          {post.content_type === "video" ? (
                            <Video className="h-2.5 w-2.5" />
                          ) : (
                            <ImageIcon className="h-2.5 w-2.5" />
                          )}
                        </div>
                        
                        {/* Platform icons */}
                        <div className="hidden md:flex items-center gap-0.5">
                          {(post.platforms || []).slice(0, 2).map((platform) => {
                            const style = PLATFORM_STYLES[platform];
                            if (!style) return null;
                            return (
                              <div
                                key={platform}
                                className="h-3.5 w-3.5 rounded flex items-center justify-center text-white"
                                style={{ background: style.bg }}
                              >
                                <span className="scale-75">{style.icon}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <span className="text-[9px] font-medium text-muted-foreground pl-0.5">
                        +{dayPosts.length - 2} more
                      </span>
                    )}
                  </div>
                </motion.div>
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
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    setIsDayModalOpen(false);
                    setSelectedPost(post);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-muted/50 cursor-pointer transition-all hover:shadow-lg group"
                >
                  {/* Content type badge */}
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105"
                    style={{ backgroundColor: getProjectColor(post.project_id) }}
                  >
                    {post.content_type === "video" ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {post.ai_prompt || post.text_content?.slice(0, 40) || "Untitled post"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Platform icons */}
                      <div className="flex items-center gap-1">
                        {(post.platforms || []).map((platform) => {
                          const style = PLATFORM_STYLES[platform];
                          if (!style) return null;
                          return (
                            <div
                              key={platform}
                              className="h-5 w-5 rounded-md flex items-center justify-center text-white"
                              style={{ background: style.bg }}
                            >
                              {style.icon}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.scheduled_for), "HH:mm")}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] h-5 px-2 capitalize ${
                          post.status === "scheduled" ? "bg-accent/20 text-accent" :
                          post.status === "published" ? "bg-primary/20 text-primary" :
                          "bg-muted"
                        }`}
                      >
                        {post.status || "draft"}
                      </Badge>
                    </div>
                  </div>
                  {getStatusIcon(post.status || "draft")}
                </motion.div>
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
        onUpdate={fetchPosts}
      />
    </div>
  );
};

export default CalendarPage;
