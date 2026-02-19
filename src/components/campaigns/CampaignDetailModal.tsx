import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// Tabs removed - merged into single view
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Video, Image as ImageIcon, Layers, Play, Pause, Edit, Calendar, BarChart3, Clock, CheckCircle2, Loader2, Share2, Facebook, Link, ExternalLink, Copy, Rocket, Save, Pencil, Check, X } from "lucide-react";
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from "react-icons/fa";
import { SocialShareModal } from "@/components/SocialShareModal";
interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  videos_per_month: number | null;
  images_per_month: number | null;
  posts_per_week: number | null;
  format: string | null;
  subject: string | null;
  tone: string | null;
  style: string | null;
  total_generated: number | null;
  total_published: number | null;
  created_at: string;
  project_id: string;
  posting_hour: number | null;
  posting_minute?: number | null;
  timezone: string | null;
  instagram_enabled?: boolean | null;
  facebook_enabled?: boolean | null;
  linkedin_enabled?: boolean | null;
  tiktok_enabled?: boolean | null;
  youtube_enabled?: boolean | null;
  projects?: {
    name: string;
    theme_color: string;
  } | null;
}
interface ScheduledPost {
  id: string;
  content_type: string;
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  status: string | null;
  scheduled_for: string;
}
interface CampaignDetailModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}
const campaignTypeConfig = {
  video: {
    icon: Video,
    label: "Video Campaign",
    gradient: "from-violet-500 to-purple-600"
  },
  image: {
    icon: ImageIcon,
    label: "Image Campaign",
    gradient: "from-cyan-500 to-blue-600"
  },
  mixed: {
    icon: Layers,
    label: "Mixed Campaign",
    gradient: "from-pink-500 to-rose-600"
  }
};
const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground"
  },
  active: {
    label: "Active",
    color: "bg-green-500/20 text-green-600"
  },
  paused: {
    label: "Paused",
    color: "bg-amber-500/20 text-amber-600"
  },
  completed: {
    label: "Completed",
    color: "bg-blue-500/20 text-blue-600"
  }
};
const TIMEZONES = [{
  id: "Europe/Paris",
  label: "Paris (CET/CEST)"
}, {
  id: "Europe/London",
  label: "London (GMT/BST)"
}, {
  id: "America/New_York",
  label: "New York (EST/EDT)"
}, {
  id: "America/Los_Angeles",
  label: "Los Angeles (PST/PDT)"
}, {
  id: "Asia/Tokyo",
  label: "Tokyo (JST)"
}, {
  id: "Asia/Dubai",
  label: "Dubai (GST)"
}];
export const CampaignDetailModal = ({
  campaign,
  isOpen,
  onClose,
  onUpdate
}: CampaignDetailModalProps) => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    post?: ScheduledPost;
  }>({
    open: false
  });
  const [localStatus, setLocalStatus] = useState(campaign?.status || "draft");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(campaign?.name || "");

  // Editable settings
  const [postingHour, setPostingHour] = useState(campaign?.posting_hour ?? 10);
  const [postingMinute, setPostingMinute] = useState(campaign?.posting_minute ?? 0);
  const [timezone, setTimezone] = useState(campaign?.timezone || "Europe/Paris");
  
  // Platform toggles
  const [platformsState, setPlatformsState] = useState({
    instagram: campaign?.instagram_enabled ?? true,
    facebook: campaign?.facebook_enabled ?? true,
    linkedin: campaign?.linkedin_enabled ?? false,
    tiktok: campaign?.tiktok_enabled ?? false,
    youtube: campaign?.youtube_enabled ?? false,
  });

  // Sync local state with campaign prop
  useEffect(() => {
    if (campaign) {
      setLocalStatus(campaign.status);
      setPostingHour(campaign.posting_hour ?? 10);
      setPostingMinute(campaign.posting_minute ?? 0);
      setTimezone(campaign.timezone || "Europe/Paris");
      setNewName(campaign.name);
      setIsRenaming(false);
      setPlatformsState({
        instagram: campaign.instagram_enabled ?? true,
        facebook: campaign.facebook_enabled ?? true,
        linkedin: campaign.linkedin_enabled ?? false,
        tiktok: campaign.tiktok_enabled ?? false,
        youtube: campaign.youtube_enabled ?? false,
      });
    }
  }, [campaign]);
  useEffect(() => {
    if (campaign && isOpen) {
      fetchCampaignPosts();
    }
  }, [campaign, isOpen]);
  const fetchCampaignPosts = async () => {
    if (!campaign) return;
    setIsLoadingPosts(true);
    const {
      data,
      error
    } = await supabase.from("scheduled_posts").select("id, content_type, text_content, media_url, thumbnail_url, status, scheduled_for").eq("campaign_id", campaign.id).order("scheduled_for", {
      ascending: true
    }).limit(50);
    if (!error && data) {
      setPosts(data);
    }
    setIsLoadingPosts(false);
  };
  const handleToggleStatus = async () => {
    if (!campaign) return;
    setIsTogglingStatus(true);
    const newStatus = localStatus === "active" ? "paused" : "active";
    const {
      error
    } = await supabase.from("campaigns").update({
      status: newStatus
    }).eq("id", campaign.id);
    if (error) {
      toast({
        title: "Error",
        description: "Unable to update status",
        variant: "destructive"
      });
    } else {
      setLocalStatus(newStatus);
      toast({
        title: newStatus === "active" ? "Campaign activated!" : "Campaign paused"
      });
      onUpdate();
    }
    setIsTogglingStatus(false);
  };
  const handleLaunchNow = async () => {
    if (!campaign) return;
    setIsLaunching(true);
    try {
      // First, activate the campaign if not already
      if (localStatus !== "active") {
        await supabase.from("campaigns").update({
          status: "active"
        }).eq("id", campaign.id);
        setLocalStatus("active");
      }

      // Call the cron function to process immediately
      const {
        data,
        error
      } = await supabase.functions.invoke("run-campaigns-cron", {
        body: {
          campaignId: campaign.id,
          forceRun: true
        }
      });
      if (error) {
        throw error;
      }
      toast({
        title: "Campaign launched! 🚀",
        description: data?.processed ? `${data.processed} post(s) processed immediately` : "Content generation started"
      });
      onUpdate();
      fetchCampaignPosts();
    } catch (error) {
      console.error("Launch error:", error);
      toast({
        title: "Launch failed",
        description: error instanceof Error ? error.message : "Unable to launch campaign",
        variant: "destructive"
      });
    } finally {
      setIsLaunching(false);
    }
  };
  const handleRename = async () => {
    if (!campaign || !newName.trim()) return;
    const { error } = await supabase.from("campaigns").update({ name: newName.trim() }).eq("id", campaign.id);
    if (error) {
      toast({ title: "Error", description: "Unable to rename campaign", variant: "destructive" });
    } else {
      toast({ title: "Campaign renamed ✓" });
      setIsRenaming(false);
      onUpdate();
    }
  };

  const handleSaveSettings = async () => {
    if (!campaign) return;
    setIsSaving(true);
    
    // 1. Update campaign settings
    const { error } = await supabase.from("campaigns").update({
      posting_hour: postingHour,
      posting_minute: postingMinute,
      timezone,
      instagram_enabled: platformsState.instagram,
      facebook_enabled: platformsState.facebook,
      linkedin_enabled: platformsState.linkedin,
      tiktok_enabled: platformsState.tiktok,
      youtube_enabled: platformsState.youtube,
    }).eq("id", campaign.id);

    if (error) {
      toast({
        title: "Error",
        description: "Unable to save settings",
        variant: "destructive"
      });
      setIsSaving(false);
      return;
    }

    // 2. Update all scheduled posts for this campaign with new posting time
    const { data: campaignPosts, error: fetchError } = await supabase
      .from("scheduled_posts")
      .select("id, scheduled_for")
      .eq("campaign_id", campaign.id)
      .neq("status", "published");

    if (!fetchError && campaignPosts && campaignPosts.length > 0) {
      // Update each post with the new posting hour and minute
      for (const post of campaignPosts) {
        const currentDate = new Date(post.scheduled_for);
        // Set the new hour and minute while keeping the date
        currentDate.setHours(postingHour, postingMinute, 0, 0);
        
        await supabase
          .from("scheduled_posts")
          .update({ scheduled_for: currentDate.toISOString() })
          .eq("id", post.id);
      }
      
      toast({
        title: "Settings saved ✓",
        description: `${campaignPosts.length} post(s) updated with new schedule`
      });
    } else {
      toast({
        title: "Settings saved ✓"
      });
    }
    
    onUpdate();
    fetchCampaignPosts();
    setIsSaving(false);
  };
  if (!campaign) return null;
  const typeConfig = campaignTypeConfig[campaign.campaign_type as keyof typeof campaignTypeConfig] || campaignTypeConfig.mixed;
  const status = statusConfig[localStatus as keyof typeof statusConfig] || statusConfig.draft;
  const TypeIcon = typeConfig.icon;

  // Check if settings have changed
  const settingsChanged = postingHour !== (campaign.posting_hour ?? 10) || postingMinute !== (campaign.posting_minute ?? 0) || timezone !== (campaign.timezone || "Europe/Paris") ||
    platformsState.instagram !== (campaign.instagram_enabled ?? true) ||
    platformsState.facebook !== (campaign.facebook_enabled ?? true) ||
    platformsState.linkedin !== (campaign.linkedin_enabled ?? false) ||
    platformsState.tiktok !== (campaign.tiktok_enabled ?? false) ||
    platformsState.youtube !== (campaign.youtube_enabled ?? false);
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 bg-gradient-to-br ${typeConfig.gradient} text-white`}>
              <TypeIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setIsRenaming(false); setNewName(campaign.name); } }}
                    className="text-lg font-semibold h-9"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleRename}><Check className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setIsRenaming(false); setNewName(campaign.name); }}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <DialogTitle className="text-xl flex items-center gap-2">
                  {campaign.name}
                  <button onClick={() => setIsRenaming(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                </DialogTitle>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge className={status.color}>{status.label}</Badge>
                <span className="text-sm text-muted-foreground">{typeConfig.label}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {platformsState.instagram && <FaInstagram className="h-3.5 w-3.5 text-pink-500" />}
                {platformsState.facebook && <FaFacebookF className="h-3.5 w-3.5 text-blue-500" />}
                {platformsState.linkedin && <FaLinkedinIn className="h-3.5 w-3.5 text-blue-600" />}
                {platformsState.tiktok && <FaTiktok className="h-3.5 w-3.5 text-foreground" />}
                {platformsState.youtube && <FaYoutube className="h-3.5 w-3.5 text-red-500" />}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/calendar?campaign=${campaign.id}&project=${campaign.project_id}`);
                }}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
              <Button variant="default" size="sm" onClick={handleLaunchNow} disabled={isLaunching} className="gap-2 bg-gradient-to-r from-primary to-primary/80">
                {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Launch Now
              </Button>
              <Button variant={localStatus === "active" ? "outline" : "secondary"} size="sm" onClick={handleToggleStatus} disabled={isTogglingStatus} className="gap-2">
                {isTogglingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : localStatus === "active" ? <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </> : <>
                    <Play className="h-4 w-4" />
                    Start
                  </>}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 mt-4 min-h-0 overflow-y-auto pr-2">
          <div className="space-y-4 pb-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{campaign.total_generated}</p>
                <p className="text-xs text-muted-foreground">Generated</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{campaign.total_published}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{posts.filter(p => p.status === "scheduled").length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>

            {/* Configuration Summary */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {(campaign.campaign_type === "video" || campaign.campaign_type === "mixed") && <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-violet-500" />
                    <span className="text-muted-foreground">Videos/month:</span>
                    <span className="font-medium">{campaign.videos_per_month}</span>
                  </div>}
                {(campaign.campaign_type === "image" || campaign.campaign_type === "mixed") && <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-cyan-500" />
                    <span className="text-muted-foreground">Images/month:</span>
                    <span className="font-medium">{campaign.images_per_month}</span>
                  </div>}
                
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Format:</span>
                  <Badge variant="outline">{campaign.format}</Badge>
                </div>
              </div>
              {campaign.subject && <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">Subject:</p>
                  <p className="text-sm">{campaign.subject}</p>
                </div>}
            </div>

            {/* Platform Selection */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                Target Platforms
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "instagram" as const, label: "Instagram", icon: <FaInstagram className="h-4 w-4" />, color: "text-pink-500" },
                  { key: "facebook" as const, label: "Facebook", icon: <FaFacebookF className="h-4 w-4" />, color: "text-blue-500" },
                  { key: "linkedin" as const, label: "LinkedIn", icon: <FaLinkedinIn className="h-4 w-4" />, color: "text-blue-600" },
                  { key: "tiktok" as const, label: "TikTok", icon: <FaTiktok className="h-4 w-4" />, color: "text-foreground" },
                  { key: "youtube" as const, label: "YouTube", icon: <FaYoutube className="h-4 w-4" />, color: "text-red-500" },
                ].map((platform) => (
                  <button
                    key={platform.key}
                    onClick={() => setPlatformsState(prev => ({ ...prev, [platform.key]: !prev[platform.key] }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-sm ${
                      platformsState[platform.key]
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border opacity-50 hover:opacity-75"
                    }`}
                  >
                    <span className={platform.color}>{platform.icon}</span>
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Posting Schedule Settings */}
            <div className="rounded-xl border border-border p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Posting Schedule
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Hour</Label>
                  <Select value={postingHour.toString()} onValueChange={v => setPostingHour(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card max-h-48">
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, "0")}h
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Minute</Label>
                  <Select value={postingMinute.toString()} onValueChange={v => setPostingMinute(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card max-h-48">
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {m.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {TIMEZONES.map(tz => <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Posts will be scheduled at {postingHour.toString().padStart(2, "0")}:{postingMinute.toString().padStart(2, "0")} in the selected timezone
              </p>

              {settingsChanged && <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>}
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Share Modal */}
      <SocialShareModal isOpen={shareModal.open} onClose={() => setShareModal({
      open: false
    })} content={shareModal.post ? {
      text: shareModal.post.text_content || "",
      mediaUrl: shareModal.post.media_url || undefined,
      type: shareModal.post.content_type === "video" ? "video" : "image"
    } : undefined} />
    </Dialog>;
};