import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AUDIO_CATEGORIES } from "@/lib/audioBank";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BrandOptions, BrandOptionsState } from "@/components/BrandOptions";
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
  Wand2,
  Loader2,
  Check,
  Facebook,
  Instagram,
  Linkedin,
  Clock,
  Music,
  Sparkles,
  Globe,
  Package,
} from "lucide-react";
import { CampaignProgressModal } from "./CampaignProgressModal";

const TIMEZONES = [
  { id: "Europe/Paris", label: "Paris (CET/CEST)" },
  { id: "Europe/London", label: "London (GMT/BST)" },
  { id: "America/New_York", label: "New York (EST/EDT)" },
  { id: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { id: "Asia/Tokyo", label: "Tokyo (JST)" },
  { id: "Asia/Dubai", label: "Dubai (GST)" },
  { id: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

interface Project {
  id: string;
  name: string;
  theme_color: string;
  url: string | null;
  description: string | null;
}

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CAMPAIGN_TYPES = [
  { id: "video", label: "Video Campaign", icon: Video, description: "Generate AI videos and reels", gradient: "from-violet-500 to-purple-600" },
  { id: "image", label: "Image Campaign", icon: ImageIcon, description: "Generate promotional images and reels", gradient: "from-cyan-500 to-blue-600" },
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

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
  { id: "tiktok", label: "TikTok", icon: Video, color: "bg-black" },
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
  
  // Progress modal state
  const [showProgress, setShowProgress] = useState(false);
  const [progressStatus, setProgressStatus] = useState<"creating" | "scheduling" | "completed" | "error">("creating");
  const [progressValue, setProgressValue] = useState(0);
  const [progressStats, setProgressStats] = useState<{ videos: number; images: number; total: number } | undefined>();
  const [progressError, setProgressError] = useState<string | undefined>();

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
  const [productDescription, setProductDescription] = useState("");
  const [isSuggestingProduct, setIsSuggestingProduct] = useState(false);
  const [postingHour, setPostingHour] = useState(10);
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [imageAsReel, setImageAsReel] = useState(false); // NEW: Convert images to reels with audio
  const [audioCategory, setAudioCategory] = useState("upbeat"); // NEW: Audio category for reels
  const [clipmotion, setClipmotion] = useState(false); // NEW: ClipMotion mode for videos
  const [brandOptions, setBrandOptions] = useState<BrandOptionsState>({
    includeLogo: false,
    includeUrl: false,
    includeText: false,
    includeAvatar: false,
  });
  
  // Platform toggles
  const [platforms, setPlatforms] = useState({
    facebook: true,
    instagram: true,
    linkedin: false,
    tiktok: false,
  });

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
      setProductDescription("");
      setPostingHour(10);
      setTimezone("Europe/Paris");
      setImageAsReel(false);
      setAudioCategory("upbeat");
      setClipmotion(false);
      setBrandOptions({ includeLogo: false, includeUrl: false, includeText: false, includeAvatar: false });
      setPlatforms({ facebook: true, instagram: true, linkedin: false, tiktok: false });
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color, url, description")
      .order("name");
    if (data) {
      setProjects(data);
      if (data.length > 0 && !projectId) {
        setProjectId(data[0].id);
      }
    }
  };

  // Suggest product/service from project URL
  const handleSuggestProduct = async () => {
    const selectedProject = projects.find(p => p.id === projectId);
    if (!selectedProject?.url) {
      toast({ title: "No URL", description: "This project doesn't have a URL to analyze", variant: "destructive" });
      return;
    }

    setIsSuggestingProduct(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-project-url", {
        body: { url: selectedProject.url },
      });

      if (error) throw error;

      if (data?.success) {
        // Extract product/service info from description and markdown
        let suggestion = "";
        
        if (data.description) {
          suggestion = data.description;
        }
        
        // If we have markdown, try to extract key product info
        if (data.markdown && !suggestion) {
          // Take first meaningful paragraph
          const paragraphs = data.markdown.split("\n").filter((p: string) => p.trim().length > 50);
          if (paragraphs.length > 0) {
            suggestion = paragraphs[0].slice(0, 300);
          }
        }

        if (suggestion) {
          setProductDescription(suggestion);
          toast({ title: "Product info detected!", description: "Review and edit if needed" });
        } else {
          toast({ title: "No product info found", description: "Please enter manually", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error("Suggest product error:", error);
      toast({ title: "Failed to analyze", description: "Please enter product info manually", variant: "destructive" });
    } finally {
      setIsSuggestingProduct(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !projectId) return;

    setIsSubmitting(true);
    setShowProgress(true);
    setProgressStatus("creating");
    setProgressValue(10);
    setProgressError(undefined);
    setProgressStats(undefined);

    const campaignName = name || `${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} Campaign`;

    try {
      // Create the campaign
      setProgressValue(20);
      const { data: newCampaign, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          project_id: projectId,
          name: campaignName,
          campaign_type: campaignType,
          videos_per_month: videosPerMonth,
          images_per_month: imagesPerMonth,
          posts_per_week: postsPerWeek,
          format,
          tone,
          subject,
          ai_context: productDescription || null, // Store product/service description
          posting_hour: postingHour,
          timezone,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      // Campaign created, now scheduling posts
      setProgressStatus("scheduling");
      setProgressValue(40);

      // Trigger content generation with platforms and brand options
      const { data: genResult, error: genError } = await supabase.functions.invoke(
        "generate-campaign-content",
        { 
          body: { 
            campaignId: newCampaign.id, 
            platforms: selectedPlatforms,
            // Brand options
            includeLogo: brandOptions.includeLogo,
            includeUrl: brandOptions.includeUrl,
            includeAvatar: brandOptions.includeAvatar,
            includeText: brandOptions.includeText,
            // Content options
            format: format,
            tone: tone,
            subject: subject || null,
            imageAsReel: imageAsReel,
            audioCategory: audioCategory,
            clipmotion: clipmotion,
            productDescription: productDescription || null,
          }
        }
      );

      if (genError) {
        console.error("Content generation error:", genError);
        setProgressStatus("error");
        setProgressError("Content generation failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Success!
      setProgressValue(100);
      setProgressStatus("completed");
      setProgressStats({
        videos: genResult?.videos || 0,
        images: genResult?.images || 0,
        total: genResult?.generated || 0,
      });
      
      onSuccess();
    } catch (error) {
      console.error("Campaign creation error:", error);
      setProgressStatus("error");
      setProgressError("Unable to create campaign. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    if (progressStatus === "completed") {
      onClose();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true; // Campaign type always selected
      case 2: return projectId !== "";
      case 3: return true; // Sliders have defaults
      case 4: return Object.values(platforms).some(Boolean); // At least one platform
      case 5: return true; // Optional fields
      default: return true;
    }
  };

  const selectedPlatforms = Object.entries(platforms)
    .filter(([_, enabled]) => enabled)
    .map(([id]) => id);

  const totalSteps = 5;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
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

              {/* Product/Service to Promote */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Product/Service to Promote
                  </Label>
                  {projectId && projects.find(p => p.id === projectId)?.url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSuggestProduct}
                      disabled={isSuggestingProduct}
                      className="h-7 text-xs gap-1"
                    >
                      {isSuggestingProduct ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Globe className="h-3 w-3" />
                      )}
                      Suggest from URL
                    </Button>
                  )}
                </div>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Describe the product or service you want to promote (e.g., 'Premium leather handbags handcrafted in Italy, featuring minimalist designs for modern professionals')"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This helps AI generate more targeted and relevant content
                </p>
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

              {/* ClipMotion Toggle for Video Campaigns */}
              {(campaignType === "video" || campaignType === "mixed") && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-2 bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">ClipMotion Mode</p>
                        <p className="text-xs text-muted-foreground">Fast-paced, social-optimized videos</p>
                      </div>
                    </div>
                    <Switch
                      checked={clipmotion}
                      onCheckedChange={setClipmotion}
                    />
                  </div>
                  
                  {clipmotion && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-violet-600 dark:text-violet-400">
                        Videos will use fast cuts, zoom effects, animated text overlays, and TikTok/Reels aesthetic for maximum engagement.
                      </p>
                    </div>
                  )}
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

              {/* Image as Reel Option */}
              {(campaignType === "image" || campaignType === "mixed") && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-2 bg-gradient-to-br from-pink-500 to-orange-400 text-white">
                        <Music className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Post Images as Reels</p>
                        <p className="text-xs text-muted-foreground">Convert images to video reels with music</p>
                      </div>
                    </div>
                    <Switch
                      checked={imageAsReel}
                      onCheckedChange={setImageAsReel}
                    />
                  </div>
                  
                  {imageAsReel && (
                    <div className="pt-2 border-t border-border/50">
                      <Label className="text-xs mb-2 block">Background Music Style</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {AUDIO_CATEGORIES.slice(0, 4).map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setAudioCategory(cat.id)}
                            className={`p-2 rounded-lg text-xs text-left transition-all ${
                              audioCategory === cat.id 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            <span className="mr-1">{cat.emoji}</span>
                            {cat.label.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  Content will be automatically distributed across the month
                  {imageAsReel && " • Images will be converted to reels with music"}
                  {clipmotion && " • ClipMotion style enabled"}
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Platforms */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <Label className="text-base">Target Platforms</Label>
                <p className="text-sm text-muted-foreground">Select where to publish your content</p>
              </div>

              <div className="space-y-3">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const isEnabled = platforms[platform.id as keyof typeof platforms];
                  return (
                    <div
                      key={platform.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isEnabled ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${platform.color} text-white`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{platform.label}</p>
                          {(platform.id === "linkedin" || platform.id === "tiktok") && (
                            <p className="text-xs text-muted-foreground">Manual share / download</p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => 
                          setPlatforms(prev => ({ ...prev, [platform.id]: checked }))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              {!Object.values(platforms).some(Boolean) && (
                <p className="text-sm text-amber-500">Select at least one platform</p>
              )}
            </motion.div>
          )}

          {/* Step 5: Content Settings */}
          {step === 5 && (
            <motion.div
              key="step5"
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

              {/* Brand Options */}
              <BrandOptions options={brandOptions} onChange={setBrandOptions} />

              {/* Posting Schedule */}
              <div className="rounded-xl border border-border p-4 space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Posting Schedule
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Posting Hour</Label>
                    <Select value={postingHour.toString()} onValueChange={(v) => setPostingHour(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card max-h-48">
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, "0")}:00
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
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Posts will be scheduled around {postingHour.toString().padStart(2, "0")}:00 in the selected timezone
                </p>
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
                  <Wand2 className="h-4 w-4 mr-2" />
                  Launch Campaign
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Progress Modal */}
      <CampaignProgressModal
        isOpen={showProgress}
        onClose={handleProgressClose}
        campaignName={name || `${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} Campaign`}
        status={progressStatus}
        progress={progressValue}
        stats={progressStats}
        errorMessage={progressError}
      />
    </Dialog>
  );
};
