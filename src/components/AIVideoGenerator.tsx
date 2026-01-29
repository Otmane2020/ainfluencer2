import { useState } from "react";
import { motion } from "framer-motion";
import { Video, Wand2, Loader2, Sparkles, Clock, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ============================================================
// MODEL QUALITY TIERS
// ============================================================

interface QualityTier {
  id: string;
  name: string;
  model: string;
  provider: string;
  description: string;
  duration: number;
  resolution: string;
  icon: typeof Zap;
  badge?: string;
  color: string;
}

const QUALITY_TIERS: QualityTier[] = [
  {
    id: "high",
    name: "High Quality",
    model: "wan-2.1-i2v",
    provider: "replicate",
    description: "Wan 2.1 I2V via Replicate",
    duration: 5,
    resolution: "720p",
    icon: Crown,
    badge: "BEST",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "medium",
    name: "Medium Quality",
    model: "sora-2",
    provider: "cometapi",
    description: "Sora 12s via CometAPI",
    duration: 12,
    resolution: "1080p",
    icon: Sparkles,
    badge: "POPULAR",
    color: "from-primary to-violet-600",
  },
  {
    id: "low",
    name: "Low Quality",
    model: "kling-video",
    provider: "cometapi",
    description: "Kling 2.x (std) - Fast",
    duration: 5,
    resolution: "720p",
    icon: Zap,
    color: "from-emerald-500 to-teal-500",
  },
];

interface AIVideoGeneratorProps {
  onBeforeGenerate?: () => boolean;
}

export const AIVideoGenerator = ({ onBeforeGenerate }: AIVideoGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [selectedTier, setSelectedTier] = useState<QualityTier>(QUALITY_TIERS[1]); // Default: Medium
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the video you want to generate",
        variant: "destructive",
      });
      return;
    }

    if (onBeforeGenerate && !onBeforeGenerate()) {
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedVideo(null);

    toast({
      title: `Generating ${selectedTier.name}...`,
      description: `Using ${selectedTier.model} (${selectedTier.duration}s)`,
    });

    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-video", {
        body: {
          prompt: prompt.trim(),
          model: selectedTier.model,
          provider: selectedTier.provider,
          duration: selectedTier.duration,
          resolution: selectedTier.resolution,
        },
      });

      if (error) throw error;

      if (data?.taskId) {
        setTaskId(data.taskId);
        // Start polling
        pollForCompletion(data.taskId);
      } else if (data?.videoUrl) {
        setGeneratedVideo(data.videoUrl);
        setIsGenerating(false);
        toast({
          title: "Video generated! 🎬",
          description: "Your AI video is ready",
        });
      }
    } catch (error: any) {
      console.error("Video generation error:", error);
      setIsGenerating(false);
      toast({
        title: "Generation error",
        description: error.message || "Unable to generate video",
        variant: "destructive",
      });
    }
  };

  const pollForCompletion = async (tid: string) => {
    const maxAttempts = 120; // 10 minutes max
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s interval
      
      try {
        const { data, error } = await supabase.functions.invoke("generate-ai-video", {
          body: { action: "status", taskId: tid },
        });

        if (error) continue;

        setProgress(data?.progress || Math.min(i * 2, 95));

        if (data?.status === "completed" && data?.videoUrl) {
          setGeneratedVideo(data.videoUrl);
          setIsGenerating(false);
          setProgress(100);
          toast({
            title: "Video generated! 🎬",
            description: "Your AI video is ready",
          });
          return;
        } else if (data?.status === "failed") {
          throw new Error(data?.error || "Generation failed");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }

    setIsGenerating(false);
    toast({
      title: "Timeout",
      description: "Video generation took too long. Please try again.",
      variant: "destructive",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      {/* Quality Tier Selection */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {QUALITY_TIERS.map((tier) => {
          const Icon = tier.icon;
          const isSelected = selectedTier.id === tier.id;

          return (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {tier.badge && (
                <span className={cn(
                  "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r",
                  tier.color
                )}>
                  {tier.badge}
                </span>
              )}
              
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br",
                tier.color
              )}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              
              <span className="font-semibold text-sm">{tier.name}</span>
              <span className="text-[10px] text-muted-foreground text-center">
                {tier.description}
              </span>
              
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {tier.duration}s
                <span className="text-muted-foreground/50">•</span>
                {tier.resolution}
              </div>
            </button>
          );
        })}
      </div>

      {/* Simple Prompt Input */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Video className="h-5 w-5 text-primary" />
          <span className="font-semibold">Describe your video</span>
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A cat walking on the beach at sunset, cinematic lighting, slow motion..."
          className="min-h-[100px] resize-none"
          disabled={isGenerating}
        />

        {/* Progress bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Generating with {selectedTier.model}...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-violet-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateVideo}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
          variant="gradient"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Video
            </>
          )}
        </Button>
      </div>

      {/* Video Preview */}
      {generatedVideo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xl border border-border bg-card p-4"
        >
          <h3 className="font-semibold mb-3">Generated Video</h3>
          <video
            src={generatedVideo}
            controls
            autoPlay
            loop
            className="w-full rounded-lg aspect-video bg-black"
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(generatedVideo, "_blank")}
            >
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGeneratedVideo(null);
                setPrompt("");
              }}
            >
              New Video
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AIVideoGenerator;
