import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Video, Upload, Wand2, Loader2, User, Volume2, Play, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VoiceSelector } from "@/components/VoiceSelector";
import { AVAILABLE_VOICES, getDefaultVoice, type Voice } from "@/lib/voices";

interface VideoMotionGeneratorProps {
  onBeforeGenerate?: () => boolean;
}

type GenerationStatus = "idle" | "uploading" | "generating_audio" | "generating_video" | "polling" | "completed" | "error";

export const VideoMotionGenerator = ({ onBeforeGenerate }: VideoMotionGeneratorProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [portraitImage, setPortraitImage] = useState<string | null>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<Voice>(getDefaultVoice());
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid format",
        description: "Please upload an image (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum size is 10 MB",
        variant: "destructive",
      });
      return;
    }

    setPortraitFile(file);
    setPortraitImage(URL.createObjectURL(file));
    toast({
      title: "Portrait uploaded!",
      description: "Your image is ready for lip-sync generation",
    });
  };

  const generateVideoMotion = async () => {
    // Check subscription
    if (onBeforeGenerate && !onBeforeGenerate()) {
      return;
    }

    if (!portraitImage || !portraitFile) {
      toast({
        title: "Portrait required",
        description: "Please upload a portrait image first",
        variant: "destructive",
      });
      return;
    }

    if (!script.trim()) {
      toast({
        title: "Script required",
        description: "Please enter the text for the influencer to say",
        variant: "destructive",
      });
      return;
    }

    // Get auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate videos",
        variant: "destructive",
      });
      return;
    }

    setStatus("uploading");
    setProgress(10);
    setErrorMessage(null);
    setGeneratedVideoUrl(null);

    try {
      // Step 1: Upload portrait image to storage
      const imageFileName = `video-motion/portrait-${Date.now()}-${crypto.randomUUID()}.${portraitFile.name.split('.').pop() || 'png'}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("media")
        .upload(imageFileName, portraitFile, {
          contentType: portraitFile.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: imageUrlData } = supabase.storage
        .from("media")
        .getPublicUrl(uploadData.path);

      const imageUrl = imageUrlData.publicUrl;
      console.log("[VideoMotion] Portrait uploaded:", imageUrl);
      setProgress(25);

      // Step 2: Generate audio with TTS
      setStatus("generating_audio");
      toast({
        title: "Generating voice...",
        description: `Using ${selectedVoice.name} voice`,
      });

      const audioResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            text: script,
            voiceId: selectedVoice.id,
          }),
        }
      );

      if (!audioResponse.ok) {
        throw new Error(`TTS failed: ${audioResponse.status}`);
      }

      const audioBlob = await audioResponse.blob();
      const audioFileName = `video-motion/audio-${Date.now()}.mp3`;

      await supabase.storage.from("media").upload(audioFileName, audioBlob, {
        contentType: "audio/mpeg",
        upsert: true,
      });

      const { data: audioUrlData } = supabase.storage
        .from("media")
        .getPublicUrl(audioFileName);

      const audioUrl = audioUrlData.publicUrl;
      console.log("[VideoMotion] Audio generated:", audioUrl);
      setProgress(50);

      // Step 3: Create Kling lip-sync task
      setStatus("generating_video");
      toast({
        title: "Creating video...",
        description: "Kling AI is generating your talking video",
      });

      const createResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-kling?action=create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            imageUrl,
            audioUrl,
            duration: Math.min(Math.ceil(script.length / 15), 30), // Estimate duration from script length
            aspectRatio: "9:16",
          }),
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || `Kling creation failed: ${createResponse.status}`);
      }

      const createResult = await createResponse.json();
      if (!createResult.success || !createResult.taskId) {
        throw new Error(createResult.error || "Failed to create Kling task");
      }

      console.log("[VideoMotion] Kling task created:", createResult.taskId);
      setTaskId(createResult.taskId);
      setProgress(60);

      // Step 4: Poll for completion
      setStatus("polling");
      toast({
        title: "Processing video...",
        description: "This may take 1-3 minutes",
      });

      const maxPolls = 60; // 5 minutes max
      let pollCount = 0;

      const pollInterval = setInterval(async () => {
        pollCount++;
        
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          setStatus("error");
          setErrorMessage("Video generation timed out. Please try again.");
          return;
        }

        try {
          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-kling?action=status&taskId=${createResult.taskId}`,
            {
              method: "GET",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!statusResponse.ok) {
            console.warn("[VideoMotion] Status check failed:", statusResponse.status);
            return;
          }

          const statusResult = await statusResponse.json();
          console.log("[VideoMotion] Status:", statusResult);

          // Update progress
          const currentProgress = 60 + Math.min(pollCount * 0.5, 35);
          setProgress(currentProgress);

          if (statusResult.status === "completed" && statusResult.videoUrl) {
            clearInterval(pollInterval);
            setGeneratedVideoUrl(statusResult.videoUrl);
            setStatus("completed");
            setProgress(100);
            toast({
              title: "Video ready!",
              description: "Your talking influencer video is complete",
            });
          } else if (statusResult.status === "failed") {
            clearInterval(pollInterval);
            setStatus("error");
            setErrorMessage("Video generation failed. Please try again.");
          }
        } catch (pollError) {
          console.warn("[VideoMotion] Poll error:", pollError);
        }
      }, 5000); // Poll every 5 seconds

    } catch (error) {
      console.error("[VideoMotion] Error:", error);
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const resetGenerator = () => {
    setStatus("idle");
    setProgress(0);
    setGeneratedVideoUrl(null);
    setTaskId(null);
    setErrorMessage(null);
  };

  const getStatusLabel = () => {
    switch (status) {
      case "uploading": return "Uploading portrait...";
      case "generating_audio": return "Generating voiceover...";
      case "generating_video": return "Creating lip-sync video...";
      case "polling": return "Processing video...";
      case "completed": return "Video ready!";
      case "error": return "Generation failed";
      default: return "Ready to generate";
    }
  };

  const isGenerating = status !== "idle" && status !== "completed" && status !== "error";

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30">
            <Video className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Video Motion
              <Badge variant="secondary" className="bg-violet-500/20 text-violet-400 border-0">
                KLING AI
              </Badge>
            </CardTitle>
            <CardDescription>
              Create talking influencer videos from a portrait image
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portrait Upload Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Portrait Image
          </label>
          <div 
            className={`relative aspect-[9/16] max-w-[200px] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
              portraitImage ? "border-primary/50" : "border-border hover:border-primary/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {portraitImage ? (
              <img 
                src={portraitImage} 
                alt="Portrait" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <User className="h-8 w-8" />
                <span className="text-xs text-center px-2">
                  Upload portrait<br />9:16 recommended
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Script Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Script (what should the influencer say?)
          </label>
          <Textarea
            placeholder="Enter the text for your AI influencer to speak..."
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            {script.length} characters • ~{Math.ceil(script.length / 15)}s video
          </p>
        </div>

        {/* Voice Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Voice
          </label>
          {!isGenerating && <VoiceSelector
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            compact
          />}
          {isGenerating && (
            <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              Voice: {selectedVoice.name}
            </div>
          )}
        </div>

        {/* Progress / Status */}
        {status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border"
          >
            <div className="flex items-center gap-2">
              {status === "completed" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : status === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className="text-sm font-medium">{getStatusLabel()}</span>
            </div>
            <Progress value={progress} className="h-2" />
            {errorMessage && (
              <p className="text-xs text-destructive">{errorMessage}</p>
            )}
          </motion.div>
        )}

        {/* Generated Video Preview */}
        {generatedVideoUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <label className="text-sm font-medium text-muted-foreground">
              Generated Video
            </label>
            <div className="relative aspect-[9/16] max-w-[280px] rounded-xl overflow-hidden bg-black">
              <video
                src={generatedVideoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(generatedVideoUrl, "_blank")}
              >
                <Play className="h-4 w-4 mr-1" />
                Open Full Video
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetGenerator}
              >
                Generate Another
              </Button>
            </div>
          </motion.div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateVideoMotion}
          disabled={!portraitImage || !script.trim() || isGenerating}
          className="w-full gradient-primary gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate Talking Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default VideoMotionGenerator;
