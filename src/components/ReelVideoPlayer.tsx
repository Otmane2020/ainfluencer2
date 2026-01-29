import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReelVideoPlayerProps {
  imageUrl: string;
  audioUrl?: string;
  duration?: number;
  className?: string;
  autoPlay?: boolean;
}

export function ReelVideoPlayer({
  imageUrl,
  audioUrl,
  duration = 10,
  className,
  autoPlay = false,
}: ReelVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle play/pause
  const togglePlay = () => {
    if (isEnded) {
      // Restart
      setProgress(0);
      setIsEnded(false);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Handle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  // Restart playback
  const restart = () => {
    setProgress(0);
    setIsEnded(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(true);
  };

  // Handle audio and progress
  useEffect(() => {
    const audio = audioRef.current;
    
    if (isPlaying && !isEnded) {
      // Start audio
      if (audio && audioUrl) {
        audio.play().catch(console.error);
      }
      
      // Progress animation
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (100 / (duration * 10));
          if (next >= 100) {
            setIsPlaying(false);
            setIsEnded(true);
            if (audio) audio.pause();
            return 100;
          }
          return next;
        });
      }, 100);
    } else {
      // Pause audio
      if (audio) {
        audio.pause();
      }
      
      // Clear interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isEnded, duration, audioUrl]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-black", className)}>
      {/* Image Background with Ken Burns effect */}
      <motion.div 
        className="aspect-[9/16] w-full"
        animate={isPlaying ? { scale: [1, 1.08] } : { scale: 1 }}
        transition={{ duration: duration, ease: "linear" }}
      >
        <img
          src={imageUrl}
          alt="Reel"
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {/* Progress bar */}
      <div className="absolute top-2 left-2 right-2 h-1 bg-white/30 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-white rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Play/Pause overlay */}
      <div 
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: isPlaying ? 0 : 1, scale: isPlaying ? 0.5 : 1 }}
          transition={{ duration: 0.2 }}
          className="bg-black/50 backdrop-blur-sm rounded-full p-4"
        >
          {isEnded ? (
            <RotateCcw className="h-10 w-10 text-white" />
          ) : isPlaying ? (
            <Pause className="h-10 w-10 text-white" />
          ) : (
            <Play className="h-10 w-10 text-white ml-1" />
          )}
        </motion.div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          {audioUrl && (
            <span className="text-xs text-white/80 bg-black/40 px-2 py-1 rounded-full">
              ♪ Music
            </span>
          )}
        </div>

        <div className="text-xs text-white/80 bg-black/40 px-2 py-1 rounded-full">
          {Math.round((progress / 100) * duration)}s / {duration}s
        </div>
      </div>

      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          loop={false}
          muted={isMuted}
          preload="auto"
        />
      )}
    </div>
  );
}
