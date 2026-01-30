import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AUDIO_CATEGORIES } from "@/lib/audioBank";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandOptions, BrandOptionsState } from "@/components/BrandOptions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  X,
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

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// YouTube icon component
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" },
  { id: "youtube", label: "YouTube", icon: YouTubeIcon, color: "bg-red-600" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
  { id: "tiktok", label: "TikTok", icon: TikTokIcon, color: "bg-black" },
];

export const CampaignWizardModal = ({
  isOpen,
  onClose,
  onSuccess,
}: CampaignWizardModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
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
  const [format, setFormat] = useState("vertical");
  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSuggestingProduct, setIsSuggestingProduct] = useState(false);
  const autoSuggestedProjectIdRef = useRef<string | null>(null);
  const isLoadingServicesRef = useRef(false);
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
    youtube: false,
    linkedin: false,
    tiktok: false,
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      fetchCampaignCount();
      // Reset form
      setStep(1);
      setCampaignType("mixed");
      setProjectId("");
      setVideosPerMonth(4);
      setImagesPerMonth(12);
      setPostsPerWeek(3);
      setFormat("vertical");
      setTone("professional");
      setSubject("");
      setServiceTags([]);
      setNewTag("");
      autoSuggestedProjectIdRef.current = null;
      isLoadingServicesRef.current = false;
      setPostingHour(10);
      setTimezone("Europe/Paris");
      setImageAsReel(false);
      setAudioCategory("upbeat");
      setClipmotion(false);
      setBrandOptions({ includeLogo: false, includeUrl: false, includeText: false, includeAvatar: false });
      setPlatforms({ facebook: true, instagram: true, youtube: false, linkedin: false, tiktok: false });
    }
  }, [isOpen]);

  // Fetch campaign count for default naming
  const fetchCampaignCount = async () => {
    const { count } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true });
    
    const nextNumber = (count || 0) + 1;
    setName(`Campaign ${nextNumber}`);
  };

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

  // Reset serviceTags when project changes - critical for showing correct project services
  const previousProjectIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Skip on initial mount
    if (previousProjectIdRef.current === null) {
      previousProjectIdRef.current = projectId;
      return;
    }
    
    // If project changed, reset tags and allow re-fetch
    if (previousProjectIdRef.current !== projectId) {
      setServiceTags([]);
      autoSuggestedProjectIdRef.current = null; // Allow re-fetch for new project
      isLoadingServicesRef.current = false;
      previousProjectIdRef.current = projectId;
    }
  }, [projectId]);

  // Auto-suggest services when project changes (and has URL)
  // PRIORITY: Use cached scraped_data from DB, only call API if not cached
  useEffect(() => {
    // Guard: Only on step 2 (project selection step)
    if (step !== 2) return;
    
    // Guard: Must have projects loaded
    if (projects.length === 0) return;
    
    // Guard: Must have projectId
    if (!projectId) return;
    
    // Guard: Already processed this project
    if (autoSuggestedProjectIdRef.current === projectId) return;
    
    // Guard: Already have tags
    if (serviceTags.length > 0) return;
    
    // Guard: Already loading
    if (isLoadingServicesRef.current) return;
    
    const selectedProject = projects.find(p => p.id === projectId);
    if (!selectedProject?.url) return;

    autoSuggestedProjectIdRef.current = projectId;
    loadServicesFromCache(projectId, selectedProject.url);
  }, [projectId, step, projects.length, serviceTags.length]);

  // Load services from DB cache first, fallback to API scrape
  const loadServicesFromCache = async (projId: string, url: string) => {
    // Guard: Prevent duplicate calls
    if (isLoadingServicesRef.current) return;
    
    isLoadingServicesRef.current = true;
    setIsSuggestingProduct(true);
    try {
      // 1. Check if project has cached scraped_data
      const { data: projectData } = await supabase
        .from("projects")
        .select("scraped_markdown, scraped_data")
        .eq("id", projId)
        .single();

      // 2. If cached data exists, extract services from ai_context or scraped_data
      if (projectData?.scraped_data) {
        const scraped = projectData.scraped_data as { services?: string[]; metadata?: { title?: string } };
        if (scraped.services && Array.isArray(scraped.services) && scraped.services.length > 0) {
          const cachedTags = scraped.services.slice(0, 8);
          setServiceTags(cachedTags);
          toast({ title: "Services loaded!", description: `${cachedTags.length} services from cached data` });
          setIsSuggestingProduct(false);
          return;
        }
      }

      // 3. No cache — call Firecrawl API (only happens once per project)
      const { data, error } = await supabase.functions.invoke("scrape-project-url", {
        body: { url },
      });

      if (error) throw error;

      if (data?.success && data.services?.length > 0) {
        const newTags = data.services.slice(0, 8);
        setServiceTags(newTags);
        toast({ title: "Services detected!", description: `${newTags.length} services found from your website` });
      }
    } catch (error) {
      console.error("Load services error:", error);
      // Silent fail
    } finally {
      setIsSuggestingProduct(false);
      isLoadingServicesRef.current = false;
    }
  };

  // Manual suggest product/service from project URL
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
        // Use services extracted by the edge function (from markdown parsing)
        if (data.services && Array.isArray(data.services) && data.services.length > 0) {
          const newTags = data.services.slice(0, 8);
          setServiceTags(prev => [...new Set([...prev, ...newTags])].slice(0, 8));
          toast({ title: "Services detected!", description: `${newTags.length} services found from your website` });
        } else {
          // Fallback: extract from title/description
          const extractedTags: string[] = [];
          
          if (data.title) {
            const titleWords = data.title.split(/[\s,|·-]+/).filter((w: string) => w.length > 3 && w.length < 25);
            extractedTags.push(...titleWords.slice(0, 3));
          }
          
          if (data.description) {
            const descWords = data.description
              .split(/[\s,.|·-]+/)
              .filter((w: string) => w.length > 4 && w.length < 20 && /^[A-Z]/.test(w));
            extractedTags.push(...descWords.slice(0, 4));
          }

          const uniqueTags = [...new Set(extractedTags.map(t => t.trim()).filter(t => t.length > 2))].slice(0, 6);

          if (uniqueTags.length > 0) {
            setServiceTags(prev => [...new Set([...prev, ...uniqueTags])].slice(0, 8));
            toast({ title: "Services detected!", description: `${uniqueTags.length} tags added` });
          } else {
            toast({ title: "No services found", description: "Add tags manually", variant: "destructive" });
          }
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
          ai_context: serviceTags.length > 0 ? serviceTags.join(", ") : null,
          posting_hour: postingHour,
          timezone,
          status: "draft",
          // Brand options - now stored in DB
          include_logo: brandOptions.includeLogo,
          include_url: brandOptions.includeUrl,
          include_avatar: brandOptions.includeAvatar,
          include_text: brandOptions.includeText,
          // Content options
          image_as_reel: imageAsReel,
          audio_category: audioCategory,
          clipmotion: clipmotion,
        })
        .select()
        .single();

      if (error) throw error;

      // Campaign created, now scheduling posts
      setProgressStatus("scheduling");
      setProgressValue(40);

      // Generate content in batches (edge function handles 15 posts at a time to avoid timeout)
      let totalGenerated = 0;
      let totalVideos = 0;
      let totalImages = 0;
      let batchCount = 0;
      const maxBatches = 5; // Safety limit

      const generateBatch = async (): Promise<boolean> => {
        batchCount++;
        if (batchCount > maxBatches) {
          console.log("Max batch limit reached");
          return true;
        }

        const { data: genResult, error: genError } = await supabase.functions.invoke(
          "generate-campaign-content",
          { 
            body: { 
              campaignId: newCampaign.id, 
              platforms: selectedPlatforms,
              includeLogo: brandOptions.includeLogo,
              includeUrl: brandOptions.includeUrl,
              includeAvatar: brandOptions.includeAvatar,
              includeText: brandOptions.includeText,
              format: format,
              tone: tone,
              subject: subject || null,
              imageAsReel: imageAsReel,
              audioCategory: audioCategory,
              clipmotion: clipmotion,
              serviceTags: serviceTags.length > 0 ? serviceTags : null,
            }
          }
        );

        if (genError) {
          console.error("Content generation error:", genError);
          // If we already generated some posts, consider it a partial success
          if (totalGenerated > 0) {
            return true;
          }
          throw new Error(genError.message || "Content generation failed");
        }

        if (genResult) {
          totalGenerated += genResult.generated || 0;
          totalVideos += genResult.videos || 0;
          totalImages += genResult.images || 0;
          
          // Update progress (40-90% range for scheduling)
          const progressPct = 40 + Math.min(50, (totalGenerated / (videosPerMonth + imagesPerMonth)) * 50);
          setProgressValue(Math.round(progressPct));
        }

        // If batch is complete or no remaining, we're done
        return genResult?.batchComplete || (genResult?.remaining || 0) <= 0;
      };

      // Run batches until complete
      let isComplete = false;
      while (!isComplete) {
        isComplete = await generateBatch();
        
        // Small delay between batches to avoid rate limiting
        if (!isComplete) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // If no posts were generated at all, show error
      if (totalGenerated === 0) {
        setProgressStatus("error");
        setProgressError("No content was generated. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Success!
      setProgressValue(100);
      setProgressStatus("completed");
      setProgressStats({
        videos: totalVideos,
        images: totalImages,
        total: totalGenerated,
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

  const wizardContent = (
    <>
      {/* Progress */}
      <div className="flex gap-1 mb-4 px-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1" style={{ maxHeight: isMobile ? "60vh" : "55vh" }}>
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
                {/* Tag Input */}
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a service or product..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTag.trim()) {
                        e.preventDefault();
                        if (!serviceTags.includes(newTag.trim())) {
                          setServiceTags(prev => [...prev, newTag.trim()].slice(0, 8));
                        }
                        setNewTag("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (newTag.trim() && !serviceTags.includes(newTag.trim())) {
                        setServiceTags(prev => [...prev, newTag.trim()].slice(0, 8));
                        setNewTag("");
                      }
                    }}
                    disabled={!newTag.trim() || serviceTags.length >= 8}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>

                {/* Tags Display */}
                {serviceTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {serviceTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setServiceTags(prev => prev.filter((_, i) => i !== index))}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Add up to 8 tags to help AI focus on your products/services
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </ScrollArea>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t mt-4">
        <Button
          variant="outline"
          onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          size={isMobile ? "sm" : "default"}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step < totalSteps ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} size={isMobile ? "sm" : "default"}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()} size={isMobile ? "sm" : "default"}>
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
    </>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-base">
                <Wand2 className="h-5 w-5 text-primary" />
                Create Campaign
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              {wizardContent}
            </div>
          </DrawerContent>
        </Drawer>

        <CampaignProgressModal
          isOpen={showProgress}
          onClose={handleProgressClose}
          campaignName={name || `${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} Campaign`}
          status={progressStatus}
          progress={progressValue}
          stats={progressStats}
          errorMessage={progressError}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Create Campaign
            </DialogTitle>
          </DialogHeader>
          {wizardContent}
        </DialogContent>
      </Dialog>

      <CampaignProgressModal
        isOpen={showProgress}
        onClose={handleProgressClose}
        campaignName={name || `${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} Campaign`}
        status={progressStatus}
        progress={progressValue}
        stats={progressStats}
        errorMessage={progressError}
      />
    </>
  );
};
