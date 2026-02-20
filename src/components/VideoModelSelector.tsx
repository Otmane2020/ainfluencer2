import { useState } from "react";
import { ChevronDown, Volume2, VolumeX, Check, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  VideoModel,
  VideoModelType,
  VIDEO_MODELS,
  getGroupedVideoModels,
  getCostLevelColor,
  getCostLevelLabel,
  getTypeIcon,
  getTypeLabel,
  renderStars,
} from "@/lib/videoModels";

interface VideoModelSelectorProps {
  selectedModel: VideoModel;
  onModelChange: (model: VideoModel) => void;
  className?: string;
}

export function VideoModelSelector({
  selectedModel,
  onModelChange,
  className,
}: VideoModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const groupedModels = getGroupedVideoModels();

  // Separate Remotion models from KIE models
  const remotionModels = VIDEO_MODELS.filter(m => m.provider === "remotion");
  const typeOrder: VideoModelType[] = ["text-to-video", "image-to-video", "video-to-video"];

  const handleSelect = (model: VideoModel) => {
    onModelChange(model);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-card",
            className
          )}
        >
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <span className="text-lg">{getTypeIcon(selectedModel.type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{selectedModel.name}</span>
                {selectedModel.hasAudio && (
                  <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{renderStars(selectedModel.quality)}</span>
                <span>•</span>
                <span>{selectedModel.duration}s</span>
                <span>•</span>
                <span>{selectedModel.resolution}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", getCostLevelColor(selectedModel.costLevel))}
            >
              {selectedModel.credits} cr
            </Badge>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[420px] p-0 bg-card border-border shadow-xl"
        align="start"
        sideOffset={8}
      >
        <ScrollArea className="max-h-[480px]">
          <div className="p-2 space-y-4">

            {/* ── ClipMotion (Remotion) section ── */}
            {remotionModels.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Film className="h-3.5 w-3.5 text-primary" />
                  <span>ClipMotion (Local Render)</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">Fast</Badge>
                </div>
                <div className="space-y-1">
                  {remotionModels.map((model) => {
                    const isSelected = selectedModel.id === model.id;
                    return (
                      <motion.button
                        key={model.id}
                        onClick={() => handleSelect(model)}
                        className={cn(
                          "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isSelected ? (
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{model.name}</span>
                            <Volume2 className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs">{renderStars(model.quality)}</span>
                            <span className="text-xs text-muted-foreground">
                              {model.duration}s • {model.resolution}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{model.usage}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-bold", getCostLevelColor(model.costLevel))}
                          >
                            {model.credits} cr
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            ${model.costPerVideo.toFixed(2)}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── KIE models (Wan / Kling) ── */}
            {typeOrder.map((type) => {
              const models = (groupedModels[type] || []).filter(m => m.provider !== "remotion");
              if (!models || models.length === 0) return null;

              return (
                <div key={type}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span>{getTypeIcon(type)}</span>
                    <span>{getTypeLabel(type)}</span>
                  </div>
                  <div className="space-y-1">
                    {models.map((model) => {
                      const isSelected = selectedModel.id === model.id;
                      return (
                        <motion.button
                          key={model.id}
                          onClick={() => handleSelect(model)}
                          className={cn(
                            "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                            isSelected
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{model.name}</span>
                              {model.hasAudio ? (
                                <Volume2 className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <VolumeX className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs">{renderStars(model.quality)}</span>
                              <span className="text-xs text-muted-foreground">
                                {model.duration}s • {model.resolution}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{model.usage}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn("text-xs font-bold", getCostLevelColor(model.costLevel))}
                            >
                              {model.credits} cr
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              ${model.costPerVideo.toFixed(2)}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/50 px-3 py-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                Ultra-low
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
                Medium
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive/80" />
                High
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              = Audio
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
