import { useState } from "react";
import { ChevronDown, Image as ImageIcon, Wand2, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  IMAGE_MODELS,
  TEXT_MODELS,
  TRANSFORM_MODELS,
  ImageModel,
  getCostLevelColor,
  getCostLevelLabel,
  renderStars,
} from "@/lib/imageModels";

interface ImageModelSelectorProps {
  selectedModelId: string;
  onModelChange: (model: ImageModel) => void;
  disabled?: boolean;
}

export const ImageModelSelector = ({
  selectedModelId,
  onModelChange,
  disabled = false,
}: ImageModelSelectorProps) => {
  const [open, setOpen] = useState(false);

  const selectedModel = IMAGE_MODELS.find((m) => m.id === selectedModelId) || IMAGE_MODELS[0];

  const handleSelect = (model: ImageModel) => {
    onModelChange(model);
    setOpen(false);
  };

  const ModelRow = ({ model }: { model: ImageModel }) => {
    const isSelected = model.id === selectedModelId;
    
    return (
      <button
        onClick={() => handleSelect(model)}
        className={`w-full text-left p-3 rounded-lg transition-all hover:bg-muted/60 border ${
          isSelected
            ? "bg-primary/10 border-primary/30"
            : "border-transparent hover:border-border"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{model.name}</span>
              {model.resolution && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {model.resolution}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-amber-400">{renderStars(model.quality)}</span>
              <span>•</span>
              <span className="text-foreground font-medium">{model.credits} cr</span>
              {model.costPerImage && (
                <>
                  <span>•</span>
                  <span>${model.costPerImage.toFixed(4)}</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{model.usage}</p>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0.5 shrink-0 ${getCostLevelColor(model.costLevel)}`}
          >
            {getCostLevelLabel(model.costLevel)}
          </Badge>
        </div>
      </button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-auto py-3 px-4"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="rounded-lg bg-primary/10 p-2">
              {selectedModel.requiresImage ? (
                <ImageIcon className="h-4 w-4 text-primary" />
              ) : (
                <Wand2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{selectedModel.name}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${getCostLevelColor(selectedModel.costLevel)}`}
                >
                  {selectedModel.credits} cr
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-amber-400">{renderStars(selectedModel.quality)}</span>
                <span>•</span>
                <span>{selectedModel.usage}</span>
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="start"
        sideOffset={4}
      >
        <ScrollArea className="h-[450px]">
          <div className="p-3 space-y-4">
            {/* TEXT → IMAGE Section */}
            <div>
              <div className="flex items-center gap-2 px-2 pb-2 border-b border-border">
                <Wand2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Text → Image
                </span>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {TEXT_MODELS.length} models
                </Badge>
              </div>
              <div className="mt-2 space-y-1">
                {TEXT_MODELS.map((model) => (
                  <ModelRow key={model.id} model={model} />
                ))}
              </div>
            </div>

            {/* IMAGE → IMAGE Section */}
            <div>
              <div className="flex items-center gap-2 px-2 pb-2 border-b border-border">
                <ImageIcon className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Image → Image
                </span>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {TRANSFORM_MODELS.length} models
                </Badge>
              </div>
              <div className="mt-2 space-y-1">
                {TRANSFORM_MODELS.map((model) => (
                  <ModelRow key={model.id} model={model} />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer with selected model summary */}
        <div className="border-t border-border p-3 bg-muted/30">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedModel.name}</span>
            </span>
            <span className="ml-auto font-medium text-primary">
              {selectedModel.credits} credits
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ImageModelSelector;
