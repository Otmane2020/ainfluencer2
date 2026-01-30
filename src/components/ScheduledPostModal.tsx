import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Instagram,
  Facebook,
  Linkedin,
  Video,
  Image as ImageIcon,
  FileText,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Send,
  Loader2,
  Music2,
  Check,
  Wand2,
  Share2,
  Link,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { ProductSelector } from "./ProductSelector";
import { COMMERCIAL_PRODUCTS, CommercialProduct, IMAGE_QUALITY_LEVELS, QualityLevel } from "@/lib/commercialProducts";
import { AVAILABLE_VOICES, AVAILABLE_LANGUAGES, Voice, VoiceLanguage, getVoicesByLanguage, getDefaultVoiceForLanguage } from "@/lib/voices";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SocialShareModal } from "@/components/SocialShareModal";
import { PaywallModal } from "@/components/PaywallModal";


// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

interface ScheduledPost {
  id: string;
  project_id: string;
  user_id: string;
  content_type: string;
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  platforms: string[] | null;
  scheduled_for: string;
  status: string | null;
  ai_prompt: string | null;
  published_at: string | null;
  error_message: string | null;
  campaign_id?: string | null;
}

interface ScheduledPostModalProps {
  post: ScheduledPost | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (post: ScheduledPost) => void;
  onDelete?: (postId: string) => void;
  onPublishNow?: (post: ScheduledPost) => void;
  onUpdate?: () => void;
}

const platformConfig = {
  instagram: {
    icon: Instagram,
    name: "Instagram",
    gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
    color: "#E1306C",
  },
  facebook: {
    icon: Facebook,
    name: "Facebook",
    gradient: "from-[#1877F2] to-[#0D65D9]",
    color: "#1877F2",
  },
  linkedin: {
    icon: Linkedin,
    name: "LinkedIn",
    gradient: "from-[#0A66C2] to-[#004182]",
    color: "#0A66C2",
  },
  tiktok: {
    icon: TikTokIcon,
    name: "TikTok",
    gradient: "from-[#000000] via-[#25F4EE] to-[#FE2C55]",
    color: "#000000",
  },
};

const statusConfig = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", color: "bg-blue-500/20 text-blue-600" },
  published: { label: "Published", color: "bg-green-500/20 text-green-600" },
  failed: { label: "Failed", color: "bg-destructive/20 text-destructive" },
};

const contentTypeConfig = {
  video: { icon: Video, label: "Video" },
  image: { icon: ImageIcon, label: "Image" },
  text: { icon: FileText, label: "Text" },
  reel: { icon: Music2, label: "Reel" },
};

export const ScheduledPostModal = ({
  post,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPublishNow,
  onUpdate,
}: ScheduledPostModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [publishingStatus, setPublishingStatus] = useState<string>("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CommercialProduct | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  
  // Expand/collapse states for long text
  const [expandPrompt, setExpandPrompt] = useState(false);
  const [expandContent, setExpandContent] = useState(false);
  
  // Edit states for prompt and content
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [editedContent, setEditedContent] = useState("");
  
  // Local state to track generated media (updates immediately after generation)
  const [localMediaUrl, setLocalMediaUrl] = useState<string | null>(null);
  const [localMusicUrl, setLocalMusicUrl] = useState<string | null>(null);
  const [reelDuration, setReelDuration] = useState<number>(10);
  
  // Project context for brand-aware generation
  const [projectContext, setProjectContext] = useState<{
    name: string;
    logo_url: string | null;
    url: string | null;
    description: string | null;
  } | null>(null);
  
  // Video generation options
  const [enableVoice, setEnableVoice] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>("en");
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [videoFormat, setVideoFormat] = useState<"vertical" | "story" | "landscape" | "mix">("vertical");
  
  // Image generation options
  const [imageQuality, setImageQuality] = useState<QualityLevel>(IMAGE_QUALITY_LEVELS[1]); // Default to Medium
  
  // Share modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // Paywall modal for upgrade prompts
  const [paywallOpen, setPaywallOpen] = useState(false);
  
  // Track if this is an "Image as Reel" post (image campaign with video content_type)
  const [isImageAsReel, setIsImageAsReel] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Truncate text helper
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return { text, truncated: false };
    return { text: text.substring(0, maxLength) + "...", truncated: true };
  };

  // Initialize platforms, voice, and fetch project context
  useEffect(() => {
    if (post?.platforms) {
      setSelectedPlatforms(post.platforms);
    }
    // Sync local media URL with post prop
    setLocalMediaUrl(post?.media_url || null);
    // Set default voice for language
    const defaultVoice = getDefaultVoiceForLanguage(selectedLanguage);
    setSelectedVoice(defaultVoice);
    
    // Reset expand states when post changes
    setExpandPrompt(false);
    setExpandContent(false);
    setIsEditingPrompt(false);
    setIsEditingContent(false);
    
    // Fetch project context for brand-aware generation
    const fetchProjectContext = async () => {
      if (!post?.project_id) return;
      const { data } = await supabase
        .from("projects")
        .select("name, logo_url, url, description")
        .eq("id", post.project_id)
        .single();
      if (data) {
        setProjectContext(data);
      }
    };
    fetchProjectContext();
    
    // Check if this is an "Image as Reel" post (image campaign but video content_type)
    const checkImageAsReel = async () => {
      if (!post?.campaign_id) {
        setIsImageAsReel(false);
        return;
      }
      
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("campaign_type")
        .eq("id", post.campaign_id)
        .maybeSingle();
      
      // If campaign is "image" type but post content_type is "video", it's Image as Reel
      const isReel = campaign?.campaign_type === "image" && post.content_type === "video";
      setIsImageAsReel(isReel);
    };
    checkImageAsReel();
  }, [post, selectedLanguage]);

  if (!post) return null;

  const status = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.draft;
  const contentType = contentTypeConfig[post.content_type as keyof typeof contentTypeConfig] || contentTypeConfig.text;
  const ContentIcon = contentType.icon;

  // Filter products based on content type
  const getRelevantProducts = () => {
    if (post.content_type === "video") {
      return COMMERCIAL_PRODUCTS.filter((p) => p.category === "video" || p.category === "avatar");
    } else if (post.content_type === "image") {
      return COMMERCIAL_PRODUCTS.filter((p) => p.category === "image");
    }
    return COMMERCIAL_PRODUCTS.filter((p) => p.category === "image");
  };

  const relevantProducts = getRelevantProducts();

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSavePlatforms = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "Selection required",
        description: "Select at least one platform",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ platforms: selectedPlatforms })
        .eq("id", post.id);

      if (error) throw error;

      toast({
        title: "Platforms updated ✓",
        description: `Publishing to ${selectedPlatforms.length} platform(s)`,
      });
      
      onUpdate?.();
    } catch (error) {
      console.error("Update platforms error:", error);
      toast({
        title: "Error",
        description: "Unable to update platforms",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save edited prompt
  const handleSavePrompt = async () => {
    if (!editedPrompt.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ ai_prompt: editedPrompt })
        .eq("id", post.id);

      if (error) throw error;

      toast({
        title: "Prompt updated ✓",
        description: "AI prompt has been saved",
      });
      setIsEditingPrompt(false);
      onUpdate?.();
    } catch (error) {
      console.error("Update prompt error:", error);
      toast({
        title: "Error",
        description: "Unable to update prompt",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save edited content
  const handleSaveContent = async () => {
    if (!editedContent.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ text_content: editedContent })
        .eq("id", post.id);

      if (error) throw error;

      toast({
        title: "Content updated ✓",
        description: "Post content has been saved",
      });
      setIsEditingContent(false);
      onUpdate?.();
    } catch (error) {
      console.error("Update content error:", error);
      toast({
        title: "Error",
        description: "Unable to update content",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(post.id);
      toast({
        title: "Post deleted",
        description: "Post has been successfully deleted",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to delete post",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublishNow = async () => {
    if (!onPublishNow) return;
    
    // For video content, we need to generate first
    if (post.content_type === "video" && !post.media_url) {
      // Need to generate video + social content first
      await handleGenerateAndPublish();
      return;
    }
    
    setIsPublishing(true);
    setPublishingStatus("Connecting to social platforms...");
    
    try {
      // Show platform-specific status
      const metaPlatforms = selectedPlatforms.filter(p => p === "facebook" || p === "instagram");
      if (metaPlatforms.length > 0) {
        setPublishingStatus(`Publishing to ${metaPlatforms.join(" & ")}...`);
      }
      
      await onPublishNow(post);
      setPublishingStatus("Published successfully!");
      
      // CalendarPage already shows the success toast, don't duplicate
      // Brief delay to show success state
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      setPublishingStatus("Publishing failed");
      // CalendarPage already shows the error toast, don't duplicate
    } finally {
      setIsPublishing(false);
      setPublishingStatus("");
    }
  };

  // Generate video + social content + hashtags, then publish
  const handleGenerateAndPublish = async () => {
    setIsPublishing(true);
    setPublishingStatus("Generating social content...");
    
    try {
      // Step 1: Generate social post content (description + hashtags) based on AI prompt
      toast({
        title: "Generating content...",
        description: "Creating social post description and hashtags",
      });

      // Call the suggest-content edge function to generate social post content
      const { data: contentData, error: contentError } = await supabase.functions.invoke("suggest-content", {
        body: {
          contentType: "social_post",
          projectDescription: post.ai_prompt || "Engaging social media content",
          projectName: post.ai_prompt?.substring(0, 50) || "Social Post",
          projectUrl: null,
        },
      });

      if (contentError) {
        console.error("Content generation error:", contentError);
        throw new Error("Failed to generate social content");
      }

      console.log("Content generation response:", contentData);

      // Extract the generated content (handle both response formats)
      let socialDescription = "";
      let hashtags: string[] = [];
      
      if (contentData?.suggestion) {
        // New social_post format
        socialDescription = contentData.suggestion.content || "";
        hashtags = contentData.suggestion.hashtags || [];
      } else if (contentData?.suggestions?.[0]) {
        // Legacy format - use first suggestion
        socialDescription = contentData.suggestions[0].content || "";
        hashtags = contentData.suggestions[0].hashtags || [];
      }
      
      // Build final text content (description + hashtags, NOT the original prompt)
      const formattedHashtags = Array.isArray(hashtags) 
        ? hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')
        : '';
      
      // Use generated content, NOT the original prompt
      const finalTextContent = socialDescription 
        ? `${socialDescription}\n\n${formattedHashtags}`.trim()
        : formattedHashtags.trim();

      console.log("Generated social content:", finalTextContent.substring(0, 100) + "...");

      setPublishingStatus("Saving content...");

      // Step 2: Update the post with generated content
      const { error: updateError } = await supabase
        .from("scheduled_posts")
        .update({ 
          text_content: finalTextContent,
          status: "scheduled",
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      // Step 3: Generate video if needed
      if (post.content_type === "video" && !post.media_url) {
        if (selectedProduct) {
          // Actual video generation with CometAPI
          setPublishingStatus(`Generating video with ${selectedProduct.name}...`);
          
          toast({
            title: "Generating video...",
            description: `Using ${selectedProduct.name}`,
          });

          const orientation = videoFormat === "landscape" ? "landscape" : "portrait";
          const modelId = selectedProduct.internalModels?.[0] || "sora-2";
          
          const { data: videoData, error: videoError } = await supabase.functions.invoke("generate-video-sora", {
            body: {
              prompt: post.ai_prompt || "Create an engaging social media video",
              duration: 8,
              orientation,
              format: videoFormat === "mix" ? "vertical" : videoFormat,
              model: modelId,
              avatarUrl: avatarUrl || undefined,
            },
          });

          if (videoError) {
            console.warn("Video generation started in background:", videoError);
          } else {
            console.log("Video task started:", videoData?.taskId);
            
            await supabase
              .from("scheduled_posts")
              .update({ 
                status: "scheduled",
                error_message: `Video generation started: ${videoData?.taskId || 'pending'}`,
              })
              .eq("id", post.id);
          }
        }
      }

      setPublishingStatus("Publishing to platforms...");

      toast({
        title: "Content generated ✓",
        description: "Social post with description and hashtags is ready",
      });

      onUpdate?.();
      
      // Now call the original publish handler
      if (onPublishNow) {
        await onPublishNow({
          ...post,
          text_content: finalTextContent,
        });
      }
      
      setPublishingStatus("Published successfully!");
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error("Generate and publish error:", error);
      setPublishingStatus("Failed");
      toast({
        title: "Error",
        description: "Unable to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
      setPublishingStatus("");
    }
  };

  const handleGenerateVideo = async () => {
    setIsGenerating(true);
    try {
      // Build brand-aware prompt
      let enhancedPrompt = post.ai_prompt || "Create an engaging social media video";
      
      // Add brand context if available
      if (projectContext) {
        const brandInfo = [];
        if (projectContext.name) brandInfo.push(`Brand: ${projectContext.name}`);
        if (projectContext.description) brandInfo.push(`About: ${projectContext.description.substring(0, 200)}`);
        if (projectContext.url) brandInfo.push(`Website: ${projectContext.url}`);
        
        if (brandInfo.length > 0) {
          enhancedPrompt = `${enhancedPrompt}\n\nBrand Context:\n${brandInfo.join('\n')}`;
        }
      }

      // Get orientation from format
      const orientation = videoFormat === "landscape" ? "landscape" : "portrait";
      
      // Default model - use selected product's internal model or fallback to kling-video (faster/cheaper)
      const modelId = selectedProduct?.internalModels?.[0] || "kling-video";

      toast({
        title: "Generating video...",
        description: `Using ${selectedProduct?.name || "AI"} - this may take 2-3 minutes`,
      });
      
      console.log("Video generation config:", {
        postId: post.id,
        product: selectedProduct?.id,
        model: modelId,
        enableVoice,
        voiceId: selectedVoice?.id,
        language: selectedLanguage,
        avatarUrl,
        format: videoFormat,
        orientation,
      });

      // Call video generation edge function
      const { data, error } = await supabase.functions.invoke("generate-video-sora", {
        body: {
          prompt: enhancedPrompt,
          duration: 5,
          orientation,
          format: videoFormat === "mix" ? "vertical" : videoFormat,
          model: modelId,
          avatarUrl: avatarUrl || undefined,
        },
      });

      // Check if upgrade is required (403 with requires_upgrade flag)
      if (error) {
        // Try to parse the error response for requires_upgrade flag
        try {
          const errorData = await error.context?.json?.() || {};
          if (errorData.requires_upgrade) {
            setPaywallOpen(true);
            toast({
              title: "Subscription required",
              description: "Video generation requires a Pro or Business plan",
            });
            return;
          }
        } catch {
          // If we can't parse, check error message
          if (error.message?.includes("requires_upgrade") || error.message?.includes("Subscription required")) {
            setPaywallOpen(true);
            return;
          }
        }
        throw error;
      }

      // Check if response indicates upgrade required
      if (data?.requires_upgrade) {
        setPaywallOpen(true);
        toast({
          title: "Subscription required",
          description: data.error || "Video generation requires a Pro or Business plan",
        });
        return;
      }

      // Check if we got a video URL directly (some models return immediately)
      if (data?.videoUrl) {
        // Update local state immediately for instant preview
        setLocalMediaUrl(data.videoUrl);
        
        // Update post with generated video
        const { error: updateError } = await supabase
          .from("scheduled_posts")
          .update({ 
            media_url: data.videoUrl,
            thumbnail_url: data.thumbnailUrl || null,
            status: "scheduled",
          })
          .eq("id", post.id);

        if (updateError) throw updateError;

        toast({
          title: "Video generated ✓",
          description: "Your video is ready",
        });
        
        onUpdate?.();
      } else if (data?.taskId) {
        // Video is being generated asynchronously - store task ID
        toast({
          title: "Video generation started ✓",
          description: `Task ID: ${data.taskId}. Check back in 2-3 minutes.`,
        });
        
        // Update post with task info - video will be added when complete by cron
        await supabase
          .from("scheduled_posts")
          .update({ 
            status: "scheduled",
            error_message: `Video generation in progress: ${data.taskId}`,
          })
          .eq("id", post.id);
          
        onUpdate?.();
      } else if (!data?.success && data?.error) {
        // Handle structured error response
        if (data.requires_upgrade) {
          setPaywallOpen(true);
          return;
        }
        throw new Error(data.error);
      } else {
        throw new Error("No video URL or task ID returned");
      }
    } catch (error: any) {
      console.error("Video generation error:", error);
      
      // Check if this is a paywall-related error
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes("Subscription") || errorMessage.includes("upgrade") || errorMessage.includes("Pro") || errorMessage.includes("Business")) {
        setPaywallOpen(true);
        return;
      }
      
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unable to generate video",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Reel using Kling Video via CometAPI (real MP4)
  const handleGenerateReel = async () => {
    setIsGenerating(true);
    try {
      // Build brand-aware prompt
      let enhancedPrompt = post.ai_prompt || "Create an eye-catching social media reel video";
      
      // Add brand context if available
      if (projectContext) {
        if (projectContext.name) enhancedPrompt += ` for ${projectContext.name} brand`;
        if (projectContext.description) enhancedPrompt += `. About: ${projectContext.description.substring(0, 150)}`;
      }

      toast({
        title: "Creating reel video...",
        description: projectContext?.name 
          ? `Generating Kling video for ${projectContext.name}` 
          : "Generating reel with Kling Video (~2-3 min)",
      });

      // Call generate-reel-video in async mode (returns taskId)
      const { data, error } = await supabase.functions.invoke("generate-reel-video", {
        body: {
          prompt: enhancedPrompt,
          brandName: projectContext?.name || undefined,
          duration: 5,
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.taskId) {
        throw new Error(data?.error || "Failed to start video generation");
      }

      const taskId = data.taskId;
      console.log("[Reel] Task started:", taskId);

      toast({
        title: "Video generation started",
        description: "Polling for completion... (this may take 2-3 minutes)",
      });

      // Poll for completion
      let videoUrl: string | null = null;
      const maxAttempts = 60; // 5 min max
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

        const { data: statusData, error: statusError } = await supabase.functions.invoke(
          "generate-reel-video",
          { body: {}, headers: {} }
        );

        // Use query param for status check
        const statusResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-reel-video?action=status&taskId=${taskId}`,
          {
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        );

        if (!statusResponse.ok) {
          console.log(`[Reel] Poll ${i + 1}/${maxAttempts}: HTTP ${statusResponse.status}`);
          continue;
        }

        const status = await statusResponse.json();
        console.log(`[Reel] Poll ${i + 1}/${maxAttempts}:`, status.status);

        if (status.status === "completed" && status.videoUrl) {
          videoUrl = status.videoUrl;
          break;
        } else if (status.status === "failed") {
          throw new Error("Video generation failed");
        }
      }

      if (!videoUrl) {
        throw new Error("Video generation timeout - please try again");
      }

      // Update local state immediately for instant preview
      setLocalMediaUrl(videoUrl);
      setLocalMusicUrl(null); // Real MP4 has audio baked in
      setReelDuration(5);
      
      // Update post with generated video
      const { error: updateError } = await supabase
        .from("scheduled_posts")
        .update({ 
          media_url: videoUrl,
          thumbnail_url: videoUrl,
          status: "scheduled",
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      toast({
        title: "Reel video ready! ✓",
        description: "Real MP4 video generated with Kling",
      });
      
      onUpdate?.();
    } catch (error: any) {
      console.error("Reel generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unable to generate reel",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate content (image or video) based on content type
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Check if this is Image as Reel mode (video from image + music)
      if (isImageAsReel) {
        // Use the Gemini + music video generation
        await handleGenerateReel();
        return;
      }
      
      if (post.content_type === "image") {
        // Build brand-aware prompt
        let enhancedPrompt = post.ai_prompt || "Create an engaging social media image";
        
        // Add brand context if available
        if (projectContext) {
          const brandInfo = [];
          if (projectContext.name) brandInfo.push(`Brand: ${projectContext.name}`);
          if (projectContext.description) brandInfo.push(`About: ${projectContext.description.substring(0, 200)}`);
          if (projectContext.url) brandInfo.push(`Website: ${projectContext.url}`);
          
          if (brandInfo.length > 0) {
            enhancedPrompt = `${enhancedPrompt}\n\nBrand Context:\n${brandInfo.join('\n')}`;
          }
        }
        
        toast({
          title: "Generating image...",
          description: projectContext?.name 
            ? `Creating visual for ${projectContext.name}` 
            : "Creating visual content from prompt",
        });

        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: enhancedPrompt,
            aspectRatio: "1:1",
            quality: imageQuality.id === "fast-image" ? "standard" : imageQuality.id === "medium-image" ? "pro" : "cinema",
            logoUrl: projectContext?.logo_url || undefined,
            brandName: projectContext?.name || undefined,
          },
        });

        if (error) throw error;

        if (data?.imageUrl) {
          // Update local state immediately for instant preview
          setLocalMediaUrl(data.imageUrl);
          
          // Update post with generated image
          const { error: updateError } = await supabase
            .from("scheduled_posts")
            .update({ 
              media_url: data.imageUrl,
              status: "scheduled",
            })
            .eq("id", post.id);

          if (updateError) throw updateError;

          toast({
            title: "Image generated ✓",
            description: "Your image is ready",
          });
          
          onUpdate?.();
        }
      } else if (post.content_type === "video") {
        // For actual videos (NOT reels), use CometAPI video generation
        await handleGenerateVideo();
        return;
      } else {
        // Text content - just generate social content
        toast({
          title: "Generating content...",
          description: "Creating social post description",
        });

        const { data, error } = await supabase.functions.invoke("suggest-content", {
          body: {
            contentType: "social_post",
            projectDescription: post.ai_prompt || "Engaging social media content",
            projectName: "Social Post",
            projectUrl: null,
          },
        });

        if (error) throw error;

        let textContent = "";
        if (data?.suggestion) {
          const content = data.suggestion.content || "";
          const hashtags = (data.suggestion.hashtags || [])
            .map((h: string) => h.startsWith('#') ? h : `#${h}`)
            .join(' ');
          textContent = `${content}\n\n${hashtags}`.trim();
        }

        if (textContent) {
          const { error: updateError } = await supabase
            .from("scheduled_posts")
            .update({ 
              text_content: textContent,
              status: "scheduled",
            })
            .eq("id", post.id);

          if (updateError) throw updateError;

          toast({
            title: "Content generated ✓",
            description: "Social post is ready",
          });
          
          onUpdate?.();
        }
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        title: "Generation failed",
        description: "Unable to generate content. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const availableVoices = getVoicesByLanguage(selectedLanguage);

  // Modal content shared between Dialog and Drawer
  const ModalContent = () => (
    <div className="flex flex-col h-full min-h-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 shrink-0">
          <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs sm:text-sm">Platforms</TabsTrigger>
          <TabsTrigger value="models" className="text-xs sm:text-sm">AI</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto mt-4 pr-2">
          <TabsContent value="details" className="space-y-4 m-0 px-1 pb-4">
            {/* Media Preview - Show from local state or post prop */}
            {(localMediaUrl || post.media_url || post.thumbnail_url) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-xl bg-muted border border-border"
              >
                {post.content_type === "video" ? (
                  <div className="aspect-[9/16] max-h-[400px] mx-auto">
                    {(localMediaUrl || post.media_url)?.includes('.mp4') || (localMediaUrl || post.media_url)?.includes('video') ? (
                      <video
                        src={localMediaUrl || post.media_url || undefined}
                        poster={post.thumbnail_url || undefined}
                        controls
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <img
                        src={localMediaUrl || post.media_url || post.thumbnail_url || undefined}
                        alt="Video thumbnail"
                        className="h-full w-full object-cover rounded-lg"
                      />
                    )}
                  </div>
                ) : (
                  <div className="aspect-square max-h-64 sm:max-h-80">
                    <img
                      src={localMediaUrl || post.media_url || post.thumbnail_url || undefined}
                      alt="Post media"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* AI Prompt / Subject - Editable */}
            {(post.ai_prompt || isEditingPrompt) && (
              <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Subject / AI Prompt
                  </h4>
                  {!isEditingPrompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1"
                      onClick={() => {
                        setEditedPrompt(post.ai_prompt || "");
                        setIsEditingPrompt(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      <span className="text-xs">Edit</span>
                    </Button>
                  )}
                </div>
                {isEditingPrompt ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full min-h-[100px] p-2 text-xs sm:text-sm rounded-lg bg-background border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your prompt..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingPrompt(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSavePrompt}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const { text, truncated } = truncateText(post.ai_prompt || "", 150);
                      return (
                        <>
                          <p className="text-xs sm:text-sm">
                            {expandPrompt ? post.ai_prompt : text}
                          </p>
                          {truncated && (
                            <button
                              onClick={() => setExpandPrompt(!expandPrompt)}
                              className="mt-2 text-xs font-medium text-primary hover:underline"
                            >
                              {expandPrompt ? "Show less" : "Read more"}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* Text Content - Editable */}
            {(post.text_content || isEditingContent) && (
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Content
                  </h4>
                  {!isEditingContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1"
                      onClick={() => {
                        setEditedContent(post.text_content || "");
                        setIsEditingContent(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      <span className="text-xs">Edit</span>
                    </Button>
                  )}
                </div>
                {isEditingContent ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full min-h-[120px] p-2 text-xs sm:text-sm rounded-lg bg-background border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your content..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingContent(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveContent}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const { text, truncated } = truncateText(post.text_content || "", 200);
                      return (
                        <>
                          <p className="whitespace-pre-wrap text-xs sm:text-sm">
                            {expandContent ? post.text_content : text}
                          </p>
                          {truncated && (
                            <button
                              onClick={() => setExpandContent(!expandContent)}
                              className="mt-2 text-xs font-medium text-primary hover:underline"
                            >
                              {expandContent ? "Show less" : "Read more"}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* Image Quality Selector - Only show for image content type */}
            {post.content_type === "image" && (
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <h4 className="mb-3 text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Image Quality
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_QUALITY_LEVELS.map((level) => {
                    const isSelected = imageQuality.id === level.id;
                    return (
                      <motion.button
                        key={level.id}
                        type="button"
                        onClick={() => setImageQuality(level)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 sm:p-3 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute right-1 top-1">
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                        <span className="text-lg">
                          {level.id === "fast-image" ? "⚡" : level.id === "medium-image" ? "✨" : "🎬"}
                        </span>
                        <span className="text-xs font-medium">{level.name}</span>
                        <span className="text-[10px] text-muted-foreground">${level.price.toFixed(0)}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current Platforms */}
            <div>
              <h4 className="mb-3 text-xs sm:text-sm font-medium text-muted-foreground">
                Current Platforms
              </h4>
              <div className="flex flex-wrap gap-2">
                {(post.platforms || []).map((platform) => {
                  const config = platformConfig[platform as keyof typeof platformConfig];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div
                      key={platform}
                      className="flex items-center gap-2 rounded-full bg-muted px-2.5 py-1"
                    >
                      <div
                        className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient}`}
                      >
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium">{config.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Schedule Info */}
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm">
                  {format(new Date(post.scheduled_for), "EEE d MMM yyyy", {
                    locale: enUS,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm">
                  {format(new Date(post.scheduled_for), "HH:mm")}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {post.error_message && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 sm:p-4">
                <h4 className="mb-2 text-xs sm:text-sm font-medium text-destructive">
                  Error
                </h4>
                <p className="text-xs sm:text-sm text-destructive/80">{post.error_message}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4 m-0 px-1">
            <div className="rounded-xl border border-border p-3 sm:p-4">
              <h4 className="mb-4 text-xs sm:text-sm font-medium">
                Select publishing platforms
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {Object.entries(platformConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedPlatforms.includes(key);
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      onClick={() => togglePlatform(key)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex items-center gap-2 sm:gap-3 rounded-xl border-2 p-2.5 sm:p-4 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2">
                          <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient}`}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <span className="font-medium text-xs sm:text-sm">{config.name}</span>
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  size="sm"
                  onClick={handleSavePlatforms} 
                  disabled={isSaving || selectedPlatforms.length === 0}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4 m-0 px-1">
            <div className="rounded-xl border border-border p-3 sm:p-4">
              <h4 className="mb-2 text-xs sm:text-sm font-medium flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Available AI Products
              </h4>
              <p className="mb-4 text-[10px] sm:text-xs text-muted-foreground">
                Select a product to regenerate this post's content
              </p>
              
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                {relevantProducts.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  return (
                    <motion.button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col rounded-xl border-2 p-2.5 sm:p-3 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {product.popular && (
                        <div className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold text-primary-foreground shadow-sm">
                          ⭐ POPULAR
                        </div>
                      )}
                      {product.badge && !product.popular && (
                        <div className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold text-accent-foreground shadow-sm">
                          {product.badge}
                        </div>
                      )}
                      {isSelected && !product.popular && !product.badge && (
                        <div className="absolute right-2 top-2">
                          <div className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm">{product.name}</span>
                        {product.tier !== "standard" && (
                          <span className="rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-bold uppercase bg-primary/20 text-primary">
                            {product.tier}
                          </span>
                        )}
                      </div>
                      <p className="mb-2 text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                        {product.description}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              {selectedProduct && (
                <div className="mt-4 p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs sm:text-sm">
                    <span className="font-medium">Selected:</span>{" "}
                    {selectedProduct.name}
                  </p>
                  <Button className="mt-3 w-full" size="sm">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Regenerate with {selectedProduct.name}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Actions - Always visible at bottom */}
      <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 pb-2 border-t border-border mt-auto shrink-0 bg-background sticky bottom-0">
        {/* Share Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2">
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
              <Facebook className="h-4 w-4 mr-2" />
              Share to Facebook
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const text = post.text_content || "";
                navigator.clipboard.writeText(text);
                toast({ title: "Copied!", description: "Content copied to clipboard" });
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Text
            </DropdownMenuItem>
            {(localMediaUrl || post.media_url) && (
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(localMediaUrl || post.media_url || "");
                  toast({ title: "Copied!", description: "Media link copied" });
                }}
              >
                <Link className="h-4 w-4 mr-2" />
                Copy Media Link
              </DropdownMenuItem>
            )}
            {(localMediaUrl || post.media_url) && (
              <DropdownMenuItem
                onClick={() => window.open(localMediaUrl || post.media_url || "", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Media
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(post)}
            className="gap-1.5 sm:gap-2"
          >
            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-1.5 sm:gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">Delete</span>
          </Button>
        )}
        {post.status !== "published" && (
          <div className="ml-auto flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-1.5 sm:gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">{isGenerating ? "Generating..." : "Generate"}</span>
              </Button>
              {onPublishNow && (
                <Button
                  size="sm"
                  onClick={handlePublishNow}
                  disabled={isPublishing}
                  className="gap-1.5 sm:gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  {isPublishing ? "Publishing..." : "Publish Now"}
                </Button>
              )}
            </div>
            {publishingStatus && (
              <span className="text-xs text-muted-foreground animate-pulse">
                {publishingStatus}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Header content shared between Dialog and Drawer
  const HeaderContent = () => {
    // For Image as Reel, show "Reel" label with music icon
    const displayLabel = isImageAsReel ? "Reel" : contentType.label;
    const DisplayIcon = isImageAsReel ? Music2 : ContentIcon;
    
    // Determine status badges
    const isGenerated = !!(localMediaUrl || post.media_url);
    const isPublished = post.status === "published";
    
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60">
          <DisplayIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
        </div>
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Content type label */}
          <span className="font-display text-sm sm:text-base">{displayLabel}</span>
          
          {/* Image as Reel badge */}
          {isImageAsReel && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              Image as Reel
            </Badge>
          )}
          
          {/* Generated badge - shown when media exists */}
          {isGenerated && !isPublished && (
            <Badge className="text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              <Check className="h-2.5 w-2.5 mr-0.5" />
              Generated
            </Badge>
          )}
          
          {/* Status badge */}
          <Badge className={`text-[10px] sm:text-xs ${status.color}`}>{status.label}</Badge>
        </div>
      </div>
    );
  };

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[85vh] flex flex-col px-4 pb-4">
            <DrawerHeader className="px-0 pt-4 pb-2 shrink-0">
              <DrawerTitle>
                <HeaderContent />
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ModalContent />
            </div>
          </DrawerContent>
        </Drawer>
        <SocialShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          content={{
            text: post.text_content || "",
            mediaUrl: localMediaUrl || post.media_url || undefined,
            type: post.content_type === "video" ? "video" : "image",
          }}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col overflow-hidden" aria-describedby={undefined}>
          <DialogHeader className="shrink-0">
            <DialogTitle>
              <HeaderContent />
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ModalContent />
          </div>
        </DialogContent>
      </Dialog>
      <SocialShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={{
          text: post.text_content || "",
          mediaUrl: localMediaUrl || post.media_url || undefined,
          type: post.content_type === "video" ? "video" : "image",
        }}
      />
      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        feature="video"
      />
    </>
  );
};
