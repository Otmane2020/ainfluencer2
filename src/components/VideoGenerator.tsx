import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Sparkles, Loader2, Upload, Wand2, Volume2, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Voice {
  id: string;
  name: string;
  gender: "female" | "male";
  preview?: string;
}

const AVAILABLE_VOICES: Voice[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "male" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male" },
];

interface VideoSegment {
  id: string;
  script: string;
  duration: number;
  status: "pending" | "generating" | "ready" | "error";
  videoUrl?: string;
  audioUrl?: string;
  taskId?: string;
  progress?: number;
}

interface VideoGeneratorProps {
  avatarUrl?: string;
  onVideosGenerated: (videos: VideoSegment[]) => void;
}

export const VideoGenerator = ({ avatarUrl, onVideosGenerated }: VideoGeneratorProps) => {
  const [segments, setSegments] = useState<VideoSegment[]>([
    { id: "1", script: "", duration: 10, status: "pending" },
  ]);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(AVAILABLE_VOICES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const addSegment = () => {
    setSegments((prev) => [
      ...prev,
      { id: Date.now().toString(), script: "", duration: 10, status: "pending" },
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

  const previewVoice = async (voice: Voice) => {
    if (previewAudio) {
      previewAudio.pause();
    }

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
            text: "Bonjour, je suis votre AI influenceur. Prêt à créer du contenu viral ?",
            voiceId: voice.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate preview");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      setPreviewAudio(audio);
      await audio.play();
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de lire l'aperçu vocal",
        variant: "destructive",
      });
    }
  };

  const generateVideos = async () => {
    const validSegments = segments.filter((s) => s.script.trim());
    if (validSegments.length === 0) {
      toast({
        title: "Scripts requis",
        description: "Ajoutez au moins un script pour générer les vidéos",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    // Mark all as generating
    setSegments((prev) =>
      prev.map((s) =>
        s.script.trim() ? { ...s, status: "generating" as const, progress: 0 } : s
      )
    );

    toast({
      title: "Génération Sora 2 en cours...",
      description: "Création de vraies vidéos publicitaires (peut prendre quelques minutes)",
    });

    try {
      // Step 1: Generate audio with ElevenLabs TTS for voiceover
      const segmentsWithAudio = await Promise.all(
        segments.map(async (segment) => {
          if (!segment.script.trim()) return segment;

          try {
            // Generate audio
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

            if (!audioResponse.ok) {
              throw new Error(`TTS failed: ${audioResponse.status}`);
            }

            const audioBlob = await audioResponse.blob();
            
            // Upload audio to Supabase storage
            const audioFileName = `audio/${Date.now()}-${segment.id}.mp3`;
            const { error: audioUploadError } = await supabase.storage
              .from("media")
              .upload(audioFileName, audioBlob, {
                contentType: "audio/mpeg",
                upsert: true,
              });

            if (audioUploadError) throw audioUploadError;

            const { data: audioUrlData } = supabase.storage
              .from("media")
              .getPublicUrl(audioFileName);

            return {
              ...segment,
              audioUrl: audioUrlData.publicUrl,
            };
          } catch (error) {
            console.error("Audio generation error:", error);
            return { ...segment, status: "error" as const };
          }
        })
      );

      // Step 2: Generate videos with Sora 2
      const segmentsWithTasks = await Promise.all(
        segmentsWithAudio.map(async (segment) => {
          if (segment.status === "error" || !segment.script.trim()) return segment;

          try {
            // Create video generation task with Sora 2
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
                  duration: segment.duration <= 4 ? 4 : segment.duration <= 8 ? 8 : 12,
                  size: "720x1280", // Portrait for social media
                }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Video creation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log("Video task created:", result.taskId);

            return {
              ...segment,
              taskId: result.taskId,
              progress: 0,
            };
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

              if (!statusResponse.ok) {
                throw new Error(`Status check failed: ${statusResponse.status}`);
              }

              const status = await statusResponse.json();
              console.log(`Task ${segment.taskId} status:`, status.status, status.progress);

              if (status.status === "completed" && status.videoUrl) {
                // Download and store video
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
                  
                  const { error: videoUploadError } = await supabase.storage
                    .from("media")
                    .upload(videoFileName, videoBlob, {
                      contentType: "video/mp4",
                      upsert: true,
                    });

                  if (!videoUploadError) {
                    const { data: videoUrlData } = supabase.storage
                      .from("media")
                      .getPublicUrl(videoFileName);

                    return {
                      ...segment,
                      status: "ready" as const,
                      videoUrl: videoUrlData.publicUrl,
                      progress: 100,
                    };
                  }
                }

                // Fallback: use the direct URL
                return {
                  ...segment,
                  status: "ready" as const,
                  videoUrl: status.videoUrl,
                  progress: 100,
                };
              } else if (status.status === "failed") {
                anyError = true;
                return {
                  ...segment,
                  status: "error" as const,
                };
              } else {
                allComplete = false;
                return {
                  ...segment,
                  progress: status.progress || 0,
                };
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
              title: "🎬 Vidéos Sora 2 générées !",
              description: `${readyCount} vidéo(s) prête(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}`,
            });
            onVideosGenerated(updatedSegments);
          } else {
            toast({
              title: "Erreur de génération",
              description: "Impossible de générer les vidéos Sora 2",
              variant: "destructive",
            });
          }
        }
      }, 10000); // Poll every 10 seconds

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsGenerating(false);
        toast({
          title: "Timeout",
          description: "La génération a pris trop de temps. Vérifiez les vidéos dans l'historique.",
          variant: "destructive",
        });
      }, 600000);

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

  const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);

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
          <h3 className="font-display text-lg font-semibold">Générateur de Vidéos</h3>
          <p className="text-sm text-muted-foreground">
            Créez des vidéos avec votre avatar IA
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gradient">{totalDuration}s</p>
          <p className="text-xs text-muted-foreground">Durée totale</p>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium">Voix de l'influenceur</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice)}
              className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedVoice.id === voice.id
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span>{voice.gender === "female" ? "👩" : "👨"}</span>
              {voice.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  previewVoice(voice);
                }}
                className="ml-1 rounded-full p-1 opacity-0 transition-opacity hover:bg-foreground/10 group-hover:opacity-100"
              >
                <Volume2 className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Video Segments */}
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
                  <span className="text-sm font-medium">Segment {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={segment.duration}
                    onChange={(e) =>
                      updateSegment(segment.id, { duration: Number(e.target.value) })
                    }
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value={10}>10 secondes</option>
                    <option value={15}>15 secondes</option>
                    <option value={20}>20 secondes</option>
                  </select>
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

              <Textarea
                placeholder="Ex: Salut tout le monde ! Aujourd'hui je vous présente ce produit incroyable..."
                value={segment.script}
                onChange={(e) => updateSegment(segment.id, { script: e.target.value })}
                className="min-h-[80px] resize-none border-2 focus:border-primary/50"
              />

              {segment.status !== "pending" && (
                <div className="mt-2 space-y-2">
                  {segment.status === "generating" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-accent">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Génération Sora 2...
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
                      Vidéo prête
                    </span>
                  )}
                  {segment.status === "error" && (
                    <span className="flex items-center gap-1 text-sm text-destructive">
                      Erreur de génération
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Segment Button */}
      <Button
        variant="outline"
        onClick={addSegment}
        className="mb-4 w-full border-dashed"
      >
        <Plus className="h-4 w-4" />
        Ajouter un segment
      </Button>

      {/* Generate Button */}
      <Button
        onClick={generateVideos}
        disabled={isGenerating || segments.every((s) => !s.script.trim())}
        variant="gradient"
        size="lg"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Générer les vidéos
          </>
        )}
      </Button>
    </motion.div>
  );
};
