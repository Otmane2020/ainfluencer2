import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Sparkles, Loader2, Play, Plus, Trash2, Settings2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AI_MODELS, type AIModel } from "@/components/ModelSelector";
import { ProductSelector } from "@/components/ProductSelector";
import { VoiceSelector } from "@/components/VoiceSelector";
import { AVAILABLE_VOICES, getDefaultVoice, type Voice } from "@/lib/voices";
import {
  COMMERCIAL_PRODUCTS,
  CommercialProduct,
  getPrimaryInternalModel,
} from "@/lib/commercialProducts";
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
}
interface VideoSegment {
  id: string;
  script: string;
  duration: number;
  status: "pending" | "generating" | "ready" | "error";
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string;
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
  avatarUrl?: string;
  onVideosGenerated: (videos: VideoSegment[]) => void;
  onTasksUpdated?: (tasks: GenerationTask[]) => void;
}

// Filter commercial products for video and avatar only
const VIDEO_AVATAR_PRODUCTS = COMMERCIAL_PRODUCTS.filter(
  (p) => p.category === "video" || p.category === "avatar"
);

export const VideoGenerator = ({ avatarUrl, onVideosGenerated, onTasksUpdated }: VideoGeneratorProps) => {
  const defaultProduct = VIDEO_AVATAR_PRODUCTS.find((p) => p.id === "ai-reel-pro") || VIDEO_AVATAR_PRODUCTS[0];
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [segments, setSegments] = useState<VideoSegment[]>([
    { id: "1", script: "", duration: defaultProduct.supportedDurations?.[0] || 8, status: "pending" },
  ]);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(getDefaultVoice());
  const [selectedProduct, setSelectedProduct] = useState<CommercialProduct>(defaultProduct);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState<string | null>(null);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const { addTask, updateTask } = useGenerationTasks();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, theme_color")
        .order("name");
      if (data) setProjects(data);
    };
    fetchProjects();
  }, []);

  const generateAIScript = async (segmentId: string, project: Project) => {
    setIsGeneratingScript(segmentId);
    setProjectSelectorOpen(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("suggest-content", {
        body: {
          projectName: project.name,
          projectDescription: `${project.description || project.name}. Create a viral ${selectedProduct.category} script for social media. The content should be engaging, dynamic, and optimized for ${selectedProduct.name}.`,
        },
      });

      if (error) throw error;

      const suggestions = data?.suggestions;
      if (suggestions && suggestions.length > 0) {
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        updateSegment(segmentId, { script: randomSuggestion.content });
        
        toast({
          title: "Script generated! ✨",
          description: `Based on ${project.name}`,
        });
      } else {
        throw new Error("No suggestions received");
      }
    } catch (error) {
      console.error("AI script generation error:", error);
      toast({
        title: "Generation error",
        description: "Unable to generate script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingScript(null);
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
                prompt: segment.script,
                avatarUrl,
                duration: segment.duration,
                size: "720x1280",
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

    // Step 3: Poll for video completion
    const pollInterval = setInterval(async () => {
      let allComplete = true;
      let anyError = false;

      const updatedSegments = await Promise.all(
        segmentsWithTasks.map(async (segment) => {
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

      setSegments(updatedSegments);

      if (allComplete || anyError) {
        clearInterval(pollInterval);
        setIsGenerating(false);

        const readyCount = updatedSegments.filter((s) => s.status === "ready").length;
        const errorCount = updatedSegments.filter((s) => s.status === "error").length;

        if (readyCount > 0) {
          toast({
            title: `🎬 ${selectedProduct.name} générées !`,
            description: `${readyCount} vidéo(s) prête(s) avec voix IA${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}`,
          });
          onVideosGenerated(updatedSegments);
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
      className="rounded-2xl bg-card p-6 shadow-card"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Video className="h-5 w-5 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold">AI Generator</h3>
          <p className="text-sm text-muted-foreground">
            Create content with the best AI models
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gradient">~{estimatedCost}€</p>
          <p className="text-xs text-muted-foreground">Estimated price</p>
        </div>
      </div>

      {/* Product Selector Toggle */}
      <Collapsible open={showProductSelector} onOpenChange={setShowProductSelector} className="mb-6">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span>Product: <strong>{selectedProduct.name}</strong></span>
              <span className="text-muted-foreground">({selectedProduct.salePrice}€{selectedProduct.salePriceUnit})</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {showProductSelector ? "Hide" : "Change"}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <ProductSelector
            selectedProduct={selectedProduct}
            categories={["video", "avatar"]}
            onProductChange={(product) => {
              setSelectedProduct(product);
              // Reset durations to first supported duration for new product
              const newDefaultDuration = product.supportedDurations?.[0] || 8;
              setSegments((prev) =>
                prev.map((s) => ({ ...s, duration: newDefaultDuration }))
              );
              setShowProductSelector(false);
            }}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Voice Selection - Only show if product needs voice */}
      {selectedProduct.needsVoice && (
        <div className="mb-6">
          <VoiceSelector
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            compact
          />
        </div>
      )}

      {/* Content Segments */}
      <div className="mb-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border-2 border-border p-4 transition-colors hover:border-primary/30"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">
                    {selectedProduct.category === "video" ? "Segment" : selectedProduct.category === "avatar" ? "Avatar" : "Image"} {index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(selectedProduct.category === "video" || selectedProduct.category === "avatar") && selectedProduct.supportedDurations && (
                    <select
                      value={segment.duration}
                      onChange={(e) => updateSegment(segment.id, { duration: Number(e.target.value) })}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    >
                      {selectedProduct.supportedDurations.map((dur) => (
                        <option key={dur} value={dur}>
                          {dur}s (~{Math.round(dur * selectedProduct.salePrice / 10)}€)
                        </option>
                      ))}
                    </select>
                  )}
                  {segments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSegment(segment.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Textarea
                  placeholder={
                    selectedProduct.category === "video"
                      ? "Ex: Hey everyone! Today I'm presenting this incredible product that will change everything..."
                      : selectedProduct.category === "avatar"
                      ? "Ex: Hi, I'm your favorite AI influencer and I have something amazing to share with you today..."
                      : "Ex: A lifestyle photo of an influencer on a beach at sunset with golden hour lighting..."
                  }
                  value={segment.script}
                  onChange={(e) => updateSegment(segment.id, { script: e.target.value })}
                  className="min-h-[140px] resize-none border-2 focus:border-primary/50 text-sm"
                />
                
                {/* AI Script Generation Button */}
                <div className="flex flex-wrap gap-2">
                  <Popover 
                    open={projectSelectorOpen === segment.id} 
                    onOpenChange={(open) => setProjectSelectorOpen(open ? segment.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        disabled={isGeneratingScript === segment.id || projects.length === 0}
                      >
                        {isGeneratingScript === segment.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Generate with AI
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Select project context
                      </p>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => generateAIScript(segment.id, project)}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                            >
                              <div
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: project.theme_color || "#3B82F6" }}
                              />
                              <span className="truncate">{project.name}</span>
                            </button>
                          ))}
                          {projects.length === 0 && (
                            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                              No projects found. Create a project first.
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {segment.status !== "pending" && (
                <div className="mt-2 space-y-2">
                  {segment.status === "generating" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-accent">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating {selectedProduct.name}...
                        </span>
                        <span className="text-muted-foreground">{segment.progress || 0}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                          style={{ width: `${segment.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {segment.status === "ready" && (
                    <span className="flex items-center gap-1 text-sm text-primary">
                      <Play className="h-4 w-4" />
                      {selectedProduct.category === "video" ? "Video ready" : selectedProduct.category === "avatar" ? "Avatar ready" : "Content ready"}
                    </span>
                  )}
                  {segment.status === "error" && (
                    <span className="flex items-center gap-1 text-sm text-destructive">
                      Generation error
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Segment Button */}
      <Button variant="outline" onClick={addSegment} className="mb-4 w-full border-dashed">
        <Plus className="h-4 w-4" />
        Add {selectedProduct.category === "video" ? "segment" : selectedProduct.category === "avatar" ? "avatar" : "image"}
      </Button>

      {/* Generate Button */}
      <Button
        onClick={generateContent}
        disabled={isGenerating || segments.every((s) => !s.script.trim())}
        variant="gradient"
        size="lg"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Generate with {selectedProduct.name} (~{estimatedCost}€)
          </>
        )}
      </Button>

      {/* Generation Progress Modal */}
      <GenerationProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        tasks={generationTasks}
        productName={selectedProduct.name}
      />
    </motion.div>
  );
};
