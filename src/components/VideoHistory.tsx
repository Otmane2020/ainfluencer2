import { motion } from "framer-motion";
import { Video, Play, Pause, Download, Trash2, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VideoHistoryItem {
  id: string;
  title: string;
  script: string;
  duration: number;
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  voice: string;
  status: "ready" | "processing" | "error";
}

interface VideoHistoryProps {
  videos: VideoHistoryItem[];
  onDelete: (id: string) => void;
  onPlay: (video: VideoHistoryItem) => void;
}

export const VideoHistory = ({ videos, onDelete, onPlay }: VideoHistoryProps) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (video: VideoHistoryItem) => {
    if (playingId === video.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (video.audioUrl) {
        audioRef.current = new Audio(video.audioUrl);
        audioRef.current.play();
        audioRef.current.onended = () => setPlayingId(null);
      }
      setPlayingId(video.id);
      onPlay(video);
    }
  };

  const handleDownload = async (video: VideoHistoryItem) => {
    if (video.videoUrl || video.audioUrl) {
      const url = video.videoUrl || video.audioUrl;
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `video-${video.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  if (videos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-6 shadow-card"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Clock className="h-5 w-5 text-secondary-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold">Historique Vidéos</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Aucune vidéo dans l'historique</p>
          <p className="text-sm text-muted-foreground">
            Les vidéos générées apparaîtront ici
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-6 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Clock className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Historique Vidéos</h3>
            <p className="text-sm text-muted-foreground">
              {videos.length} vidéo{videos.length > 1 ? "s" : ""} générée{videos.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {videos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative rounded-xl border border-border bg-background/50 p-4 transition-all hover:border-primary/30 hover:bg-muted/30"
          >
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <button
                  onClick={() => togglePlay(video)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {playingId === video.id ? (
                    <Pause className="h-8 w-8 text-white" />
                  ) : (
                    <Play className="h-8 w-8 text-white" />
                  )}
                </button>
                {video.status === "processing" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h4 className="mb-1 truncate font-medium">{video.title}</h4>
                <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                  {video.script}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {video.duration}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(video.createdAt, "d MMM yyyy", { locale: fr })}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {video.voice}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(video)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(video.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Progress bar for playing */}
            {playingId === video.id && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: video.duration, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 w-full origin-left rounded-b-xl bg-primary"
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export type { VideoHistoryItem };
