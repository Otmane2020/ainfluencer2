import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Video,
  Image as ImageIcon,
  Layers,
  Play,
  Pause,
  Edit,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle2,
  Loader2,
  Share2,
  Facebook,
  Link,
  ExternalLink,
  Copy,
} from "lucide-react";
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
  timezone: string | null;
  projects?: { name: string; theme_color: string } | null;
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
  video: { icon: Video, label: "Video Campaign", gradient: "from-violet-500 to-purple-600" },
  image: { icon: ImageIcon, label: "Image Campaign", gradient: "from-cyan-500 to-blue-600" },
  mixed: { icon: Layers, label: "Mixed Campaign", gradient: "from-pink-500 to-rose-600" },
};

const statusConfig = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  active: { label: "Active", color: "bg-green-500/20 text-green-600" },
  paused: { label: "Paused", color: "bg-amber-500/20 text-amber-600" },
  completed: { label: "Completed", color: "bg-blue-500/20 text-blue-600" },
};

export const CampaignDetailModal = ({
  campaign,
  isOpen,
  onClose,
  onUpdate,
}: CampaignDetailModalProps) => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [shareModal, setShareModal] = useState<{ open: boolean; post?: ScheduledPost }>({ open: false });
  const [localStatus, setLocalStatus] = useState(campaign?.status || "draft");

  // Sync local status with campaign prop
  useEffect(() => {
    if (campaign) {
      setLocalStatus(campaign.status);
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
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("id, content_type, text_content, media_url, thumbnail_url, status, scheduled_for")
      .eq("campaign_id", campaign.id)
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (!error && data) {
      setPosts(data);
    }
    setIsLoadingPosts(false);
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;

    setIsTogglingStatus(true);
    const newStatus = localStatus === "active" ? "paused" : "active";

    const { error } = await supabase
      .from("campaigns")
      .update({ status: newStatus })
      .eq("id", campaign.id);

    if (error) {
      toast({ title: "Error", description: "Unable to update status", variant: "destructive" });
    } else {
      setLocalStatus(newStatus); // Update local state immediately
      toast({
        title: newStatus === "active" ? "Campaign activated!" : "Campaign paused",
      });
      onUpdate();
    }
    setIsTogglingStatus(false);
  };

  if (!campaign) return null;

  const typeConfig = campaignTypeConfig[campaign.campaign_type as keyof typeof campaignTypeConfig] || campaignTypeConfig.mixed;
  const status = statusConfig[localStatus as keyof typeof statusConfig] || statusConfig.draft;
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 bg-gradient-to-br ${typeConfig.gradient} text-white`}>
              <TypeIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={status.color}>{status.label}</Badge>
                <span className="text-sm text-muted-foreground">{typeConfig.label}</span>
              </div>
            </div>
            <Button
              variant={localStatus === "active" ? "outline" : "default"}
              size="sm"
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              className="gap-2"
            >
              {isTogglingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : localStatus === "active" ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Edit className="h-4 w-4 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="m-0 space-y-4">
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
                <h4 className="font-medium">Configuration</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {(campaign.campaign_type === "video" || campaign.campaign_type === "mixed") && (
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-violet-500" />
                      <span className="text-muted-foreground">Videos/month:</span>
                      <span className="font-medium">{campaign.videos_per_month}</span>
                    </div>
                  )}
                  {(campaign.campaign_type === "image" || campaign.campaign_type === "mixed") && (
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-cyan-500" />
                      <span className="text-muted-foreground">Images/month:</span>
                      <span className="font-medium">{campaign.images_per_month}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-muted-foreground">Posts/week:</span>
                    <span className="font-medium">{campaign.posts_per_week}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Format:</span>
                    <Badge variant="outline">{campaign.format}</Badge>
                  </div>
                  {campaign.posting_hour !== null && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Posting time:</span>
                      <span className="font-medium">
                        {campaign.posting_hour.toString().padStart(2, "0")}:00 ({campaign.timezone || "Europe/Paris"})
                      </span>
                    </div>
                  )}
                </div>
                {campaign.subject && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">Subject:</p>
                    <p className="text-sm">{campaign.subject}</p>
                  </div>
                )}
              </div>
            </TabsContent>


            <TabsContent value="settings" className="m-0 space-y-4">
              <div className="rounded-xl border border-border p-4 space-y-4">
                <h4 className="font-medium">Campaign Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Edit campaign settings coming soon. For now, you can pause/resume or delete the campaign.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Campaign
                  </Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
      
      {/* Share Modal */}
      <SocialShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false })}
        content={shareModal.post ? {
          text: shareModal.post.text_content || "",
          mediaUrl: shareModal.post.media_url || undefined,
          type: shareModal.post.content_type === "video" ? "video" : "image",
        } : undefined}
      />
    </Dialog>
  );
};
