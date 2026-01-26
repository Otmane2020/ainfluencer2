import { motion } from "framer-motion";
import { Volume2, Play, Pause, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVAILABLE_VOICES, Voice } from "@/lib/voices";
import { useVoicePreview } from "@/hooks/useVoicePreview";

interface VoiceSelectorProps {
  selectedVoice: Voice;
  onVoiceChange: (voice: Voice) => void;
  compact?: boolean;
}

export const VoiceSelector = ({
  selectedVoice,
  onVoiceChange,
  compact = false,
}: VoiceSelectorProps) => {
  const { previewVoice, stopPreview, isPlaying, playingVoiceId } = useVoicePreview();

  const handlePreview = (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (playingVoiceId === voice.id) {
      stopPreview();
    } else {
      previewVoice(voice);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_VOICES.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onVoiceChange(voice)}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all",
              selectedVoice.id === voice.id
                ? "gradient-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <User className="h-3 w-3" />
            {voice.name}
            <button
              onClick={(e) => handlePreview(e, voice)}
              className="ml-1 rounded-full p-1 hover:bg-white/20"
            >
              {playingVoiceId === voice.id && isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </button>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Volume2 className="h-4 w-4 text-primary" />
        AI Voice
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {AVAILABLE_VOICES.map((voice) => (
          <motion.button
            key={voice.id}
            onClick={() => onVoiceChange(voice)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all",
              selectedVoice.id === voice.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                voice.gender === "female"
                  ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
              )}
            >
              <User className="h-5 w-5" />
            </div>
            <span className="font-medium text-sm">{voice.name}</span>
            {voice.accent && (
              <span className="text-[10px] text-muted-foreground">{voice.accent}</span>
            )}
            
            {/* Play preview button */}
            <button
              onClick={(e) => handlePreview(e, voice)}
              className={cn(
                "absolute right-2 top-2 rounded-full p-1.5 transition-all",
                playingVoiceId === voice.id && isPlaying
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {playingVoiceId === voice.id && isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </button>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default VoiceSelector;
