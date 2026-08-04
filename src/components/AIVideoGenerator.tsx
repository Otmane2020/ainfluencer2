import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Video, Wand2, Loader2, Sparkles, Clock, Zap, Crown, Mic, Volume2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
    id: "standard",
    name: "Standard",
    model: "ClipMotion",
    provider: "remotion",
    description: "Remotion - 5 credits",
    duration: 10,
    resolution: "1080p",
    icon: Zap,
    badge: "FAST",
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "pro",
    name: "Pro",
    model: "ClipMotion",
    provider: "remotion",
    description: "Remotion Pro - 10 credits",
    duration: 15,
    resolution: "1080p",
    icon: Sparkles,
    badge: "POPULAR",
    color: "from-primary to-violet-600",
  },
  {
    id: "cinema",
    name: "Cinema",
    model: "ClipMotion",
    provider: "remotion",
    description: "Remotion Cinema - 20 credits",
    duration: 20,
    resolution: "4K",
    icon: Crown,
    badge: "BEST",
    color: "from-amber-500 to-orange-500",
  },
];

// ============================================================
// ELEVENLABS VOICES
// ============================================================

interface Voice {
  id: string;
  name: string;
  description: string;
}

const ELEVENLABS_VOICES: Voice[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm, professional male" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Friendly, natural female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Authoritative male" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Soft, expressive female" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Young, energetic male" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", description: "Clear, articulate female" },
];

interface AIVideoGeneratorProps {
  onBeforeGenerate?: () => boolean;
}

export const AIVideoGenerator = ({ onBeforeGenerate }: AIVideoGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [selectedTier, setSelectedTier] = useState<QualityTier>(QUALITY_TIERS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Initializing...");

  // Voiceover state
  const [enableVoiceover, setEnableVoiceover] = useState(false);
  const [voiceoverText, setVoiceoverText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<Voice>(ELEVENLABS_VOICES[0]);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [enableAutoSpeech, setEnableAutoSpeech] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (generationId: string, jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      const { data, error } = await supabase.functions.invoke("poll-render-job", {
        body: { generationId, jobId },
      });

      if (error || !data) return;

      setProgress(data.progress ?? 0);
      setProgressLabel(`Rendering... ${data.progress ?? 0}%`);

      if (data.status === "completed") {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;

        setIsGenerating(false);
        setProgress(100);
        setProgressLabel("Done!");
        setGeneratedVideo(data.mediaUrl);

        toast({
          title: "Video ready 🎬",
          description: "Render completed",
        });
      }

      if (data.status === "failed") {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;

        setIsGenerating(false);
        setProgress(0);

        toast({
          title: "Render failed",
          description: data.error || "Worker failed",
          variant: "destructive",
        });
      }
    }, 3000);
  };

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
    setProgress(10);
    setProgressLabel("Generating voiceover...");
    setGeneratedVideo(null);

    toast({
      title: `Starting Remotion render (${selectedTier.name})...`,
      description: `Quality: ${selectedTier.id} · ${selectedTier.resolution} · ${selectedTier.duration}s`,
    });

    try {
      // Generate voiceover first if enabled
      let audioUrl: string | null = null;
      if (enableVoiceover && voiceoverText.trim()) {
        audioUrl = await generateVoiceover();
      }

      if (!audioUrl && enableVoiceover) {
        // If voiceover was requested but failed, abort
        setIsGenerating(false);
        return;
      }

      // If no voiceover, we still need an audio track — use a silent placeholder
      // The worker will fail if audioUrl is missing, so we require it
      if (!audioUrl) {
        toast({
          title: "Voiceover required",
          description: "Please enable the AI voiceover and enter a narration script — Remotion needs an audio track.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      setProgressLabel("Sending to render worker...");
      setProgress(15);

      const { data, error } = await supabase.functions.invoke("render-video", {
        body: {
          quality: selectedTier.id,
          audioUrl,
          props: {
            text: prompt.trim(),
            duration: selectedTier.duration,
          },
        },
      });

      if (error) throw error;

      if (data?.code === "WORKER_NOT_CONFIGURED" || data?.code === "WORKER_PLACEHOLDER_URL") {
        throw new Error(data.error);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Render failed to start");
      }

      const generationId = data.generationId;
      const jobId = data.jobId;
      console.log("[AIVideoGenerator] Render started, generationId:", generationId, "jobId:", jobId);

      setProgressLabel("Worker accepted. FFmpeg rendering...");
      setProgress(20);

      // Start polling for completion
      if (generationId && jobId) {
        startPolling(generationId, jobId);
      } else {
        // Fallback: no generationId returned
        setIsGenerating(false);
        toast({
          title: "Render started",
          description: "Check History for your video when ready",
        });
      }
    } catch (error: any) {
      console.error("Remotion render error:", error);
      setIsGenerating(false);
      setProgress(0);
      toast({
        title: "Render error",
        description: error.message || "Unable to start render",
        variant: "destructive",
      });
    }
  };

  // Generate voiceover audio — uploads to Supabase Storage & returns public URL
  const generateVoiceover = async (): Promise<string | null> => {
    if (!voiceoverText.trim()) return null;
    
    setIsGeneratingAudio(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: voiceoverText,
            voiceId: selectedVoice.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      // Upload to Supabase Storage so edge function can access a real HTTPS URL
      const audioBlob = await response.blob();
      const audioFileName = `audio/remotion-${Date.now()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(audioFileName, audioBlob, { contentType: "audio/mpeg", upsert: true });

      if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(audioFileName);
      const publicUrl = urlData.publicUrl;

      // Also keep a local blob for preview
      const blobUrl = URL.createObjectURL(audioBlob);
      setGeneratedAudio(blobUrl);

      return publicUrl;
    } catch (error) {
      console.error("Voiceover error:", error);
      toast({
        title: "Voiceover failed",
        description: "Could not generate audio narration",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Preview voice
  const previewVoice = async () => {
    if (isPlayingPreview) return;
    
    setIsPlayingPreview(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: "Hello! This is a preview of my voice.",
            voiceId: selectedVoice.id,
            quality: "premium-voice",
          }),
        }
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlayingPreview(false);
        await audio.play();
      }
    } catch (e) {
      console.error("Preview error:", e);
    } finally {
      setTimeout(() => setIsPlayingPreview(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Quality Tier Selection */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Video Prompt Input */}
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
      </div>

      {/* ElevenLabs Voiceover Section */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <span className="font-semibold">AI Voiceover</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              ElevenLabs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="voiceover-toggle" className="text-sm text-muted-foreground">
              {enableVoiceover ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="voiceover-toggle"
              checked={enableVoiceover}
              onCheckedChange={setEnableVoiceover}
              disabled={isGenerating}
            />
          </div>
        </div>

        {enableVoiceover && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language-select" className="text-sm text-muted-foreground">Language</Label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="nl">Dutch</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
                <option value="ko">Korean</option>
              </select>
            </div>

            {/* Auto Speech Toggle */}
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <Label htmlFor="auto-speech-toggle" className="text-sm font-medium">Auto-Generate Speech</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Generate narration from video description</p>
                </div>
              </div>
              <Switch
                id="auto-speech-toggle"
                checked={enableAutoSpeech}
                onCheckedChange={setEnableAutoSpeech}
                disabled={isGenerating}
              />
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Voice</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ELEVENLABS_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                      selectedVoice.id === voice.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Volume2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{voice.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{voice.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={previewVoice}
                disabled={isPlayingPreview}
                className="mt-2"
              >
                {isPlayingPreview ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Preview Voice
                  </>
                )}
              </Button>
            </div>

            {/* Voiceover Text */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Narration Script</Label>
              <Textarea
                value={voiceoverText}
                onChange={(e) => setVoiceoverText(e.target.value)}
                placeholder="Write the narration text for your video..."
                className="min-h-[80px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-[10px] text-muted-foreground">
                Tip: Keep it short and match your video duration ({selectedTier.duration}s)
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Progress bar */}
      {isGenerating && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/60"
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
        disabled={isGenerating || !prompt.trim() || (enableVoiceover && isGeneratingAudio)}
        className="w-full"
        variant="gradient"
        size="lg"
      >
        {isGenerating || isGeneratingAudio ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isGeneratingAudio ? "Generating Voiceover..." : "Generating Video..."}
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Video {enableVoiceover && "+ Voiceover"}
          </>
        )}
      </Button>

      {/* Video Preview */}
      {generatedVideo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            Generated Video
            {generatedAudio && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                + Voiceover
              </span>
            )}
          </h3>
          <video
            src={generatedVideo}
            controls
            autoPlay
            loop
            className="w-full rounded-lg aspect-video bg-background"
          />
          
          {/* Audio player for voiceover */}
          {generatedAudio && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Mic className="h-4 w-4 text-primary shrink-0" />
              <audio src={generatedAudio} controls className="flex-1 h-8" />
            </div>
          )}
          
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(generatedVideo, "_blank")}
            >
              Download Video
            </Button>
            {generatedAudio && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(generatedAudio, "_blank")}
              >
                Download Audio
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGeneratedVideo(null);
                setGeneratedAudio(null);
                setPrompt("");
                setVoiceoverText("");
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
