import { useState, useEffect } from "react";
import { useSearchParams } from "@/lib/router-compat";
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
  const [searchParams] = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewStartDate] = useState(new Date()); // Always start from today
  const [projects, setProjects] = useState<Project[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get("project") || "all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>(searchParams.get("campaign") || "all");
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
  }, [selectedProject, selectedCampaign, currentMonth]);

  // Reset campaign when project changes (but not on initial load from URL params)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    setSelectedCampaign("all");
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color, description, url")
      .order("name");

    if (data) {
      setProjects(data as never);
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
    const platforms = post.platforms || [];
    const metaPlatforms = platforms.filter(p => p === "facebook" || p === "instagram");
    const hasLinkedin = platforms.includes("linkedin");
    const hasYoutube = platforms.includes("youtube");
    const hasTiktok = platforms.includes("tiktok");
    
    // 1. Check Meta connection for Facebook/Instagram
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

    // 4. Post to each selected Meta platform (client-side)
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

    // 5. Publish to LinkedIn via server-side edge function
    if (hasLinkedin) {
      try {
        const { data, error } = await supabase.functions.invoke("run-campaigns-cron", {
          body: {
            publishPostId: post.id,
            platformFilter: "linkedin",
          },
        });
        if (error) throw error;
        const linkedinSuccess = data?.linkedinSuccess !== false;
        results.push({ platform: "linkedin", success: linkedinSuccess, error: data?.linkedinError });
      } catch (err) {
        console.error("LinkedIn publish error:", err);
        results.push({ platform: "linkedin", success: false, error: err instanceof Error ? err.message : "LinkedIn publish failed" });
      }
    }

    // 6. Update database based on results
    const successPlatforms = results.filter(r => r.success).map(r => r.platform);
    const failedPlatforms = results.filter(r => !r.success).map(r => r.platform);
    const allSuccess = failedPlatforms.length === 0;
    const someSuccess = successPlatforms.length > 0;
    
    const newStatus = allSuccess ? "published" : (someSuccess ? "published" : "failed");
    const errorMessage = failedPlatforms.length > 0
      ? `Failed: ${failedPlatforms.join(", ")}`
      : null;

    // Update with actually successful platforms
    const updateData: Record<string, unknown> = { 
      status: newStatus,
      published_at: someSuccess ? new Date().toISOString() : null,
      error_message: errorMessage,
    };
    if (successPlatforms.length > 0) {
      updateData.platforms = successPlatforms;
    }

    const { error } = await supabase
      .from("scheduled_posts")
      .update(updateData)
      .eq("id", post.id);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to update post status",
        variant: "destructive",
      });
      return;
    }

    // 7. Show feedback
    if (allSuccess && results.length > 0) {
      toast({
        title: "Published! 🚀",
        description: `Posted to ${successPlatforms.join(" & ")}`,
      });
    } else if (someSuccess) {
      toast({
        title: "Partial success",
        description: `Posted to ${successPlatforms.join(", ")}. ${errorMessage}`,
        variant: "destructive",
      });
    } else if (results.length === 0) {
      // No platforms to publish to - just mark as published
      toast({
        title: "Post marked as published ✓",
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
    // Fetch posts: from today if current month, or full month otherwise
    const isCurrent = startOfMonth(currentMonth).getTime() === startOfMonth(new Date()).getTime();
    const fetchStart = isCurrent ? startOfDay(new Date()) : startOfMonth(currentMonth);
    const fetchEnd = addWeeks(fetchStart, 5);

    let query = supabase
      .from("scheduled_posts")
      .select("*")
      .gte("scheduled_for", fetchStart.toISOString())
      .lte("scheduled_for", fetchEnd.toISOString())
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

  // Calendar grid: start from today (or navigated month's first day if not current month)
  const isCurrentMonth = startOfMonth(currentMonth).getTime() === startOfMonth(new Date()).getTime();
  const calendarStart = isCurrentMonth ? startOfDay(new Date()) : startOfMonth(currentMonth);
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

      {/* Calendar - Light Facebook-style theme */}
      <Card className="overflow-hidden bg-[#F0F2F5] border-0 shadow-xs">
        <CardHeader className="pb-2 px-4 pt-4 bg-white border-b">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </Button>
            <CardTitle className="text-base font-semibold text-gray-900 capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: enUS })}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-3">
          {/* Week days header - only show when grid is week-aligned */}
          {!isCurrentMonth && (
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2 bg-white rounded">
                  {day}
                </div>
              ))}
            </div>
          )}

          {/* Calendar grid - Facebook post cards style */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {days.map((day, index) => {
              const dayPosts = getPostsForDay(day);
              const isPast = isBefore(day, startOfDay(new Date())) && !isToday(day);

              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.008 }}
                  onClick={() => handleDayClick(day, dayPosts)}
                  className={`min-h-[70px] md:min-h-[110px] rounded-xl transition-all cursor-pointer overflow-hidden border-2 ${
                    isToday(day)
                      ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-400 shadow-lg shadow-blue-200/50"
                      : isPast
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-white border-gray-100 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 hover:scale-[1.02]"
                  }`}
                >
                  {/* Day header with gradient */}
                  <div className={`px-2 py-1.5 flex items-center justify-between ${
                    isToday(day) 
                      ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" 
                      : dayPosts.length > 0 
                      ? "bg-gradient-to-r from-violet-100 to-pink-100" 
                      : "bg-gray-50 border-b border-gray-100"
                  }`}>
                    <span className={`text-xs font-bold ${isToday(day) ? "text-white" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isToday(day) ? "bg-white/30 text-white" : "bg-gradient-to-r from-violet-500 to-pink-500 text-white"
                      }`}>
                        {dayPosts.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Mini posts with platform colors */}
                  <div className="p-1.5 space-y-1.5">
                    {dayPosts.slice(0, 2).map((post) => {
                      const platformStyle = post.platforms?.[0] ? PLATFORM_STYLES[post.platforms[0]] : null;
                      return (
                        <div
                          key={post.id}
                          onClick={(e) => handlePostClick(post, e)}
                          className="group rounded-lg p-1.5 hover:scale-[1.02] transition-all cursor-pointer border"
                          style={{ 
                            background: platformStyle ? `linear-gradient(135deg, ${platformStyle.color}10, ${platformStyle.color}05)` : '#f9fafb',
                            borderColor: platformStyle?.color || '#e5e7eb'
                          }}
                        >
                          {/* Time and platform badges */}
                          <div className="flex items-center gap-1.5 mb-1">
                            {/* All platform badges */}
                            <div className="flex -space-x-1 ml-auto">
                              {(post.platforms || []).slice(0, 3).map((platform) => {
                                const style = PLATFORM_STYLES[platform];
                                if (!style) return null;
                                return (
                                  <div
                                    key={platform}
                                    className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-white border border-white"
                                    style={{ background: style.bg }}
                                  >
                                    <span className="scale-[0.5]">{style.icon}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Media preview with colored border */}
                          {post.thumbnail_url || post.media_url ? (
                            <div 
                              className="relative rounded-md overflow-hidden aspect-video"
                              style={{ borderWidth: 2, borderColor: platformStyle?.color || '#e5e7eb', borderStyle: 'solid' }}
                            >
                              <img 
                                src={post.thumbnail_url || post.media_url || ""} 
                                alt="" 
                                className="w-full h-full object-cover"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                              {post.content_type === "video" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div 
                                    className="h-5 w-5 rounded-full flex items-center justify-center"
                                    style={{ background: platformStyle?.bg || 'white' }}
                                  >
                                    <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[8px] text-gray-600 line-clamp-2 leading-tight bg-white/50 rounded p-1">
                              {post.text_content?.slice(0, 40) || post.ai_prompt?.slice(0, 40) || "Post scheduled"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <div className="text-[10px] text-center font-semibold py-1 rounded-md bg-gradient-to-r from-violet-500 to-pink-500 text-white">
                        +{dayPosts.length - 2} more
                      </div>
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


      {/* Day Posts Modal - Facebook style */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#F0F2F5] border-0">
          <DialogHeader className="bg-white -mx-6 -mt-6 px-4 py-3 border-b rounded-t-lg">
            <DialogTitle className="text-gray-900 font-semibold">
              {selectedDate && format(selectedDate, "EEEE, MMMM d", { locale: enUS })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[500px] overflow-y-auto py-2">
            {selectedDate && getPostsForDay(selectedDate).length > 0 ? (
              getPostsForDay(selectedDate).map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setIsDayModalOpen(false);
                    setSelectedPost(post);
                    setIsModalOpen(true);
                  }}
                  className="bg-white rounded-lg shadow-xs hover:shadow-md cursor-pointer transition-all overflow-hidden"
                >
                  {/* Facebook-style post header */}
                  <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white shadow-sm"
                      style={{ background: (post.platforms?.[0] && PLATFORM_STYLES[post.platforms[0]]?.bg) || getProjectColor(post.project_id) }}
                    >
                      {post.platforms?.[0] && PLATFORM_STYLES[post.platforms[0]]?.icon ? (
                        PLATFORM_STYLES[post.platforms[0]].icon
                      ) : (
                        post.content_type === "video" ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {projects.find(p => p.id === post.project_id)?.name || "Post"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(post.scheduled_for), "HH:mm")}</span>
                        <span>•</span>
                        <span className={`font-medium ${
                          post.status === "scheduled" ? "text-blue-500" :
                          post.status === "published" ? "text-green-500" :
                          "text-gray-400"
                        }`}>
                          {post.status || "Draft"}
                        </span>
                      </div>
                    </div>
                    {/* Platform badges */}
                    <div className="flex gap-1">
                      {(post.platforms || []).map((platform) => {
                        const style = PLATFORM_STYLES[platform];
                        if (!style) return null;
                        return (
                          <div
                            key={platform}
                            className="h-7 w-7 rounded-full flex items-center justify-center text-white"
                            style={{ background: style.bg }}
                          >
                            {style.icon}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Post content preview */}
                  {post.text_content && (
                    <p className="px-3 py-2 text-sm text-gray-700 line-clamp-2">
                      {post.text_content}
                    </p>
                  )}
                  
                  {/* Media preview */}
                  {(post.thumbnail_url || post.media_url) && (
                    <div className="relative aspect-video bg-gray-100">
                      <img 
                        src={post.thumbnail_url || post.media_url || ""} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                      {post.content_type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <div className="w-0 h-0 border-l-[16px] border-l-gray-800 border-y-[10px] border-y-transparent ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Facebook-style action bar */}
                  <div className="flex items-center justify-around px-3 py-2 border-t border-gray-100 text-gray-500 text-xs font-medium">
                    <div className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>View</span>
                    </div>
                    <div className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                      <Clock className="h-4 w-4" />
                      <span>Reschedule</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 bg-white rounded-lg">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No posts scheduled</p>
                <p className="text-xs text-gray-400 mt-1">Create a campaign to auto-generate content</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 bg-blue-500 text-white border-0 hover:bg-blue-600"
                  onClick={() => {
                    setIsDayModalOpen(false);
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

      {/* Colorful Legend with Platform Icons */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Platforms */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Platforms</span>
            <div className="flex items-center gap-2">
              {Object.entries(PLATFORM_STYLES).map(([name, style]) => (
                <div key={name} className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${style.color}15` }}>
                  <div 
                    className="h-5 w-5 rounded-full flex items-center justify-center text-white shadow-xs"
                    style={{ background: style.bg }}
                  >
                    {style.icon}
                  </div>
                  <span className="text-[10px] font-medium capitalize hidden sm:inline" style={{ color: style.color }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-500">Draft</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                <span className="text-xs text-gray-500">Scheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
                <span className="text-xs text-gray-500">Published</span>
              </div>
            </div>
          </div>
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
        onUpdate={fetchPosts}
      />
    </div>
  );
};

export default CalendarPage;
