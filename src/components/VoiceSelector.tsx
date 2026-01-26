import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Play, Pause, User, Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AVAILABLE_LANGUAGES, 
  getVoicesByLanguage, 
  getDefaultVoiceForLanguage,
  Voice, 
  VoiceLanguage,
  Language 
} from "@/lib/voices";
import { useVoicePreview } from "@/hooks/useVoicePreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>(
    selectedVoice?.language || "en"
  );
  const { previewVoice, stopPreview, isPlaying, playingVoiceId } = useVoicePreview();

  const voicesForLanguage = getVoicesByLanguage(selectedLanguage);
  const femaleVoices = voicesForLanguage.filter(v => v.gender === "female");
  const maleVoices = voicesForLanguage.filter(v => v.gender === "male");

  const handleLanguageChange = (langCode: VoiceLanguage) => {
    setSelectedLanguage(langCode);
    // Auto-select first voice of the new language
    const defaultVoice = getDefaultVoiceForLanguage(langCode);
    onVoiceChange(defaultVoice);
  };

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
      <div className="space-y-3">
        {/* Language selector compact */}
        <Select value={selectedLanguage} onValueChange={(val) => handleLanguageChange(val as VoiceLanguage)}>
          <SelectTrigger className="w-full bg-card">
            <Globe className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
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

        {/* Voice chips */}
        <div className="flex flex-wrap gap-2">
          {voicesForLanguage.map((voice) => (
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
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Volume2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-sm">AI Voice</h3>
          <p className="text-xs text-muted-foreground">Choose language & voice</p>
        </div>
      </div>

      {/* Language Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          Language
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <motion.button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all",
                selectedLanguage === lang.code
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="text-[10px] font-medium">{lang.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Voice Selection by Gender */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedLanguage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Female Voices */}
          {femaleVoices.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Female Voices
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {femaleVoices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    isSelected={selectedVoice.id === voice.id}
                    isPlaying={playingVoiceId === voice.id && isPlaying}
                    onSelect={() => onVoiceChange(voice)}
                    onPreview={(e) => handlePreview(e, voice)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Male Voices */}
          {maleVoices.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Male Voices
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {maleVoices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    isSelected={selectedVoice.id === voice.id}
                    isPlaying={playingVoiceId === voice.id && isPlaying}
                    onSelect={() => onVoiceChange(voice)}
                    onPreview={(e) => handlePreview(e, voice)}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Voice Card Component
interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPreview: (e: React.MouseEvent) => void;
}

const VoiceCard = ({ voice, isSelected, isPlaying, onSelect, onPreview }: VoiceCardProps) => {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex items-center gap-2 rounded-lg border-2 p-2.5 text-left transition-all",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          voice.gender === "female"
            ? "bg-accent/20 text-accent"
            : "bg-primary/20 text-primary"
        )}
      >
        <User className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm block truncate">{voice.name}</span>
        {voice.accent && (
          <span className="text-[10px] text-muted-foreground">{voice.accent}</span>
        )}
      </div>
      
      {/* Play preview button */}
      <button
        onClick={onPreview}
        className={cn(
          "shrink-0 rounded-full p-1.5 transition-all",
          isPlaying
            ? "bg-primary text-primary-foreground"
            : "bg-muted hover:bg-muted/80"
        )}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </button>
    </motion.button>
  );
};

export default VoiceSelector;
