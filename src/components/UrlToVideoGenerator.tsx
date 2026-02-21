import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Wand2, Loader2, Video, Mic, Volume2, Play, Pause,
  Clock, Zap, Sparkles, Crown, RefreshCw, ExternalLink, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ── Video Style Options ──
const VIDEO_STYLES = [
  { id: "promo", label: "Promo / Ad", description: "Punchy ad with CTA", icon: Zap },
  { id: "demo", label: "Product Demo", description: "Walkthrough features", icon: Video },
  { id: "explainer", label: "Explainer", description: "Educational breakdown", icon: Sparkles },
  { id: "testimonial", label: "Testimonial", description: "Customer perspective", icon: Crown },
] as const;

// ── ElevenLabs Voices ──
const VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm, professional male" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Friendly, natural female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Authoritative male" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Soft, expressive female" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Young, energetic male" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", description: "Clear, articulate female" },
];

interface UrlToVideoGeneratorProps {
  onBeforeGenerate?: () => boolean;
}

export const UrlToVideoGenerator = ({ onBeforeGenerate }: UrlToVideoGeneratorProps) => {
  const [url, setUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("promo");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);

  // Scrape state
  const [isScraping, setIsScraping] = useState(false);
  const [script, setScript] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [scraped, setScraped] = useState(false);

  // Render state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);

  // Audio preview
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Step 1: Scrape URL & generate script ──
  const handleScrape = async () => {
    if (!url.trim()) {
      toast({ title: "URL required", description: "Paste a website URL", variant: "destructive" });
      return;
    }

    setIsScraping(true);
    setScraped(false);
    setScript("");
    setScreenshot(null);
    setGeneratedVideo(null);

    try {
      const { data, error } = await supabase.functions.invoke("url-to-video-script", {
        body: { url: url.trim(), style: selectedStyle, language: "en" },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Scraping failed");

      setScript(data.script || "");
      setScreenshot(data.screenshot || null);
      setPageTitle(data.title || "");
      setScraped(true);

      toast({ title: "Website analyzed ✨", description: `Script generated from ${data.title || url}` });
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast({ title: "Scraping failed", description: err.message || "Could not analyze URL", variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  // ── Regenerate script with different style ──
  const handleRegenerate = async () => {
    if (!url.trim()) return;
    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("url-to-video-script", {
        body: { url: url.trim(), style: selectedStyle, language: "en" },
      });
      if (error) throw error;
      if (data?.script) setScript(data.script);
      toast({ title: "Script regenerated ✨" });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  // ── Step 2: Generate voiceover + render video ──
  const handleGenerate = async () => {
    if (!script.trim()) {
      toast({ title: "Script required", description: "Generate or write a script first", variant: "destructive" });
      return;
    }
    if (onBeforeGenerate && !onBeforeGenerate()) return;

    setIsGenerating(true);
    setProgress(5);
    setProgressLabel("Generating voiceover...");
    setGeneratedVideo(null);

    try {
      // Generate TTS audio
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const ttsRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: script, voiceId: selectedVoice.id }),
        }
      );

      if (!ttsRes.ok) throw new Error(`TTS failed: ${ttsRes.status}`);

      setProgress(15);
      setProgressLabel("Uploading audio...");

      // Upload audio to storage
      const audioBlob = await ttsRes.blob();
      const audioFileName = `audio/url-video-${Date.now()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(audioFileName, audioBlob, { contentType: "audio/mpeg", upsert: true });

      if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`);

      const { data: audioUrlData } = supabase.storage.from("media").getPublicUrl(audioFileName);
      const audioUrl = audioUrlData.publicUrl;

      setProgress(20);
      setProgressLabel("Starting render...");

      // Call render-video with screenshot as image
      // Use pageTitle for video overlay text (script is for voiceover audio only)
      const overlayText = pageTitle || url.replace(/^https?:\/\//, "").split("/")[0] || "Your Brand";
      const { data, error } = await supabase.functions.invoke("render-video", {
        body: {
          quality: "standard",
          audioUrl,
          props: {
            text: overlayText.slice(0, 80),
            duration: 10,
            image: screenshot || undefined,
          },
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Render failed");

      const generationId = data.generationId;
      const jobId = data.jobId;

      setProgress(25);
      setProgressLabel("Rendering video...");

      if (generationId && jobId) {
        startPolling(generationId, jobId);
      } else {
        setIsGenerating(false);
        toast({ title: "Render started", description: "Check History for your video" });
      }
    } catch (err: any) {
      console.error("Generate error:", err);
      setIsGenerating(false);
      setProgress(0);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  };

  // ── Polling ──
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
        toast({ title: "Video ready 🎬", description: "Your URL video is complete!" });
      }

      if (data.status === "failed") {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        setIsGenerating(false);
        setProgress(0);
        toast({ title: "Render failed", description: data.error || "Worker error", variant: "destructive" });
      }
    }, 3000);
  };

  // ── Voice preview ──
  const previewVoice = async () => {
    if (isPlayingPreview) return;
    setIsPlayingPreview(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: "Hello! This is a preview of my voice.", voiceId: selectedVoice.id }),
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.onended = () => setIsPlayingPreview(false);
        await audio.play();
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsPlayingPreview(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* URL Input */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-5 w-5 text-primary" />
          <span className="font-semibold">Website URL</span>
        </div>

        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yoursite.com"
            disabled={isScraping || isGenerating}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
          <Button
            onClick={handleScrape}
            disabled={isScraping || isGenerating || !url.trim()}
            className="shrink-0"
          >
            {isScraping ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" />Analyze</>
            )}
          </Button>
        </div>
      </div>

      {/* Video Style Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {VIDEO_STYLES.map((style) => {
          const Icon = style.icon;
          const isSelected = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              disabled={isGenerating}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className="font-medium text-sm">{style.label}</span>
              <span className="text-[10px] text-muted-foreground">{style.description}</span>
            </button>
          );
        })}
      </div>

      {/* Screenshot + Script (after scraping) */}
      <AnimatePresence>
        {scraped && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Screenshot Preview */}
            {screenshot && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Screenshot (video background)</span>
                  </div>
                  {pageTitle && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{pageTitle}</span>
                  )}
                </div>
                <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                  <img
                    src={screenshot}
                    alt="Website screenshot"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Editable Script */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Video Script (voiceover)</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isScraping || isGenerating}
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", isScraping && "animate-spin")} />
                  Regenerate
                </Button>
              </div>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Your video narration script..."
                className="min-h-[140px] resize-none text-sm"
                disabled={isGenerating}
              />
              <p className="text-[10px] text-muted-foreground">
                {script.split(/\s+/).filter(Boolean).length} words · Edit freely before generating
              </p>
            </div>

            {/* Voice Selection */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Voice</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    ElevenLabs
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={previewVoice} disabled={isPlayingPreview}>
                  {isPlayingPreview ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Playing</>
                  ) : (
                    <><Play className="h-3 w-3 mr-1" />Preview</>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VOICES.map((voice) => (
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
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !script.trim()}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700 text-primary-foreground font-semibold"
            >
              {isGenerating ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />{progressLabel || "Generating..."}</>
              ) : (
                <><Video className="h-5 w-5 mr-2" />Generate Video</>
              )}
            </Button>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{progressLabel}</span>
                  <span className="font-mono font-bold text-primary">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-violet-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Generated Video */}
            {generatedVideo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-primary/30 bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Your Video</span>
                </div>
                <video
                  src={generatedVideo}
                  controls
                  className="w-full rounded-lg border border-border aspect-video"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(generatedVideo, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={generatedVideo} download="url-video.mp4">
                      Download
                    </a>
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
