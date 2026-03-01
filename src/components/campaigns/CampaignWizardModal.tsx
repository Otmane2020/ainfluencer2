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
import { Badge } from "@/components/ui/badge";
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
  Linkedin,
  TrendingUp,
  Clock,
  Music,
  Sparkles,
  Package,
  X,
  Plus,
  ExternalLink,
  FileText,
  Monitor,
  Smartphone,
  Copy,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from "react-icons/fa";
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

interface PlatformData {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  platform_formats: FormatData[];
}

interface FormatData {
  id: string;
  format_slug: string;
  label: string;
  content_type: string;
  aspect_ratio: string | null;
  recommended_resolution: string | null;
  max_duration_sec: number | null;
  max_text_chars: number | null;
  recommended_frequency: string | null;
  notes: string | null;
}

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "urgent", label: "Urgent" },
  { id: "luxurious", label: "Luxurious" },
  { id: "playful", label: "Playful" },
];

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: FaInstagram,
  facebook: FaFacebookF,
  linkedin: FaLinkedinIn,
  tiktok: FaTiktok,
  youtube: FaYoutube,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "from-purple-600 via-pink-500 to-orange-400",
  facebook: "from-blue-600 to-blue-700",
  linkedin: "from-blue-700 to-blue-800",
  tiktok: "from-gray-900 to-black",
  youtube: "from-red-600 to-red-700",
};

const CONTENT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  image: ImageIcon,
  text: FileText,
  carousel: Layers,
  live: Monitor,
  article: FileText,
};

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
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({});

  // Progress modal state
  const [showProgress, setShowProgress] = useState(false);
  const [progressStatus, setProgressStatus] = useState<"creating" | "scheduling" | "completed" | "error">("creating");
  const [progressValue, setProgressValue] = useState(0);
  const [progressStats, setProgressStats] = useState<{ videos: number; images: number; total: number } | undefined>();
  const [progressError, setProgressError] = useState<string | undefined>();
  const [progressStalled, setProgressStalled] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const lastPollCountRef = useRef(0);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedPlatformSlug, setSelectedPlatformSlug] = useState("");
  const [selectedFormatId, setSelectedFormatId] = useState("");
  const [linkedinMode, setLinkedinMode] = useState<"story" | "reaction">("story");
  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSuggestingProduct, setIsSuggestingProduct] = useState(false);
  const autoSuggestedProjectIdRef = useRef<string | null>(null);
  const isLoadingServicesRef = useRef(false);
  const [postingHour, setPostingHour] = useState(10);
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [contentVolume, setContentVolume] = useState(8);
  const [brandOptions, setBrandOptions] = useState<BrandOptionsState>({
    includeLogo: false,
    includeUrl: false,
    includeText: false,
    includeAvatar: false,
  });

  // AI Generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [generatedVideoScript, setGeneratedVideoScript] = useState("");
  const [generatedCaption, setGeneratedCaption] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      fetchPlatforms();
      fetchConnectedPlatforms();
      fetchCampaignCount();
      // Reset form
      setStep(1);
      setProjectId("");
      setSelectedPlatformSlug("");
      setSelectedFormatId("");
      setLinkedinMode("story");
      setTone("professional");
      setSubject("");
      setServiceTags([]);
      setNewTag("");
      autoSuggestedProjectIdRef.current = null;
      isLoadingServicesRef.current = false;
      setPostingHour(10);
      setTimezone("Europe/Paris");
      setContentVolume(8);
      setBrandOptions({ includeLogo: false, includeUrl: false, includeText: false, includeAvatar: false });
      setGeneratedVideoScript("");
      setGeneratedCaption("");
    }
  }, [isOpen]);

  const fetchCampaignCount = async () => {
    const { count } = await supabase.from("campaigns").select("*", { count: "exact", head: true });
    setName(`Campaign ${(count || 0) + 1}`);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name, theme_color, url, description").order("name");
    if (data) {
      setProjects(data);
      if (data.length > 0 && !projectId) setProjectId(data[0].id);
    }
  };

  const fetchPlatforms = async () => {
    const { data, error } = await supabase
      .from("platforms")
      .select("*, platform_formats(*)")
      .order("name");
    if (data) setPlatforms(data);
    if (error) console.error("Error fetching platforms:", error);
  };

  const fetchConnectedPlatforms = async () => {
    if (!user) return;
    try {
      const [metaRes, linkedinRes, tiktokRes, youtubeRes] = await Promise.all([
        supabase.from("meta_connections").select("page_id, instagram_id").eq("user_id", user.id).limit(1),
        supabase.from("linkedin_connections").select("id").eq("user_id", user.id).limit(1),
        supabase.from("tiktok_connections").select("id").eq("user_id", user.id).limit(1),
        supabase.from("youtube_connections").select("id").eq("user_id", user.id).limit(1),
      ]);
      const meta = metaRes.data?.[0];
      setConnectedPlatforms({
        facebook: !!meta?.page_id,
        instagram: !!meta?.instagram_id,
        youtube: !!(youtubeRes.data?.length),
        linkedin: !!(linkedinRes.data?.length),
        tiktok: !!(tiktokRes.data?.length),
      });
    } catch (err) {
      console.error("Failed to fetch connected platforms:", err);
    }
  };

  // Auto-suggest services
  const previousProjectIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (previousProjectIdRef.current === null) { previousProjectIdRef.current = projectId; return; }
    if (previousProjectIdRef.current !== projectId) {
      setServiceTags([]); autoSuggestedProjectIdRef.current = null; isLoadingServicesRef.current = false;
      previousProjectIdRef.current = projectId;
    }
  }, [projectId]);

  useEffect(() => {
    if (step !== 1 || !projects.length || !projectId) return;
    if (autoSuggestedProjectIdRef.current === projectId || serviceTags.length > 0 || isLoadingServicesRef.current) return;
    const proj = projects.find(p => p.id === projectId);
    if (!proj?.url) return;
    autoSuggestedProjectIdRef.current = projectId;
    loadServicesFromCache(projectId, proj.url);
  }, [projectId, step, projects.length, serviceTags.length]);

  const loadServicesFromCache = async (projId: string, url: string) => {
    if (isLoadingServicesRef.current) return;
    isLoadingServicesRef.current = true;
    setIsSuggestingProduct(true);
    try {
      const { data: projectData } = await supabase.from("projects").select("scraped_markdown, scraped_data").eq("id", projId).single();
      if (projectData?.scraped_data) {
        const scraped = projectData.scraped_data as { services?: string[] };
        if (scraped.services?.length) {
          setServiceTags(scraped.services.slice(0, 8));
          setIsSuggestingProduct(false);
          return;
        }
      }
      const { data } = await supabase.functions.invoke("scrape-project-url", { body: { url } });
      if (data?.success && data.services?.length > 0) {
        setServiceTags(data.services.slice(0, 8));
      }
    } catch { /* silent */ } finally {
      setIsSuggestingProduct(false);
      isLoadingServicesRef.current = false;
    }
  };

  const handleSuggestProduct = async () => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj?.url) { toast({ title: "No URL", description: "This project has no URL", variant: "destructive" }); return; }
    setIsSuggestingProduct(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-project-url", { body: { url: proj.url } });
      if (error) throw error;
      if (data?.success && data.services?.length) {
        setServiceTags(prev => [...new Set([...prev, ...data.services.slice(0, 8)])].slice(0, 8));
        toast({ title: "Services detected!", description: `${data.services.length} services found` });
      }
    } catch { toast({ title: "Failed", description: "Enter services manually", variant: "destructive" }); }
    finally { setIsSuggestingProduct(false); }
  };

  // Get selected platform and format
  const selectedPlatform = platforms.find(p => p.slug === selectedPlatformSlug);
  const selectedFormat = selectedPlatform?.platform_formats.find(f => f.id === selectedFormatId);

  // Generate AI content using project context
  const handleGenerateContent = async (type: "video_prompt" | "post_caption") => {
    if (!selectedPlatformSlug || !selectedFormat) return;
    const setLoading = type === "video_prompt" ? setIsGeneratingVideo : setIsGeneratingCaption;
    const setResult = type === "video_prompt" ? setGeneratedVideoScript : setGeneratedCaption;

    setLoading(true);
    try {
      const proj = projects.find(p => p.id === projectId);
      // Fetch full project context for AI generation
      const { data: fullProject } = await supabase
        .from("projects")
        .select("name, description, url, marketing_context, ai_context_summary, scraped_markdown, detected_language")
        .eq("id", projectId)
        .single();

      const mktCtx = fullProject?.marketing_context as Record<string, any> | null;
      const topicParts = [
        ...(serviceTags.length > 0 ? serviceTags : []),
        mktCtx?.usp || "",
        mktCtx?.target_audience || "",
        fullProject?.description || "",
      ].filter(Boolean);
      const topic = subject || topicParts.join(". ") || "our products and services";
      const cta = mktCtx?.cta || mktCtx?.call_to_action || "Learn more";

      const { data, error } = await supabase.functions.invoke("generate-platform-content", {
        body: {
          action: "generate",
          platform_slug: selectedPlatformSlug,
          format_slug: selectedFormat.format_slug,
          generation_type: type,
          variables: {
            brand: fullProject?.name || proj?.name || "Our Brand",
            topic,
            tone,
            cta,
            duration: selectedFormat.max_duration_sec ? String(selectedFormat.max_duration_sec) : "30",
          },
          project_context: fullProject?.ai_context_summary || null,
        },
      });
      if (error) throw error;
      setResult(data.generated_text || "");
      toast({ title: "Content generated!", description: `${type === "video_prompt" ? "Video script" : "Caption"} ready` });
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({ title: "Error", description: err.message || "Generation failed", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!user || !projectId || !selectedFormatId) return;
    setIsSubmitting(true);
    setShowProgress(true);
    setProgressStatus("creating");
    setProgressValue(10);
    setProgressError(undefined);

    const campaignName = name || `${selectedPlatformSlug} ${linkedinMode === "reaction" ? "Reaction" : selectedFormat?.label || ""} Campaign`;
    const isLinkedInReaction = selectedPlatformSlug === "linkedin" && linkedinMode === "reaction";
    const campaignType = isLinkedInReaction ? "linkedin_reaction" : selectedFormat?.content_type === "video" ? "video" : selectedFormat?.content_type === "text" || selectedFormat?.content_type === "article" ? "image" : "mixed";

    try {
      setProgressValue(20);
      const { data: newCampaign, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          project_id: projectId,
          name: campaignName,
          campaign_type: campaignType,
          platform_format_id: selectedFormatId,
          videos_per_month: selectedFormat?.content_type === "video" ? contentVolume : 0,
          images_per_month: selectedFormat?.content_type !== "video" ? contentVolume : 0,
          posts_per_week: Math.ceil(contentVolume / 4),
          format: selectedFormat?.aspect_ratio === "9:16" ? "reel" : selectedFormat?.aspect_ratio === "16:9" ? "landscape" : "reel",
          tone,
          subject,
          ai_context: serviceTags.length > 0 ? serviceTags.join(", ") : null,
          posting_hour: postingHour,
          timezone,
          status: "draft",
          include_logo: brandOptions.includeLogo,
          include_url: brandOptions.includeUrl,
          include_avatar: brandOptions.includeAvatar,
          include_text: brandOptions.includeText,
          [`${selectedPlatformSlug}_enabled`]: true,
          instagram_enabled: selectedPlatformSlug === "instagram",
          facebook_enabled: selectedPlatformSlug === "facebook",
          linkedin_enabled: selectedPlatformSlug === "linkedin",
          tiktok_enabled: selectedPlatformSlug === "tiktok",
          youtube_enabled: selectedPlatformSlug === "youtube",
        })
        .select()
        .single();

      if (error) throw error;

      setProgressStatus("scheduling");
      setProgressValue(30);
      setActiveCampaignId(newCampaign.id);

      supabase.functions.invoke("generate-campaign-content", {
        body: {
          campaignId: newCampaign.id,
          platforms: [selectedPlatformSlug],
          includeLogo: brandOptions.includeLogo,
          includeUrl: brandOptions.includeUrl,
          includeAvatar: brandOptions.includeAvatar,
          includeText: brandOptions.includeText,
          format: selectedFormat?.aspect_ratio === "9:16" ? "reel" : "landscape",
          tone,
          subject: subject || null,
          serviceTags: serviceTags.length > 0 ? serviceTags : null,
        },
      }).catch((err: any) => console.warn("Edge function fire-and-forget:", err));

      // Poll for progress
      const targetTotal = contentVolume;
      const pollInterval = setInterval(async () => {
        try {
          const { count } = await supabase
            .from("scheduled_posts")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", newCampaign.id);
          const done = count || 0;
          setProgressValue(Math.min(95, 30 + Math.round((done / Math.max(targetTotal, 1)) * 65)));
          if (done >= targetTotal) {
            clearInterval(pollInterval);
            setProgressValue(100);
            setProgressStatus("completed");
            setProgressStats({ videos: 0, images: done, total: done });
            setIsSubmitting(false);
            onSuccess();
          }
        } catch { /* silent */ }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
        supabase.from("scheduled_posts").select("*", { count: "exact", head: true })
          .eq("campaign_id", newCampaign.id)
          .then(({ count }) => {
            const done = count || 0;
            if (done > 0) {
              setProgressValue(100);
              setProgressStatus("completed");
              setProgressStats({ videos: 0, images: done, total: done });
              onSuccess();
            } else {
              setProgressStatus("error");
              setProgressError("Generation is taking longer than expected. Posts will appear shortly.");
            }
            setIsSubmitting(false);
          });
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error("Campaign creation error:", error);
      setProgressStatus("error");
      setProgressError("Unable to create campaign. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    if (progressStatus === "completed") onClose();
  };

  const handleResumeCampaign = () => {
    if (!activeCampaignId) return;
    setProgressStalled(false);
    supabase.functions.invoke("generate-campaign-content", {
      body: { campaignId: activeCampaignId, platforms: [selectedPlatformSlug] },
    }).catch(() => {});
    toast({ title: "Resuming generation", description: "Campaign generation re-triggered." });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return projectId !== "";
      case 2: return selectedPlatformSlug !== "";
      case 3: return selectedFormatId !== "";
      case 4: return true;
      case 5: return true;
      default: return true;
    }
  };

  const totalSteps = 5;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  const wizardContent = (
    <>
      {/* Progress bar */}
      <div className="flex gap-1 mb-4 px-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1" style={{ maxHeight: isMobile ? "60vh" : "55vh" }}>
        <AnimatePresence mode="wait">
          {/* Step 1: Project Selection */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <Label className="text-base">Select Project</Label>
                <p className="text-sm text-muted-foreground">Choose which brand/project this campaign is for</p>
              </div>

              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Campaign" />
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                  <SelectContent className="bg-card">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.theme_color }} />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Services */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Products / Services</Label>
                  {projectId && projects.find(p => p.id === projectId)?.url && (
                    <Button type="button" variant="outline" size="sm" onClick={handleSuggestProduct} disabled={isSuggestingProduct} className="h-8 text-xs gap-1.5">
                      {isSuggestingProduct ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      Auto-detect
                    </Button>
                  )}
                </div>
                {serviceTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    {serviceTags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-sm font-medium">
                        {tag}
                        <button type="button" onClick={() => setServiceTags(prev => prev.filter((_, idx) => idx !== i))} className="opacity-50 hover:opacity-100 hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="e.g. Web Design, SEO..." className="flex-1" disabled={serviceTags.length >= 8}
                    onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { e.preventDefault(); if (!serviceTags.includes(newTag.trim())) setServiceTags(prev => [...prev, newTag.trim()].slice(0, 8)); setNewTag(""); }}} />
                  <Button type="button" variant="secondary" onClick={() => { if (newTag.trim() && !serviceTags.includes(newTag.trim())) { setServiceTags(prev => [...prev, newTag.trim()].slice(0, 8)); setNewTag(""); }}} disabled={!newTag.trim() || serviceTags.length >= 8} className="shrink-0 gap-1.5">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Platform Selection */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <Label className="text-base">Choose Platform</Label>
                <p className="text-sm text-muted-foreground">Each platform has optimized formats and prompts</p>
              </div>

              <div className="grid gap-3">
                {platforms.map((platform) => {
                  const Icon = PLATFORM_ICONS[platform.slug] || Layers;
                  const isConnected = connectedPlatforms[platform.slug];
                  const isSelected = selectedPlatformSlug === platform.slug;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => { setSelectedPlatformSlug(platform.slug); setSelectedFormatId(""); }}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`rounded-lg p-3 bg-gradient-to-br ${PLATFORM_COLORS[platform.slug] || "from-gray-500 to-gray-600"} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{platform.name}</p>
                          {isConnected && <Badge variant="outline" className="text-[10px] h-4 text-green-500 border-green-500/30">Connected</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{platform.platform_formats?.length || 0} formats available</p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>

              {/* LinkedIn Mode Selector */}
              {selectedPlatformSlug === "linkedin" && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium">LinkedIn Campaign Mode</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLinkedinMode("story")}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        linkedinMode === "story" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Linkedin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Story Posts</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Value-first storytelling posts based on your brand context</p>
                    </button>
                    <button
                      onClick={() => setLinkedinMode("reaction")}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        linkedinMode === "reaction" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Reaction Posts</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Short commentary on trending SEO/AI/AEO news — "Here's my take..."</p>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Format Selection */}
          {step === 3 && selectedPlatform && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <Label className="text-base">Choose Format</Label>
                <p className="text-sm text-muted-foreground">
                  Select the content format for {selectedPlatform.name}
                </p>
              </div>

              <div className="grid gap-3">
                {selectedPlatform.platform_formats.map((format) => {
                  const TypeIcon = CONTENT_TYPE_ICONS[format.content_type] || Layers;
                  const isSelected = selectedFormatId === format.id;
                  return (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormatId(format.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <TypeIcon className="h-5 w-5 text-primary" />
                        <span className="font-medium">{format.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {format.aspect_ratio && (
                          <Badge variant="outline" className="text-[10px]">
                            <Smartphone className="h-3 w-3 mr-1" />
                            {format.aspect_ratio}
                          </Badge>
                        )}
                        {format.recommended_resolution && (
                          <Badge variant="outline" className="text-[10px]">{format.recommended_resolution}</Badge>
                        )}
                        {format.max_duration_sec && (
                          <Badge variant="outline" className="text-[10px]">Max {format.max_duration_sec}s</Badge>
                        )}
                        {format.recommended_frequency && (
                          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                            📅 {format.recommended_frequency}
                          </Badge>
                        )}
                      </div>
                      {format.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{format.notes}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 4: AI Prompt Generation */}
          {step === 4 && selectedFormat && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
               <div>
                 <Label className="text-base">Generate Content</Label>
                 <p className="text-sm text-muted-foreground">
                   AI-powered scripts and captions for {selectedPlatform?.name} {selectedFormat.label} — based on your project context
                 </p>
               </div>

               {/* Project context summary */}
               {(() => {
                 const proj = projects.find(p => p.id === projectId);
                 return proj ? (
                   <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
                     <p className="text-xs font-medium text-muted-foreground">Project Context</p>
                     <p className="text-sm font-medium">{proj.name}</p>
                     {proj.description && <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>}
                     {serviceTags.length > 0 && (
                       <div className="flex flex-wrap gap-1 mt-1">
                         {serviceTags.map((tag, i) => (
                           <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                         ))}
                       </div>
                     )}
                   </div>
                 ) : null;
               })()}

               {/* Optional subject override */}
               <div className="space-y-2">
                 <Label className="text-xs text-muted-foreground">Optional: Override topic</Label>
                 <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Leave empty to use project context" className="text-sm" />
               </div>

               <div className="space-y-2">
                 <Label>Tone</Label>
                 <Select value={tone} onValueChange={setTone}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent className="bg-card">
                     {TONES.map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}
                   </SelectContent>
                 </Select>
               </div>

               {/* Generate buttons */}
               <div className="grid grid-cols-2 gap-3">
                 {selectedFormat.content_type === "video" && (
                   <Button
                     variant="outline"
                     className="h-auto p-3 flex flex-col gap-1"
                     onClick={() => handleGenerateContent("video_prompt")}
                     disabled={isGeneratingVideo}
                   >
                     {isGeneratingVideo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5 text-primary" />}
                     <span className="text-xs">Generate Video Script</span>
                   </Button>
                 )}
                 <Button
                   variant="outline"
                   className="h-auto p-3 flex flex-col gap-1"
                   onClick={() => handleGenerateContent("post_caption")}
                   disabled={isGeneratingCaption}
                 >
                   {isGeneratingCaption ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5 text-primary" />}
                   <span className="text-xs">Generate Caption</span>
                 </Button>
               </div>

              {/* Generated results */}
              {generatedVideoScript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1"><Video className="h-3 w-3" /> Video Script</Label>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedVideoScript)} className="h-6 text-xs gap-1">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <Textarea value={generatedVideoScript} onChange={(e) => setGeneratedVideoScript(e.target.value)} rows={6} className="text-xs" />
                </div>
              )}

              {generatedCaption && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1"><FileText className="h-3 w-3" /> Caption</Label>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedCaption)} className="h-6 text-xs gap-1">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <Textarea value={generatedCaption} onChange={(e) => setGeneratedCaption(e.target.value)} rows={4} className="text-xs" />
                </div>
              )}
            </motion.div>
          )}

          {/* Step 5: Schedule & Launch */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <Label className="text-base">Schedule & Launch</Label>
                <p className="text-sm text-muted-foreground">Configure volume and posting schedule</p>
              </div>

              {/* Content Volume */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Content per month</Label>
                  <span className="text-xl font-bold text-primary">{contentVolume}</span>
                </div>
                <Slider value={[contentVolume]} onValueChange={([v]) => setContentVolume(v)} min={1} max={30} step={1} className="py-2" />
                {selectedFormat?.recommended_frequency && (
                  <p className="text-xs text-muted-foreground">
                    Recommended: {selectedFormat.recommended_frequency}
                  </p>
                )}
              </div>

              {/* Brand Options */}
              <BrandOptions options={brandOptions} onChange={setBrandOptions} />

              {/* Schedule */}
              <div className="rounded-xl border border-border p-4 space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Posting Schedule
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Posting Hour</Label>
                    <Select value={postingHour.toString()} onValueChange={(v) => setPostingHour(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card max-h-48">
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, "0")}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card">
                        {TIMEZONES.map((tz) => (<SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">Summary</p>
                <p className="text-xs text-muted-foreground">
                  {selectedPlatform?.name} • {selectedFormat?.label} • {contentVolume} posts/month • {postingHour.toString().padStart(2, "0")}:00
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t mt-4">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()} size={isMobile ? "sm" : "default"}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step < totalSteps ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} size={isMobile ? "sm" : "default"}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()} size={isMobile ? "sm" : "default"}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" /> Launch Campaign</>
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
                <Wand2 className="h-5 w-5 text-primary" /> Create Campaign
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">{wizardContent}</div>
          </DrawerContent>
        </Drawer>
        <CampaignProgressModal
          campaignName={name}
          isOpen={showProgress}
          onClose={handleProgressClose}
          status={progressStatus}
          progress={progressValue}
          stats={progressStats}
          errorMessage={progressError}
          isStalled={progressStalled}
          onResume={handleResumeCampaign}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" /> Create Campaign
            </DialogTitle>
          </DialogHeader>
          {wizardContent}
        </DialogContent>
      </Dialog>
      <CampaignProgressModal
        campaignName={name}
        isOpen={showProgress}
        onClose={handleProgressClose}
        status={progressStatus}
        progress={progressValue}
        stats={progressStats}
        errorMessage={progressError}
        isStalled={progressStalled}
        onResume={handleResumeCampaign}
      />
    </>
  );
};
