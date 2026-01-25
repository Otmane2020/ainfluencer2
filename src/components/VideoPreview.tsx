import { motion } from "framer-motion";
import { Play, Pause, Download, Merge, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

interface VideoSegment {
  id: string;
  script: string;
  duration: number;
  status: "pending" | "generating" | "ready" | "error";
  videoUrl?: string;
  audioUrl?: string;
}

interface VideoPreviewProps {
  segments: VideoSegment[];
  avatarUrl?: string;
  onMerge: () => void;
  onDeleteSegment: (id: string) => void;
}

export const VideoPreview = ({ segments, avatarUrl, onMerge, onDeleteSegment }: VideoPreviewProps) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const readySegments = segments.filter((s) => s.status === "ready");
  const totalDuration = readySegments.reduce((acc, s) => acc + s.duration, 0);

  const togglePlay = (segmentId: string) => {
    if (playingId === segmentId) {
      setPlayingId(null);
    } else {
      setPlayingId(segmentId);
    }
  };

  if (readySegments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-6 shadow-card"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Aucune vidéo générée</p>
          <p className="text-sm text-muted-foreground">
            Créez des segments vidéo pour les voir ici
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
        <div>
          <h3 className="font-display text-lg font-semibold">Aperçu vidéos</h3>
          <p className="text-sm text-muted-foreground">
            {readySegments.length} segment(s) • {totalDuration}s au total
          </p>
        </div>
        {readySegments.length > 1 && (
          <Button variant="gradient" size="sm" onClick={onMerge}>
            <Merge className="mr-1 h-4 w-4" />
            Fusionner
          </Button>
        )}
      </div>

      {/* Main Preview */}
      <div className="mb-4 aspect-[9/16] max-h-[400px] overflow-hidden rounded-xl bg-muted">
        {avatarUrl ? (
          <div className="relative h-full w-full">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="line-clamp-3 text-sm text-primary-foreground">
                {readySegments[0]?.script || "Aperçu de la vidéo..."}
              </p>
            </div>
            <button className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur-sm transition-transform hover:scale-110">
              <Play className="h-8 w-8 text-primary-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Ajoutez un avatar pour l'aperçu</p>
          </div>
        )}
      </div>

      {/* Segment List */}
      <div className="space-y-2">
        {readySegments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="cursor-grab text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            
            <button
              onClick={() => togglePlay(segment.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              {playingId === segment.id ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{segment.script}</p>
              <p className="text-xs text-muted-foreground">{segment.duration}s</p>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDeleteSegment(segment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>
            {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="flex h-full">
            {readySegments.map((segment, index) => (
              <div
                key={segment.id}
                className="h-full gradient-primary"
                style={{
                  width: `${(segment.duration / totalDuration) * 100}%`,
                  opacity: 0.6 + (index % 2) * 0.4,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
