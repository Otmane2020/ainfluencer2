import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Voice } from "@/lib/voices";

export const useVoicePreview = () => {
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const { toast } = useToast();

  const previewVoice = async (voice: Voice) => {
    // Stop current audio if playing
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }

    setIsPlaying(true);
    setPlayingVoiceId(voice.id);

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
            text: "Hi, I'm your AI influencer. Ready to create viral content for your brand?",
            voiceId: voice.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate preview");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
        setPlayingVoiceId(null);
      };

      setPreviewAudio(audio);
      await audio.play();
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Preview Error",
        description: "Unable to play voice preview",
        variant: "destructive",
      });
      setIsPlaying(false);
      setPlayingVoiceId(null);
    }
  };

  const stopPreview = () => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }
    setIsPlaying(false);
    setPlayingVoiceId(null);
  };

  return {
    previewVoice,
    stopPreview,
    isPlaying,
    playingVoiceId,
  };
};
