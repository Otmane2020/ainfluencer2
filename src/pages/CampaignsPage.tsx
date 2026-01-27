import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
} from "lucide-react";
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
  projects?: { name: string; theme_color: string } | null;
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

const CampaignsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*, projects(name, theme_color)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching campaigns:", error);
    } else {
      setCampaigns(data || []);
    }
    setIsLoading(false);
  };

  const handleToggleStatus = async (campaign: Campaign) => {
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
      title: newStatus === "active" ? "Campaign started! 🚀" : "Campaign paused",
      description: newStatus === "active" ? "Content generation will begin" : "Content generation paused",
    });
    fetchCampaigns();
  };

  const handleDelete = async (campaignId: string) => {
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (error) {
      toast({ title: "Error", description: "Unable to delete campaign", variant: "destructive" });
      return;
    }

    toast({ title: "Campaign deleted" });
    fetchCampaigns();
  };

  const handleViewDetail = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Automated content generation campaigns</p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              Create your first campaign to start generating content automatically
            </p>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign, index) => {
              const typeConfig = campaignTypeConfig[campaign.campaign_type as keyof typeof campaignTypeConfig] || campaignTypeConfig.mixed;
              const status = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.draft;
              const TypeIcon = typeConfig.icon;

            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="group relative overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(campaign)}>
                  {/* Header with gradient */}
                  <div className={`h-2 bg-gradient-to-r ${typeConfig.gradient}`} />
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 bg-gradient-to-br ${typeConfig.gradient} text-white`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{campaign.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetail(campaign); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* Edit */ }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {campaign.campaign_type !== "image" && (
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-lg font-bold">{campaign.videos_per_month || 0}</p>
                          <p className="text-[10px] text-muted-foreground">Videos/mo</p>
                        </div>
                      )}
                      {campaign.campaign_type !== "video" && (
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-lg font-bold">{campaign.images_per_month || 0}</p>
                          <p className="text-[10px] text-muted-foreground">Images/mo</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-lg font-bold">{campaign.posts_per_week || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Posts/wk</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Generated</span>
                        <span>{campaign.total_generated || 0} / {campaign.total_published || 0} published</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${typeConfig.gradient} transition-all`}
                          style={{ width: `${Math.min(((campaign.total_generated || 0) / 30) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <Badge className={status.color}>{status.label}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(campaign); }}
                      >
                        {campaign.status === "active" ? (
                          <>
                            <Pause className="h-3 w-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Wizard Modal */}
      <CampaignWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={() => {
          setShowWizard(false);
          fetchCampaigns();
        }}
      />

      {/* Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedCampaign(null);
        }}
        onUpdate={fetchCampaigns}
      />
    </div>
  );
};

export default CampaignsPage;
