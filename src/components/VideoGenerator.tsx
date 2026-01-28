import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Sparkles, Loader2, Play, Plus, Trash2, Settings2, ChevronDown, ImagePlus, X, User, Upload, Wand2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AI_MODELS, type AIModel } from "@/components/ModelSelector";
import { ProductSelector } from "@/components/ProductSelector";
import { VoiceSelector } from "@/components/VoiceSelector";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { FormatSelector, ContentFormat, FORMAT_OPTIONS } from "@/components/FormatSelector";
import { BrandOptions, BrandOptionsState } from "@/components/BrandOptions";
import { AVAILABLE_VOICES, getDefaultVoice, type Voice } from "@/lib/voices";
import {
  COMMERCIAL_PRODUCTS,
  CommercialProduct,
  getPrimaryInternalModel,
} from "@/lib/commercialProducts";
import {
  VideoScenario,
  buildScenarioPrompt,
} from "@/lib/videoScenarios";
import { ScenarioPickerModal, GeneratedScenario } from "@/components/ScenarioPickerModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerationProgressModal } from "@/components/GenerationProgressModal";
import { useGenerationTasks, type GenerationTask as PersistentTask } from "@/hooks/useGenerationTasks";

interface Project {
  id: string;
  name: string;
  description: string | null;
  theme_color: string | null;
  url: string | null;
  detected_language: string | null;
  avatar_url: string | null;
  ai_context_summary: string | null;
}
interface VideoSegment {
  id: string;
  script: string;
  duration: number;
  status: "pending" | "generating" | "ready" | "error";
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string;
  referenceImageUrl?: string;
  taskId?: string;
  progress?: number;
  submitTime?: number;
  finishTime?: number;
}

export interface GenerationTask {
  id: string;
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  submitTime?: number;
  finishTime?: number;
  duration: number;
  model: string;
  amount: number;
  videoUrl?: string;
  script?: string;
}

interface VideoGeneratorProps {
  onVideosGenerated: (videos: VideoSegment[]) => void;
  onTasksUpdated?: (tasks: GenerationTask[]) => void;
  initialStartingFrameUrl?: string;
}

// Filter commercial products for video and avatar only
const VIDEO_AVATAR_PRODUCTS = COMMERCIAL_PRODUCTS.filter(
  (p) => p.category === "video" || p.category === "avatar"
);

const PREFS_KEY = "video_generator_prefs";

type VideoQuality = "720p";

const QUALITY_OPTIONS: { value: VideoQuality; label: string; description: string }[] = [
  { value: "720p", label: "HD 720p", description: "Current maximum (provider limit)" },
];

interface StoredPrefs {
  voiceId?: string;
  productId?: string;
  avatarUrl?: string;
  quality?: VideoQuality;
  startingFrameUrl?: string;
  format?: ContentFormat;
  brandOptions?: BrandOptionsState;
}

const loadPrefs = (): StoredPrefs => {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const savePrefs = (prefs: Partial<StoredPrefs>) => {
  try {
    const current = loadPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage errors
  }
};

export const VideoGenerator = ({ onVideosGenerated, onTasksUpdated, initialStartingFrameUrl }: VideoGeneratorProps) => {
  const storedPrefs = loadPrefs();
  const defaultProduct = VIDEO_AVATAR_PRODUCTS.find((p) => p.id === storedPrefs.productId) 
    || VIDEO_AVATAR_PRODUCTS.find((p) => p.id === "ai-reel-pro") 
    || VIDEO_AVATAR_PRODUCTS[0];
  const defaultVoice = AVAILABLE_VOICES.find((v) => v.id === storedPrefs.voiceId) || getDefaultVoice();
  
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [segments, setSegments] = useState<VideoSegment[]>([
    { id: "1", script: "", duration: defaultProduct.supportedDurations?.[0] || 8, status: "pending" },
  ]);
  const [selectedVoice, setSelectedVoiceState] = useState<Voice>(defaultVoice);
  const [selectedProduct, setSelectedProductState] = useState<CommercialProduct>(defaultProduct);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState<string | null>(null);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const { addTask, updateTask } = useGenerationTasks();
  const { toast } = useToast();

  // Avatar state
  const [avatarUrl, setAvatarUrlState] = useState<string | undefined>(storedPrefs.avatarUrl);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Quality, format and continuation state
  const [selectedQuality, setSelectedQualityState] = useState<VideoQuality>("720p");
  const [selectedFormat, setSelectedFormatState] = useState<ContentFormat>(storedPrefs.format || "reel");
  const [startingFrameUrl, setStartingFrameUrlState] = useState<string | undefined>(storedPrefs.startingFrameUrl);

  // Scenario state
  const [selectedSector, setSelectedSector] = useState<VideoScenario | undefined>();
  const [selectedStyle, setSelectedStyle] = useState<VideoScenario | undefined>();
  const [selectedTone, setSelectedTone] = useState<VideoScenario | undefined>();

  // Scenario picker modal state
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [generatedScenarios, setGeneratedScenarios] = useState<GeneratedScenario[]>([]);
  const [isRegeneratingScenarios, setIsRegeneratingScenarios] = useState(false);
  const [pendingScenarioSegmentId, setPendingScenarioSegmentId] = useState<string | null>(null);

  // Brand options state
  const [brandOptions, setBrandOptionsState] = useState<BrandOptionsState>(
    storedPrefs.brandOptions || { includeLogo: false, includeUrl: false, includeText: false, includeAvatar: false }
  );

  const setBrandOptions = (options: BrandOptionsState) => {
    setBrandOptionsState(options);
    savePrefs({ brandOptions: options });
  };

  const setSelectedFormat = (format: ContentFormat) => {
    setSelectedFormatState(format);
    savePrefs({ format });
  };


  // Wrapper functions to persist preferences
  const setSelectedVoice = (voice: Voice) => {
    setSelectedVoiceState(voice);
    savePrefs({ voiceId: voice.id });
  };

  const setSelectedProduct = (product: CommercialProduct) => {
    setSelectedProductState(product);
    savePrefs({ productId: product.id });
  };

  const setAvatarUrl = (url: string | undefined) => {
    setAvatarUrlState(url);
    savePrefs({ avatarUrl: url });
  };

  const setSelectedQuality = (quality: VideoQuality) => {
    setSelectedQualityState(quality);
    savePrefs({ quality });
  };

  const setStartingFrameUrl = (url: string | undefined) => {
    setStartingFrameUrlState(url);
    savePrefs({ startingFrameUrl: url });
  };

  const clearStartingFrame = () => {
    setStartingFrameUrlState(undefined);
    savePrefs({ startingFrameUrl: undefined });
  };

  // Avatar functions
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid format", description: "Please upload an image (JPG, PNG, WebP)", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5 MB", variant: "destructive" });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarUrl(objectUrl);
      toast({ title: "Avatar updated!", description: "Your photo has been loaded" });
    } catch {
      toast({ title: "Error", description: "Unable to load image", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const generateAvatar = async () => {
    if (!avatarPrompt.trim()) {
      toast({ title: "Description required", description: "Describe your AI avatar appearance", variant: "destructive" });
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", { body: { prompt: avatarPrompt } });
      if (error) throw error;
      if (data.imageUrl) {
        setAvatarUrl(data.imageUrl);
        toast({ title: "Avatar generated!", description: "Your AI avatar is ready" });
        setShowAvatarPrompt(false);
        setAvatarPrompt("");
      }
    } catch {
      toast({ title: "Error", description: "Unable to generate avatar", variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, theme_color, url, detected_language, avatar_url, ai_context_summary")
        .order("name");
      if (data) setProjects(data as Project[]);
    };
    fetchProjects();
  }, []);

  // Quality validation for generated text
  const validateScriptQuality = (text: string): { valid: boolean; reason?: string } => {
    if (!text || text.trim().length < 30) {
      return { valid: false, reason: "Script too short" };
    }
    
    // Check for too much English
    const englishPatterns = /\b(discover|our|solution|innovative|the|and|with|for|your|this|that|is|are|you|we|AI|learn more)\b/gi;
    const englishMatches = text.match(englishPatterns) || [];
    if (englishMatches.length > 2) {
      return { valid: false, reason: "Too much English detected" };
    }
    
    // Check for generic marketing phrases to reject
    const genericPhrases = [
      "découvrez notre",
      "solution innovante", 
      "révolutionnaire",
      "unique en son genre",
      "n'attendez plus",
      "découvrir maintenant",
    ];
    const lowerText = text.toLowerCase();
    for (const phrase of genericPhrases) {
      if (lowerText.includes(phrase)) {
        return { valid: false, reason: `Generic phrase detected: "${phrase}"` };
      }
    }
    
    return { valid: true };
  };

  const generateAIScript = async (segmentId: string, project: Project) => {
    setIsGeneratingScript(segmentId);
    setProjectSelectorOpen(null);
    setPendingScenarioSegmentId(segmentId);
    
    // Get the segment's duration for script length adaptation
    const segment = segments.find(s => s.id === segmentId);
    const duration = segment?.duration || 10;
    
    try {
      // First, scrape the project URL if available
      let scrapedContent: string | undefined;
      let scrapedLanguage: string | undefined;
      
      if (project.url) {
        try {
          const { data: scrapeData } = await supabase.functions.invoke("scrape-project-url", {
            body: { url: project.url },
          });
          scrapedContent = scrapeData?.markdown?.slice(0, 3000);
          scrapedLanguage = scrapeData?.detectedLanguage; // Use freshly detected language
        } catch (scrapeError) {
          console.log("Scraping skipped:", scrapeError);
        }
      }

      // Prioritize: scraped language > project language > default
      const finalLanguage = scrapedLanguage || project.detected_language || "en";
      console.log("[VideoGenerator] Using language:", finalLanguage, "(scraped:", scrapedLanguage, ", project:", project.detected_language, ")");

      // Use the new dedicated video scenario generator
      const { data, error } = await supabase.functions.invoke("generate-video-scenario", {
        body: {
          projectId: project.id,
          projectName: project.name,
          projectDescription: project.description || project.name,
          projectUrl: project.url,
          scrapedContent,
          sectorId: selectedSector?.id,
          styleId: selectedStyle?.id,
          toneId: selectedTone?.id,
          scriptType: selectedProduct.category === "avatar" ? "testimonial" : "reel",
          duration,
          detectedLanguage: finalLanguage,
          logoUrl: project.avatar_url,
        },
      });

      if (error) throw error;

      const scenarios = data?.scenarios;
      if (!scenarios || scenarios.length === 0) {
        throw new Error("No scenarios generated");
      }

      // Store scenarios and show picker modal
      setGeneratedScenarios(scenarios);
      setShowScenarioPicker(true);
      setIsGeneratingScript(null);
      
    } catch (error) {
      console.error("AI scenario generation error:", error);
      toast({
        title: "Generation error",
        description: "Unable to generate scenarios. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingScript(null);
      setPendingScenarioSegmentId(null);
    }
  };

  // Handle scenario selection from modal - insert COMPLETE formatted prompt
  const handleScenarioSelect = (scenario: GeneratedScenario) => {
    if (pendingScenarioSegmentId) {
      // Build complete formatted video prompt with scenes breakdown
      const formattedScenes = scenario.scenes
        .map((scene) => `${scene.timestamp}\nVisual: ${scene.visual}\nVoiceover: "${scene.voiceover}"`)
        .join("\n\n");
      
      const formattedHashtags = scenario.hashtags
        .map((h) => (h.startsWith("#") ? h : `#${h}`))
        .join(" ");
      
      // Complete video prompt with all details
      const completePrompt = `🎬 ${scenario.title.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Angle: ${scenario.angle.toUpperCase()}
📊 Engagement: ${scenario.estimatedEngagement.toUpperCase()}

📜 SCRIPT:
${scenario.fullScript}

🎥 SCENE BREAKDOWN:
${formattedScenes}

${formattedHashtags}`;

      updateSegment(pendingScenarioSegmentId, { script: completePrompt });
      toast({
        title: "Scenario inserted! ✨",
        description: `${scenario.title} - ${scenario.scenes.length} scenes ready`,
      });
    }
    setPendingScenarioSegmentId(null);
    setGeneratedScenarios([]);
  };

  // Handle scenario regeneration
  const handleScenarioRegenerate = async () => {
    if (!pendingScenarioSegmentId) return;
    
    setIsRegeneratingScenarios(true);
    const segment = segments.find(s => s.id === pendingScenarioSegmentId);
    const duration = segment?.duration || 10;
    
    // Get current project (first one for now, could be improved)
    const project = projects[0];
    if (!project) {
      setIsRegeneratingScenarios(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-scenario", {
        body: {
          projectId: project.id,
          projectName: project.name,
          projectDescription: project.description || project.name,
          projectUrl: project.url,
          sectorId: selectedSector?.id,
          styleId: selectedStyle?.id,
          toneId: selectedTone?.id,
          scriptType: selectedProduct.category === "avatar" ? "testimonial" : "reel",
          duration,
          detectedLanguage: project.detected_language || "en",
          logoUrl: project.avatar_url,
        },
      });

      if (error) throw error;
      
      if (data?.scenarios) {
        setGeneratedScenarios(data.scenarios);
      }
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: "Regeneration failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRegeneratingScenarios(false);
    }
  };
  
  // Get the internal model for API calls (hidden from UI)
  const getInternalModel = (): AIModel | null => {
    return getPrimaryInternalModel(selectedProduct.id);
  };

  const addSegment = () => {
    const defaultDuration = selectedProduct.supportedDurations?.[0] || 8;
    setSegments((prev) => [
      ...prev,
      { id: Date.now().toString(), script: "", duration: defaultDuration, status: "pending" },
    ]);
  };

  const removeSegment = (id: string) => {
    if (segments.length > 1) {
      setSegments((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const updateSegment = (id: string, updates: Partial<VideoSegment>) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const generateContent = async () => {
    const validSegments = segments.filter((s) => s.script.trim());
    if (validSegments.length === 0) {
      toast({
        title: "Script required",
        description: "Add at least one script to generate content",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setShowProgressModal(true);
    setSegments((prev) =>
      prev.map((s) =>
        s.script.trim() ? { ...s, status: "generating" as const, progress: 0 } : s
      )
    );

    toast({
      title: `Generating ${selectedProduct.name}...`,
      description: "Creating content with ultra-realistic AI voice",
    });

    try {
      // Video and Avatar generation only on this page
      await generateVideos();
    } catch (error) {
      console.error("Generation error:", error);
      setIsGenerating(false);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la génération",
        variant: "destructive",
      });
    }
  };

  // Effect to set starting frame from prop (for video continuation)
  useEffect(() => {
    if (initialStartingFrameUrl) {
      setStartingFrameUrlState(initialStartingFrameUrl);
      toast({
        title: "Video continuation mode",
        description: "New video will continue from the selected video's last frame",
      });
    }
  }, [initialStartingFrameUrl]);

  const generateVideos = async () => {
    // Step 1: Generate audio with ElevenLabs TTS for voiceover
    const segmentsWithAudio = await Promise.all(
      segments.map(async (segment) => {
        if (!segment.script.trim()) return segment;

        try {
          const audioResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                text: segment.script,
                voiceId: selectedVoice.id,
              }),
            }
          );

          if (!audioResponse.ok) throw new Error(`TTS failed: ${audioResponse.status}`);

          const audioBlob = await audioResponse.blob();
          const audioFileName = `audio/${Date.now()}-${segment.id}.mp3`;
          
          await supabase.storage.from("media").upload(audioFileName, audioBlob, {
            contentType: "audio/mpeg",
            upsert: true,
          });

          const { data: audioUrlData } = supabase.storage.from("media").getPublicUrl(audioFileName);

          return { ...segment, audioUrl: audioUrlData.publicUrl };
        } catch (error) {
          console.error("Audio generation error:", error);
          return { ...segment, status: "error" as const };
        }
      })
    );

    // Step 2: Generate videos with selected model
    const currentTime = Math.floor(Date.now() / 1000);
    const segmentsWithTasks = await Promise.all(
      segmentsWithAudio.map(async (segment) => {
        if (segment.status === "error" || !segment.script.trim()) return segment;

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-sora?action=create`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                prompt: buildScenarioPrompt(selectedSector, selectedStyle, selectedTone) + segment.script,
                avatarUrl,
                duration: segment.duration,
                quality: selectedQuality,
                format: selectedFormat,
                orientation: selectedFormat === "landscape" ? "landscape" : "portrait",
                startingFrameUrl: startingFrameUrl,
                model: getInternalModel()?.id || "sora-2",
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Video creation failed: ${response.status}`);
          }

          const result = await response.json();
          
          // Add to generation tasks
          const newTask: GenerationTask = {
            id: segment.id,
            taskId: result.taskId,
            status: "queued",
            progress: 0,
            submitTime: currentTime,
            duration: segment.duration,
            model: selectedProduct.name,
            amount: segment.duration * selectedProduct.salePrice / 10,
            script: segment.script,
          };
          
          // Add to persistent storage
          addTask(newTask);
          
          setGenerationTasks(prev => {
            const updated = [...prev, newTask];
            onTasksUpdated?.(updated);
            return updated;
          });
          
          return { ...segment, taskId: result.taskId, progress: 0, submitTime: currentTime };
        } catch (error) {
          console.error("Video task creation error:", error);
          return { ...segment, status: "error" as const };
        }
      })
    );

    setSegments(segmentsWithTasks);

    // Create a ref-like variable to track current segments
    let currentSegments = [...segmentsWithTasks];

    // Step 3: Poll for video completion
    const pollStatus = async () => {
      let allComplete = true;
      let anyError = false;

      const updatedSegments = await Promise.all(
        currentSegments.map(async (segment) => {
          if (!segment.taskId || segment.status === "ready" || segment.status === "error") {
            return segment;
          }

          try {
            const statusResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-sora?action=status&taskId=${segment.taskId}`,
              {
                method: "GET",
                headers: {
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
              }
            );

            if (!statusResponse.ok) throw new Error(`Status check failed`);

            const status = await statusResponse.json();

            // Update generation task with new status
            const taskUpdate = {
              status: status.status as GenerationTask["status"],
              progress: status.progress || 0,
              finishTime: status.finishTime,
              videoUrl: status.videoUrl,
            };
            
            // Update persistent storage
            updateTask(segment.taskId, taskUpdate);
            
            setGenerationTasks(prev => {
              const updated = prev.map(task => 
                task.taskId === segment.taskId 
                  ? { ...task, ...taskUpdate } 
                  : task
              );
              onTasksUpdated?.(updated);
              return updated;
            });

            if (status.status === "completed" && status.videoUrl) {
              const videoResponse = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-sora?action=download&taskId=${segment.taskId}`,
                {
                  method: "GET",
                  headers: {
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                  },
                }
              );

              if (videoResponse.ok) {
                const videoBlob = await videoResponse.blob();
                const videoFileName = `videos/${Date.now()}-${segment.id}.mp4`;
                
                await supabase.storage.from("media").upload(videoFileName, videoBlob, {
                  contentType: "video/mp4",
                  upsert: true,
                });

                const { data: videoUrlData } = supabase.storage.from("media").getPublicUrl(videoFileName);

                return {
                  ...segment,
                  status: "ready" as const,
                  videoUrl: videoUrlData.publicUrl,
                  progress: 100,
                  finishTime: status.finishTime,
                };
              }

              return {
                ...segment,
                status: "ready" as const,
                videoUrl: status.videoUrl,
                progress: 100,
                finishTime: status.finishTime,
              };
            } else if (status.status === "failed") {
              anyError = true;
              return { ...segment, status: "error" as const };
            } else {
              allComplete = false;
              return { ...segment, progress: status.progress || 0 };
            }
          } catch (error) {
            console.error("Status check error:", error);
            anyError = true;
            return { ...segment, status: "error" as const };
          }
        })
      );

      // Update the ref-like variable for next poll
      currentSegments = updatedSegments;
      setSegments(updatedSegments);

      return { allComplete, anyError, readyCount: updatedSegments.filter((s) => s.status === "ready").length, errorCount: updatedSegments.filter((s) => s.status === "error").length };
    };

    // Immediate first poll
    const firstResult = await pollStatus();
    
    if (firstResult.allComplete || firstResult.anyError) {
      setIsGenerating(false);
      if (firstResult.readyCount > 0) {
        toast({
          title: `🎬 ${selectedProduct.name} générées !`,
          description: `${firstResult.readyCount} vidéo(s) prête(s) avec voix IA${firstResult.errorCount > 0 ? `, ${firstResult.errorCount} erreur(s)` : ""}`,
        });
        onVideosGenerated(segments);
      } else {
        toast({
          title: "Erreur de génération",
          description: "Impossible de générer les vidéos",
          variant: "destructive",
        });
      }
      return;
    }

    // Continue polling
    const pollInterval = setInterval(async () => {
      const result = await pollStatus();

      if (result.allComplete || result.anyError) {
        clearInterval(pollInterval);
        setIsGenerating(false);

        if (result.readyCount > 0) {
          toast({
            title: `🎬 ${selectedProduct.name} générées !`,
            description: `${result.readyCount} vidéo(s) prête(s) avec voix IA${result.errorCount > 0 ? `, ${result.errorCount} erreur(s)` : ""}`,
          });
          onVideosGenerated(currentSegments);
        } else {
          toast({
            title: "Erreur de génération",
            description: "Impossible de générer les vidéos",
            variant: "destructive",
          });
        }
      }
    }, 10000);

    setTimeout(() => {
      clearInterval(pollInterval);
      setIsGenerating(false);
    }, 600000);
  };

  const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);
  const estimatedCost = selectedProduct.category === "video" || selectedProduct.category === "avatar"
    ? (totalDuration * (selectedProduct.salePrice / 10)).toFixed(0)
    : (segments.filter(s => s.script.trim()).length * selectedProduct.salePrice).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4 shadow-card"
    >
      {/* Header compact */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
            <Video className="h-4 w-4 text-secondary-foreground" />
          </div>
          <span className="font-medium text-sm">AI Generator</span>
        </div>
        <p className="text-lg font-bold text-gradient">~{estimatedCost}€</p>
      </div>

      {/* Quick Settings Bar - Popup buttons */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Format Selector */}
        <FormatSelector
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          compact
        />
        
        {/* Avatar Button */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Avatar</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Avatar</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <div className="relative h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary p-0.5">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-card">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  {(isGeneratingAvatar || isUploadingAvatar) && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!showAvatarPrompt ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar || isGeneratingAvatar}
                    className="h-auto flex-col gap-2 py-3"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">Upload</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAvatarPrompt(true)}
                    disabled={isUploadingAvatar || isGeneratingAvatar}
                    className="h-auto flex-col gap-2 py-3"
                  >
                    <Wand2 className="h-5 w-5" />
                    <span className="text-xs">Generate</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={avatarPrompt}
                    onChange={(e) => setAvatarPrompt(e.target.value)}
                    placeholder="E.g. A professional woman, brown hair, confident smile, modern style..."
                    className="min-h-[80px] resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setShowAvatarPrompt(false); setAvatarPrompt(""); }} className="flex-1">
                      <X className="mr-1 h-4 w-4" /> Cancel
                    </Button>
                    <Button variant="gradient" size="sm" onClick={generateAvatar} disabled={isGeneratingAvatar || !avatarPrompt.trim()} className="flex-1">
                      {isGeneratingAvatar ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
                      Generate
                    </Button>
                  </div>
                </div>
              )}

              <input ref={avatarFileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />

              {avatarUrl && (
                <p className="text-xs text-center text-muted-foreground">Will be animated with lip-sync</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Voice Button */}
        {selectedProduct.needsVoice && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                <Volume2 className="h-4 w-4 text-primary" />
                <span>{selectedVoice.name}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>AI Voice</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Quality Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              <Settings2 className="h-4 w-4 text-primary" />
              <span>{selectedQuality}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Video Quality</p>
              {QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedQuality(option.value)}
                  className={`w-full flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    selectedQuality === option.value
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Scenario Selector */}
        <ScenarioSelector
          selectedSector={selectedSector}
          selectedStyle={selectedStyle}
          selectedTone={selectedTone}
          onSectorChange={setSelectedSector}
          onStyleChange={setSelectedStyle}
          onToneChange={setSelectedTone}
        />

        {/* Starting Frame Indicator (for video continuation) */}
        {startingFrameUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-primary">Continuing from video</span>
            <button
              onClick={clearStartingFrame}
              className="ml-auto rounded-full p-0.5 hover:bg-primary/20 transition-colors"
            >
              <X className="h-3 w-3 text-primary" />
            </button>
          </div>
        )}

      </div>

      {/* Brand Options */}
      <div className="mb-3">
        <BrandOptions options={brandOptions} onChange={setBrandOptions} compact />
      </div>

      {/* Segments - Direct display */}
      <div className="space-y-2 mb-3">
        <AnimatePresence mode="popLayout">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-border p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  {selectedProduct.supportedDurations && (
                    <select
                      value={segment.duration}
                      onChange={(e) => updateSegment(segment.id, { duration: Number(e.target.value) })}
                      className="rounded border border-border bg-background px-2 py-1 text-xs"
                    >
                      {selectedProduct.supportedDurations.map((dur) => (
                        <option key={dur} value={dur}>{dur}s</option>
                      ))}
                    </select>
                  )}
                  {segments.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeSegment(segment.id)} className="h-6 w-6 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative">
                <Textarea
                  placeholder="Describe your video..."
                  value={segment.script}
                  onChange={(e) => updateSegment(segment.id, { script: e.target.value })}
                  className="min-h-[80px] resize-none text-sm pr-12"
                />

                {/* AI Sparkles Button */}
                <Popover open={projectSelectorOpen === segment.id} onOpenChange={(open) => setProjectSelectorOpen(open ? segment.id : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8"
                      disabled={isGeneratingScript === segment.id}
                    >
                      {isGeneratingScript === segment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <div className="text-xs font-medium mb-2 text-muted-foreground">
                      Generate from project context
                    </div>
                    <ScrollArea className="max-h-48">
                      <div className="space-y-1">
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => generateAIScript(segment.id, project)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                          >
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: project.theme_color || "#6366f1" }}
                            />
                            <span className="truncate">{project.name}</span>
                          </button>
                        ))}
                        {projects.length === 0 && (
                          <p className="text-xs text-muted-foreground p-2">
                            No projects yet. Create one first.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2 mt-2">
                {segment.referenceImageUrl ? (
                  <div className="relative">
                    <img src={segment.referenceImageUrl} alt="Ref" className="h-8 w-8 rounded object-cover border" />
                    <button onClick={() => updateSegment(segment.id, { referenceImageUrl: undefined })} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5">
                      <X className="h-2 w-2 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-8 cursor-pointer items-center gap-1 rounded border border-dashed px-2 text-[10px] text-muted-foreground hover:bg-muted/50">
                    <ImagePlus className="h-3 w-3" />
                    Image
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const fileName = `references/${Date.now()}-${segment.id}.${file.name.split('.').pop()}`;
                        const { error } = await supabase.storage.from("media").upload(fileName, file, { contentType: file.type, upsert: true });
                        if (!error) {
                          const { data } = supabase.storage.from("media").getPublicUrl(fileName);
                          updateSegment(segment.id, { referenceImageUrl: data.publicUrl });
                        }
                      }
                    }} />
                  </label>
                )}
              </div>

              {segment.status !== "pending" && (
                <div className="mt-2 text-xs">
                  {segment.status === "generating" && <span className="text-accent flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{segment.progress}%</span>}
                  {segment.status === "ready" && <span className="text-primary flex items-center gap-1"><Play className="h-3 w-3" />Ready</span>}
                  {segment.status === "error" && <span className="text-destructive">Error</span>}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <Button variant="ghost" onClick={addSegment} size="sm" className="w-full border border-dashed text-xs">
          <Plus className="h-3 w-3 mr-1" />Add segment
        </Button>
      </div>

      {/* Video Type Button - Bottom */}
      <div className="mb-3">
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <Video className="h-4 w-4 text-primary" />
              <span>{selectedProduct.name}</span>
              <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Video Type</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ProductSelector
                selectedProduct={selectedProduct}
                categories={["video", "avatar"]}
                onProductChange={(product) => {
                  setSelectedProduct(product);
                  const newDefaultDuration = product.supportedDurations?.[0] || 8;
                  setSegments((prev) => prev.map((s) => ({ ...s, duration: newDefaultDuration })));
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Generate Button */}
      <Button onClick={generateContent} disabled={isGenerating || segments.every((s) => !s.script.trim())} variant="gradient" className="w-full">
        {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4" />Generate (~{estimatedCost}€)</>}
      </Button>

      {/* Generation Progress Modal */}
      <GenerationProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        tasks={generationTasks}
        productName={selectedProduct.name}
      />

      {/* Scenario Picker Modal */}
      <ScenarioPickerModal
        open={showScenarioPicker}
        onOpenChange={(open) => {
          setShowScenarioPicker(open);
          if (!open) {
            setPendingScenarioSegmentId(null);
            setGeneratedScenarios([]);
          }
        }}
        scenarios={generatedScenarios}
        onSelect={handleScenarioSelect}
        onRegenerate={handleScenarioRegenerate}
        isRegenerating={isRegeneratingScenarios}
      />
    </motion.div>
  );
};
