import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaywallModal } from "@/components/PaywallModal";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Video,
  Image as ImageIcon,
  Layers,
  Play,
  Pause,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Wand2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from "react-icons/fa";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CampaignWizardModal } from "@/components/campaigns/CampaignWizardModal";
import { CampaignDetailModal } from "@/components/campaigns/CampaignDetailModal";

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
  instagram_enabled: boolean | null;
  facebook_enabled: boolean | null;
  linkedin_enabled: boolean | null;
  tiktok_enabled: boolean | null;
  youtube_enabled: boolean | null;
  projects?: { name: string; theme_color: string; logo_url: string | null } | null;
}

const campaignTypeConfig = {
  video: { icon: Video, label: "Video", gradient: "from-violet-500 to-purple-600", bg: "bg-violet-500/10 text-violet-400" },
  image: { icon: ImageIcon, label: "Image", gradient: "from-cyan-500 to-blue-600", bg: "bg-cyan-500/10 text-cyan-400" },
  mixed: { icon: Layers, label: "Mixed", gradient: "from-pink-500 to-rose-600", bg: "bg-pink-500/10 text-pink-400" },
  linkedin_story: { icon: Layers, label: "LinkedIn", gradient: "from-blue-600 to-blue-800", bg: "bg-blue-500/10 text-blue-400" },
  linkedin_reaction: { icon: TrendingUp, label: "Reaction", gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-500/10 text-emerald-400" },
};

const statusConfig = {
  draft: { label: "Draft", dot: "bg-muted-foreground" },
  active: { label: "Active", dot: "bg-green-500" },
  paused: { label: "Paused", dot: "bg-amber-500" },
  completed: { label: "Completed", dot: "bg-blue-500" },
};

const CampaignsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription, canAccessFeature } = useSubscription();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*, projects(name, theme_color, logo_url)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching campaigns:", error);
    } else {
      setCampaigns(data || []);
    }
    setIsLoading(false);
  };

  const handleNewCampaign = () => {
    if (!subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }
    setShowWizard(true);
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    if (campaign.status !== "active" && !subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }

    const newStatus = campaign.status === "active" ? "paused" : "active";
    
    const { error } = await supabase
      .from("campaigns")
      .update({ status: newStatus })
      .eq("id", campaign.id);

    if (error) {
      toast({ title: "Error", description: "Unable to update campaign status", variant: "destructive" });
      return;
    }

    toast({ 
      title: newStatus === "active" ? "Campaign started!" : "Campaign paused",
      description: newStatus === "active" ? "Content generation will begin" : "Content generation paused",
    });
    fetchCampaigns();
  };

  const handleDelete = async (campaignId: string) => {
    const { error: detachError } = await supabase
      .from("scheduled_posts")
      .update({ campaign_id: null })
      .eq("campaign_id", campaignId)
      .eq("status", "published");

    if (detachError) console.error("Error detaching published posts:", detachError);

    const { error: deletePostsError } = await supabase
      .from("scheduled_posts")
      .delete()
      .eq("campaign_id", campaignId)
      .neq("status", "published");

    if (deletePostsError) console.error("Error deleting scheduled posts:", deletePostsError);

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (error) {
      toast({ title: "Error", description: "Unable to delete campaign", variant: "destructive" });
      return;
    }

    toast({ title: "Campaign deleted", description: "Published posts have been preserved in history" });
    fetchCampaigns();
  };

  const handleViewDetail = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDetail(true);
  };

  const getContentCount = (c: Campaign) => {
    if (c.campaign_type === "video") return `${c.videos_per_month || 0} videos/mo`;
    if (c.campaign_type === "image") return `${c.images_per_month || 0} images/mo`;
    return `${c.videos_per_month || 0}v + ${c.images_per_month || 0}i /mo`;
  };

  const getProgressPercent = (c: Campaign) => {
    const total = (c.campaign_type === "video" ? c.videos_per_month : c.images_per_month) || 30;
    return Math.min(((c.total_generated || 0) / total) * 100, 100);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Campaigns</h1>
            <p className="text-sm text-muted-foreground">Automated content generation</p>
          </div>
          <Button onClick={handleNewCampaign} className="gap-2 gradient-primary">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Summary Stats */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-500">{campaigns.filter(c => c.status === "active").length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{campaigns.reduce((s, c) => s + (c.total_generated || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Generated</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campaign List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-4">
                Create your first campaign to start generating content automatically
              </p>
              <Button onClick={handleNewCampaign} className="gap-2 gradient-primary">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign, index) => {
              const typeConfig = campaignTypeConfig[campaign.campaign_type as keyof typeof campaignTypeConfig] || campaignTypeConfig.mixed;
              const status = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.draft;
              const TypeIcon = typeConfig.icon;
              const progress = getProgressPercent(campaign);

              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="group hover:border-primary/40 transition-all cursor-pointer overflow-hidden"
                    onClick={() => handleViewDetail(campaign)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center gap-3 p-3 sm:p-4">
                        {/* Left: Icon/Logo */}
                        <div className="shrink-0">
                          {campaign.projects?.logo_url ? (
                            <img
                              src={campaign.projects.logo_url}
                              alt={campaign.projects.name}
                              className="h-11 w-11 rounded-xl object-cover border border-border"
                            />
                          ) : (
                            <div className={`rounded-xl p-2.5 bg-gradient-to-br ${typeConfig.gradient} text-white`}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        {/* Center: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                              <span className="text-[11px] text-muted-foreground hidden sm:inline">{status.label}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {campaign.projects && (
                              <span className="text-primary font-medium truncate max-w-[100px]">{campaign.projects.name}</span>
                            )}
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${typeConfig.bg} border-0`}>
                              {typeConfig.label}
                            </Badge>
                            <span className="hidden sm:inline">{getContentCount(campaign)}</span>
                          </div>

                          {/* Platform icons + posting time */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {campaign.instagram_enabled && <FaInstagram className="h-3 w-3 text-pink-500" />}
                            {campaign.facebook_enabled && <FaFacebookF className="h-3 w-3 text-blue-500" />}
                            {campaign.linkedin_enabled && <FaLinkedinIn className="h-3 w-3 text-blue-600" />}
                            {campaign.tiktok_enabled && <FaTiktok className="h-3 w-3 text-foreground" />}
                            {campaign.youtube_enabled && <FaYoutube className="h-3 w-3 text-red-500" />}
                            <span className="text-[10px] text-muted-foreground ml-1">
                              🕐 {String(campaign.posting_hour ?? 10).padStart(2, '0')}:{String(campaign.posting_minute ?? 0).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${typeConfig.gradient} transition-all duration-500`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                              {campaign.total_generated || 0}/{campaign.total_published || 0}
                            </span>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant={campaign.status === "active" ? "outline" : "default"}
                            size="sm"
                            className={`h-8 gap-1 text-xs ${campaign.status !== "active" ? "gradient-primary" : ""}`}
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(campaign); }}
                          >
                            {campaign.status === "active" ? (
                              <><Pause className="h-3 w-3" /><span className="hidden sm:inline">Pause</span></>
                            ) : (
                              <><Play className="h-3 w-3" /><span className="hidden sm:inline">Start</span></>
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetail(campaign); }}>
                                <Eye className="h-4 w-4 mr-2" /> Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <CampaignWizardModal
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onSuccess={() => { setShowWizard(false); fetchCampaigns(); }}
        />

        <CampaignDetailModal
          campaign={selectedCampaign}
          isOpen={showDetail}
          onClose={() => { setShowDetail(false); setSelectedCampaign(null); }}
          onUpdate={fetchCampaigns}
        />
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="campaigns"
        requiredPlan="starter"
      />
    </>
  );
};

export default CampaignsPage;
