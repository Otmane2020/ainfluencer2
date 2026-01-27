import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Image as ImageIcon,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CAMPAIGN_TYPES = [
  { id: "video", label: "Video Campaign", icon: Video, description: "Generate AI videos and reels", gradient: "from-violet-500 to-purple-600" },
  { id: "image", label: "Image Campaign", icon: ImageIcon, description: "Generate promotional images", gradient: "from-cyan-500 to-blue-600" },
  { id: "mixed", label: "Mixed Campaign", icon: Layers, description: "Combine videos and images", gradient: "from-pink-500 to-rose-600" },
];

const FORMATS = [
  { id: "reel", label: "Reel (9:16)" },
  { id: "story", label: "Story (9:16)" },
  { id: "landscape", label: "Landscape (16:9)" },
  { id: "mix", label: "Mix (Auto)" },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "urgent", label: "Urgent" },
  { id: "luxurious", label: "Luxurious" },
  { id: "playful", label: "Playful" },
];

export const CampaignWizardModal = ({
  isOpen,
  onClose,
  onSuccess,
}: CampaignWizardModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Form state
  const [campaignType, setCampaignType] = useState<"video" | "image" | "mixed">("mixed");
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [videosPerMonth, setVideosPerMonth] = useState(4);
  const [imagesPerMonth, setImagesPerMonth] = useState(12);
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [format, setFormat] = useState("reel");
  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      // Reset form
      setStep(1);
      setCampaignType("mixed");
      setName("");
      setProjectId("");
      setVideosPerMonth(4);
      setImagesPerMonth(12);
      setPostsPerWeek(3);
      setFormat("reel");
      setTone("professional");
      setSubject("");
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .order("name");
    if (data) {
      setProjects(data);
      if (data.length > 0 && !projectId) {
        setProjectId(data[0].id);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user || !projectId) return;

    setIsSubmitting(true);

    try {
      // Create the campaign
      const { data: newCampaign, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          project_id: projectId,
          name: name || `${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} Campaign`,
          campaign_type: campaignType,
          videos_per_month: videosPerMonth,
          images_per_month: imagesPerMonth,
          posts_per_week: postsPerWeek,
          format,
          tone,
          subject,
          status: "generating",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campaign created! 🚀",
        description: "Generating content... This may take a moment.",
      });

      // Trigger content generation
      const { data: genResult, error: genError } = await supabase.functions.invoke(
        "generate-campaign-content",
        { body: { campaignId: newCampaign.id } }
      );

      if (genError) {
        console.error("Content generation error:", genError);
        toast({
          title: "Content generation started",
          description: "Some content may still be generating in the background.",
        });
      } else {
        toast({
          title: "Content ready! ✨",
          description: `Generated ${genResult?.generated || 0} scheduled posts`,
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Campaign creation error:", error);
      toast({
        title: "Error",
        description: "Unable to create campaign",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true; // Campaign type always selected
      case 2: return projectId !== "";
      case 3: return true; // Sliders have defaults
      case 4: return true; // Optional fields
      default: return true;
    }
  };

  const totalSteps = 4;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Campaign
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Campaign Type */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <Label className="text-base">Select Campaign Type</Label>
                <p className="text-sm text-muted-foreground">Choose what type of content to generate</p>
              </div>

              <div className="grid gap-3">
                {CAMPAIGN_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setCampaignType(type.id as "video" | "image" | "mixed")}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        campaignType === type.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`rounded-lg p-3 bg-gradient-to-br ${type.gradient} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      {campaignType === type.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Project & Name */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Campaign"
                />
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: project.theme_color }}
                          />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {projects.length === 0 && (
                <p className="text-sm text-amber-500">
                  You need to create a project first before creating a campaign.
                </p>
              )}
            </motion.div>
          )}

          {/* Step 3: Volume */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {(campaignType === "video" || campaignType === "mixed") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-violet-500" />
                      <Label>Videos / Reels per month</Label>
                    </div>
                    <span className="text-xl font-bold text-primary">{videosPerMonth}</span>
                  </div>
                  <Slider
                    value={[videosPerMonth]}
                    onValueChange={([v]) => setVideosPerMonth(v)}
                    min={1}
                    max={20}
                    step={1}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 4-8 videos/month for optimal engagement</p>
                </div>
              )}

              {(campaignType === "image" || campaignType === "mixed") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-cyan-500" />
                      <Label>Image posts per month</Label>
                    </div>
                    <span className="text-xl font-bold text-primary">{imagesPerMonth}</span>
                  </div>
                  <Slider
                    value={[imagesPerMonth]}
                    onValueChange={([v]) => setImagesPerMonth(v)}
                    min={1}
                    max={30}
                    step={1}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 12-16 images/month for consistent presence</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Publications per week</Label>
                  <span className="text-xl font-bold text-primary">{postsPerWeek}</span>
                </div>
                <Slider
                  value={[postsPerWeek]}
                  onValueChange={([v]) => setPostsPerWeek(v)}
                  min={1}
                  max={7}
                  step={1}
                  className="py-2"
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Content Settings */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {FORMATS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {TONES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject / Topic (optional)</Label>
                <Textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E.g., Product launches, behind the scenes, customer testimonials..."
                  rows={3}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Launch Campaign
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
