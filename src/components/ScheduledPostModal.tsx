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
  Mic,
  User,
  Monitor,
  Play,
  Volume2,
  VolumeX,
  Share2,
  Link,
  Copy,
  ExternalLink,
  Lightbulb,
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
import { COMMERCIAL_PRODUCTS, CommercialProduct } from "@/lib/commercialProducts";
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
  
  // Local state to track generated media (updates immediately after generation)
  const [localMediaUrl, setLocalMediaUrl] = useState<string | null>(null);
  
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
  const [videoFormat, setVideoFormat] = useState<"reel" | "story" | "landscape" | "mix">("reel");
  
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
    if (post.content_type === "video" || post.content_type === "reel") {
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
    
    // For video/reel content, we need to generate first
    if ((post.content_type === "video" || post.content_type === "reel") && !post.media_url) {
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

      // Step 3: Generate media based on content type
      if ((post.content_type === "video" || post.content_type === "reel") && !post.media_url) {
        // Check if this is a reel (either explicit reel type or Image as Reel)
        if (post.content_type === "reel" || isImageAsReel) {
          // Use Gemini + music reel generation (no CometAPI)
          setPublishingStatus("Generating reel image...");
          
          toast({
            title: "Generating reel...",
            description: "Creating image with background music",
          });

          const { data: reelData, error: reelError } = await supabase.functions.invoke("generate-reel", {
            body: {
              prompt: post.ai_prompt || "Create an eye-catching social media reel",
              format: videoFormat === "landscape" ? "landscape" : "reel",
              brandName: projectContext?.name || undefined,
              musicCategory: "upbeat",
              duration: 10,
            },
          });

          if (reelError) {
            console.warn("Reel generation error:", reelError);
          } else if (reelData?.success && reelData?.imageUrl) {
            await supabase
              .from("scheduled_posts")
              .update({ 
                media_url: reelData.imageUrl,
                thumbnail_url: reelData.imageUrl,
                status: "scheduled",
              })
              .eq("id", post.id);
            
            // Update local reference for publishing
            post.media_url = reelData.imageUrl;
          }
        } else if (selectedProduct) {
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
              format: videoFormat === "mix" ? "reel" : videoFormat,
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
          format: videoFormat === "mix" ? "reel" : videoFormat,
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

  // Generate Reel using Gemini image + music (NOT CometAPI video)
  const handleGenerateReel = async () => {
    setIsGenerating(true);
    try {
      // Build brand-aware prompt
      let enhancedPrompt = post.ai_prompt || "Create an eye-catching social media reel image";
      
      // Add brand context if available
      if (projectContext) {
        if (projectContext.name) enhancedPrompt += ` for ${projectContext.name} brand`;
        if (projectContext.description) enhancedPrompt += `. About: ${projectContext.description.substring(0, 150)}`;
      }

      toast({
        title: "Generating reel...",
        description: projectContext?.name 
          ? `Creating reel visual for ${projectContext.name}` 
          : "Creating reel image with music",
      });

      // Use the new generate-reel edge function (Gemini + music)
      const { data, error } = await supabase.functions.invoke("generate-reel", {
        body: {
          prompt: enhancedPrompt,
          format: videoFormat === "landscape" ? "landscape" : "reel",
          brandName: projectContext?.name || undefined,
          musicCategory: "upbeat", // Default to upbeat for reels
          duration: 10,
        },
      });

      if (error) throw error;

      if (data?.success && data?.imageUrl) {
        // Update local state immediately for instant preview
        setLocalMediaUrl(data.imageUrl);
        
        // Update post with generated reel image
        const { error: updateError } = await supabase
          .from("scheduled_posts")
          .update({ 
            media_url: data.imageUrl,
            thumbnail_url: data.imageUrl,
            status: "scheduled",
          })
          .eq("id", post.id);

        if (updateError) throw updateError;

        toast({
          title: "Reel generated ✓",
          description: data.musicUrl ? "Image ready with background music" : "Image ready for reel",
        });
        
        onUpdate?.();
      } else {
        throw new Error(data?.error || "Reel generation failed");
      }
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

  // Generate content (image, video, or reel) based on content type
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Check if this is a reel (either explicit reel type or Image as Reel)
      if (post.content_type === "reel" || isImageAsReel) {
        // Use the new Gemini + music reel generation
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
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-4 shrink-0">
          <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
          <TabsTrigger value="ai-settings" className="text-xs sm:text-sm">
            <Wand2 className="h-3 w-3 mr-1" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs sm:text-sm">Platforms</TabsTrigger>
          <TabsTrigger value="models" className="text-xs sm:text-sm">AI</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-4">
          <TabsContent value="details" className="space-y-4 m-0 px-1">
            {/* Media Preview - Show from local state or post prop */}
            {(localMediaUrl || post.media_url || post.thumbnail_url) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-xl bg-muted border border-border"
              >
                {post.content_type === "video" || post.content_type === "reel" ? (
                  <div className="aspect-video">
                    <video
                      src={localMediaUrl || post.media_url || undefined}
                      poster={post.thumbnail_url || undefined}
                      controls
                      className="h-full w-full object-cover"
                    />
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

            {/* AI Prompt / Subject - Collapsible */}
            {post.ai_prompt && (
              <div className="rounded-xl bg-muted/50 p-3 sm:p-4">
                <h4 className="mb-2 text-xs sm:text-sm font-medium text-muted-foreground">
                  Subject / AI Prompt
                </h4>
                {(() => {
                  const { text, truncated } = truncateText(post.ai_prompt, 150);
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
              </div>
            )}

            {/* Text Content - Collapsible */}
            {post.text_content && (
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <h4 className="mb-2 text-xs sm:text-sm font-medium text-muted-foreground">
                  Content
                </h4>
                {(() => {
                  const { text, truncated } = truncateText(post.text_content, 200);
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

          {/* AI Settings Tab - Different for Video vs Image (Image as Reel shows image settings) */}
          <TabsContent value="ai-settings" className="space-y-4 m-0 px-1">
            {((post.content_type === "video" || post.content_type === "reel") && !isImageAsReel) ? (
              /* Video Settings - Only for actual videos, not Image as Reel */
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <h4 className="mb-4 text-xs sm:text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  Video Generation Settings
                </h4>

                <div className="space-y-4">
                  {/* Format Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      Format
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "reel", label: "Reel", icon: "9:16" },
                        { id: "story", label: "Story", icon: "9:16" },
                        { id: "landscape", label: "Landscape", icon: "16:9" },
                        { id: "mix", label: "Mix", icon: "Auto" },
                      ].map((fmt) => (
                        <motion.button
                          key={fmt.id}
                          type="button"
                          onClick={() => setVideoFormat(fmt.id as "reel" | "story" | "landscape" | "mix")}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex flex-col items-center justify-center rounded-lg border-2 p-2 transition-all ${
                            videoFormat === fmt.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="text-[10px] font-medium text-muted-foreground">{fmt.icon}</span>
                          <span className="text-xs font-medium">{fmt.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {enableVoice ? (
                        <Volume2 className="h-4 w-4 text-primary" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Label htmlFor="enable-voice" className="text-xs sm:text-sm">
                        AI Voiceover
                      </Label>
                    </div>
                    <Switch
                      id="enable-voice"
                      checked={enableVoice}
                      onCheckedChange={setEnableVoice}
                    />
                  </div>

                  {/* Voice Options */}
                  {enableVoice && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pl-4 border-l-2 border-primary/30"
                    >
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Language</Label>
                        <Select
                          value={selectedLanguage}
                          onValueChange={(value) => setSelectedLanguage(value as VoiceLanguage)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border z-50">
                            {AVAILABLE_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                <span className="flex items-center gap-2">
                                  <span>{lang.flag}</span>
                                  <span>{lang.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Voice</Label>
                        <Select
                          value={selectedVoice?.id || ""}
                          onValueChange={(value) => {
                            const voice = availableVoices.find((v) => v.id === value);
                            setSelectedVoice(voice || null);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select voice" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border z-50">
                            {availableVoices.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                <span className="flex items-center gap-2">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    voice.gender === "female" 
                                      ? "bg-pink-500/20 text-pink-600" 
                                      : "bg-blue-500/20 text-blue-600"
                                  }`}>
                                    {voice.gender === "female" ? "♀" : "♂"}
                                  </span>
                                  <span>{voice.name}</span>
                                  {voice.accent && (
                                    <span className="text-muted-foreground text-xs">({voice.accent})</span>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}

                  {/* Avatar URL */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      AI Avatar (optional)
                    </Label>
                    <Input
                      placeholder="Enter avatar image URL"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Leave empty for video-only or paste an avatar URL for AI influencer
                    </p>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || !selectedProduct}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isGenerating ? "Generating..." : "Generate Video"}
                  </Button>

                  {!selectedProduct && (
                    <p className="text-xs text-center text-muted-foreground">
                      Select an AI model in the "AI" tab first
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Image Settings (also used for Image as Reel) */
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <h4 className="mb-4 text-xs sm:text-sm font-medium flex items-center gap-2">
                  {isImageAsReel ? (
                    <>
                      <Music2 className="h-4 w-4 text-primary" />
                      Image as Reel Settings
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Image Generation Settings
                    </>
                  )}
                </h4>

                <div className="space-y-4">
                  {/* Image as Reel info */}
                  {isImageAsReel && (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 flex items-start gap-2">
                      <Music2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-primary">Image as Reel</p>
                        <p className="text-muted-foreground mt-1">
                          This post will generate a static image with background music, published as a Reel on social platforms.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Image Format/Aspect Ratio */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      Aspect Ratio
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(isImageAsReel ? [
                        { id: "portrait", label: "Portrait", icon: "9:16" },
                        { id: "square", label: "Square", icon: "1:1" },
                        { id: "landscape", label: "Landscape", icon: "16:9" },
                      ] : [
                        { id: "square", label: "Square", icon: "1:1" },
                        { id: "portrait", label: "Portrait", icon: "4:5" },
                        { id: "landscape", label: "Landscape", icon: "16:9" },
                      ]).map((fmt) => (
                        <motion.button
                          key={fmt.id}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${
                            videoFormat === fmt.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setVideoFormat(fmt.id as any)}
                        >
                          <span className="text-[10px] font-medium text-muted-foreground">{fmt.icon}</span>
                          <span className="text-xs font-medium">{fmt.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Style Hint */}
                  <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      {isImageAsReel 
                        ? "The AI will generate an image that will be converted to a Reel with background music. Select an AI model in the \"AI\" tab."
                        : "The AI will generate an image based on the prompt. Select an AI model in the \"AI\" tab for quality options."
                      }
                    </p>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || !selectedProduct}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {isGenerating ? "Generating..." : "Generate Image"}
                  </Button>

                  {!selectedProduct && (
                    <p className="text-xs text-center text-muted-foreground">
                      Select an AI model in the "AI" tab first
                    </p>
                  )}
                </div>
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
        </ScrollArea>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t border-border mt-4 shrink-0">
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
    </>
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
            type: post.content_type === "video" || post.content_type === "reel" ? "video" : "image",
          }}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              <HeaderContent />
            </DialogTitle>
          </DialogHeader>
          <ModalContent />
        </DialogContent>
      </Dialog>
      <SocialShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={{
          text: post.text_content || "",
          mediaUrl: localMediaUrl || post.media_url || undefined,
          type: post.content_type === "video" || post.content_type === "reel" ? "video" : "image",
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
