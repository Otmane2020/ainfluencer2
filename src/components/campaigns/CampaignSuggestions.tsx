import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Video,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Loader2,
  Rocket,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  theme_color: string;
}

interface CampaignSuggestion {
  id: string;
  name: string;
  type: "video" | "image" | "mixed";
  description: string;
  videosPerMonth: number;
  imagesPerMonth: number;
  postsPerWeek: number;
  tone: string;
  subject: string;
}

interface CampaignSuggestionsProps {
  projectId?: string;
  onCampaignCreated?: () => void;
}

const campaignTypeConfig = {
  video: { icon: Video, gradient: "from-violet-500 to-purple-600" },
  image: { icon: ImageIcon, gradient: "from-cyan-500 to-blue-600" },
  mixed: { icon: Layers, gradient: "from-pink-500 to-rose-600" },
};

export const CampaignSuggestions = ({ projectId, onCampaignCreated }: CampaignSuggestionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    generateSuggestions();
  }, [projectId]);

  const generateSuggestions = async () => {
    setIsLoading(true);

    // Fetch project info if available
    if (projectId) {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, theme_color")
        .eq("id", projectId)
        .maybeSingle();
      if (data) setProject(data);
    }

    // Generate AI-based suggestions (simplified for now - can be enhanced with actual AI)
    const baseSuggestions: CampaignSuggestion[] = [
      {
        id: "video-engagement",
        name: "Video Engagement Boost",
        type: "video",
        description: "High-impact video reels to maximize audience engagement and reach",
        videosPerMonth: 8,
        imagesPerMonth: 0,
        postsPerWeek: 2,
        tone: "urgent",
        subject: "Product highlights, testimonials, behind-the-scenes",
      },
      {
        id: "visual-presence",
        name: "Visual Brand Presence",
        type: "image",
        description: "Consistent visual content to build brand recognition",
        videosPerMonth: 0,
        imagesPerMonth: 16,
        postsPerWeek: 4,
        tone: "professional",
        subject: "Product photos, quotes, infographics",
      },
      {
        id: "full-funnel",
        name: "Full Funnel Campaign",
        type: "mixed",
        description: "Complete content mix for awareness, engagement, and conversion",
        videosPerMonth: 4,
        imagesPerMonth: 12,
        postsPerWeek: 4,
        tone: "casual",
        subject: "Mix of videos and images for all stages",
      },
    ];

    setSuggestions(baseSuggestions);
    setIsLoading(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLaunchCampaigns = async () => {
    if (!user || selectedIds.length === 0) return;

    // Need a project to attach campaigns to
    if (!projectId) {
      toast({
        title: "Project required",
        description: "Please select a project first to create campaigns",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const selectedSuggestions = suggestions.filter((s) => selectedIds.includes(s.id));

      const campaignsToInsert = selectedSuggestions.map((s) => ({
        user_id: user.id,
        project_id: projectId,
        name: s.name,
        campaign_type: s.type,
        videos_per_month: s.videosPerMonth,
        images_per_month: s.imagesPerMonth,
        posts_per_week: s.postsPerWeek,
        tone: s.tone,
        subject: s.subject,
        status: "active" as const,
      }));

      const { error } = await supabase.from("campaigns").insert(campaignsToInsert);

      if (error) throw error;

      toast({
        title: `${selectedIds.length} campaign(s) launched! 🚀`,
        description: "Content generation will start automatically",
      });

      setSelectedIds([]);
      onCampaignCreated?.();
    } catch (error) {
      console.error("Error creating campaigns:", error);
      toast({
        title: "Error",
        description: "Unable to create campaigns",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold">AI-Suggested Campaigns</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Select campaigns to launch for {project?.name || "your project"}
        </p>
      </div>

      <CardContent className="p-4 space-y-3">
        {suggestions.map((suggestion, index) => {
          const isSelected = selectedIds.includes(suggestion.id);
          const config = campaignTypeConfig[suggestion.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => toggleSelection(suggestion.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelection(suggestion.id)}
                className="mt-1"
              />

              <div className={`rounded-lg p-2.5 bg-gradient-to-br ${config.gradient} text-white shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium">{suggestion.name}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{suggestion.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {suggestion.videosPerMonth > 0 && (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {suggestion.videosPerMonth}/mo
                    </span>
                  )}
                  {suggestion.imagesPerMonth > 0 && (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {suggestion.imagesPerMonth}/mo
                    </span>
                  )}
                  <span>{suggestion.postsPerWeek} posts/wk</span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-3 border-t border-border"
          >
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleLaunchCampaigns}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Launch {selectedIds.length} Campaign{selectedIds.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
