import { motion } from "framer-motion";
import { Video, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MediaCard, MediaItem } from "./MediaCard";

interface GeneratingTask {
  id: string;
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: number;
  model: string;
  duration: number;
  script?: string;
}

interface MasonryGridProps {
  items: MediaItem[];
  generatingTasks?: GeneratingTask[];
  onItemClick: (item: MediaItem) => void;
  onDelete: (id: string, type: "video" | "image") => void;
  onDownload: (item: MediaItem) => void;
  downloadingId?: string | null;
  generatingThumbnails?: Set<string>;
}

export const MasonryGrid = ({
  items,
  generatingTasks = [],
  onItemClick,
  onDelete,
  onDownload,
  downloadingId,
  generatingThumbnails = new Set(),
}: MasonryGridProps) => {
  const activeGenerations = generatingTasks.filter(t => t.status === "queued" || t.status === "in_progress");

  if (items.length === 0 && activeGenerations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No media yet</p>
        <p className="text-sm text-muted-foreground">
          Generated content will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* In-progress generations */}
      {activeGenerations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px mb-px">
          {activeGenerations.map((task) => (
            <motion.div
              key={task.taskId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-[9/16] overflow-hidden bg-card"
            >
              <div className="absolute inset-0 opacity-20">
                <motion.div
                  className="absolute inset-0 gradient-primary"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center mb-3"
                >
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </motion.div>
                <p className="text-xs text-center text-muted-foreground line-clamp-1 mb-2">{task.model}</p>
                <div className="flex items-center gap-2 w-full px-2">
                  <Progress value={task.progress} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium text-primary">{task.progress}%</span>
                </div>
              </div>

              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                  {task.status === "queued" ? "Queued" : "Generating"}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Masonry Grid - 3 columns, no gaps */}
      <div className="columns-2 md:columns-3 gap-px">
        {items.map((item) => (
          <div key={item.id} className="break-inside-avoid mb-px">
            <MediaCard
              item={item}
              onClick={() => onItemClick(item)}
              onDelete={(id) => onDelete(id, item.type)}
              onDownload={() => onDownload(item)}
              isDownloading={downloadingId === item.id}
              isGeneratingThumbnail={generatingThumbnails.has(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
