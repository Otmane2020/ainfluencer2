import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BUSINESS_SECTORS,
  VIDEO_STYLES,
  EMOTIONAL_TONES,
  SCENARIO_PRESETS,
  VideoScenario,
  ScenarioPreset,
  getPresetScenario,
} from "@/lib/videoScenarios";

interface ScenarioSelectorProps {
  selectedSector?: VideoScenario;
  selectedStyle?: VideoScenario;
  selectedTone?: VideoScenario;
  onSectorChange: (sector: VideoScenario | undefined) => void;
  onStyleChange: (style: VideoScenario | undefined) => void;
  onToneChange: (tone: VideoScenario | undefined) => void;
}

export function ScenarioSelector({
  selectedSector,
  selectedStyle,
  selectedTone,
  onSectorChange,
  onStyleChange,
  onToneChange,
}: ScenarioSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  const handlePresetSelect = (preset: ScenarioPreset) => {
    const scenario = getPresetScenario(preset.id);
    if (scenario) {
      onSectorChange(scenario.sector);
      onStyleChange(scenario.style);
      onToneChange(scenario.tone);
    }
    setOpen(false);
  };

  const getDisplayText = () => {
    const parts: string[] = [];
    if (selectedSector) parts.push(selectedSector.icon);
    if (selectedStyle) parts.push(selectedStyle.icon);
    if (selectedTone) parts.push(selectedTone.icon);
    
    if (parts.length === 0) return "Add Scenario";
    return parts.join(" ");
  };

  const hasSelection = selectedSector || selectedStyle || selectedTone;

  const ScenarioGrid = ({ 
    items, 
    selected, 
    onSelect 
  }: { 
    items: VideoScenario[]; 
    selected?: VideoScenario; 
    onSelect: (item: VideoScenario | undefined) => void;
  }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(selected?.id === item.id ? undefined : item)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all hover:bg-accent",
            selected?.id === item.id && "border-primary bg-primary/10"
          )}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-[10px] leading-tight">{item.name}</span>
          {selected?.id === item.id && (
            <Check className="h-3 w-3 text-primary" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-2 text-xs gap-1",
            hasSelection && "border-primary/50 bg-primary/5"
          )}
        >
          <Sparkles className="h-3 w-3 text-primary" />
          {getDisplayText()}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Video Scenario
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <button
            onClick={() => setActiveTab("presets")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === "presets" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            Quick Presets
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === "custom" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            Custom Build
          </button>
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          <AnimatePresence mode="wait">
            {activeTab === "presets" && (
              <motion.div
                key="presets"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="grid grid-cols-2 gap-2"
              >
                {SCENARIO_PRESETS.map((preset) => {
                  const scenario = getPresetScenario(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:bg-accent hover:border-primary/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {scenario?.sector?.icon}
                          {scenario?.style?.icon}
                          {scenario?.tone?.icon}
                        </span>
                      </div>
                      <span className="font-medium text-sm">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {activeTab === "custom" && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Sector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Business Sector</h4>
                    {selectedSector && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedSector.icon} {selectedSector.name}
                      </Badge>
                    )}
                  </div>
                  <ScenarioGrid
                    items={BUSINESS_SECTORS}
                    selected={selectedSector}
                    onSelect={onSectorChange}
                  />
                </div>

                {/* Style */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Video Style</h4>
                    {selectedStyle && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedStyle.icon} {selectedStyle.name}
                      </Badge>
                    )}
                  </div>
                  <ScenarioGrid
                    items={VIDEO_STYLES}
                    selected={selectedStyle}
                    onSelect={onStyleChange}
                  />
                </div>

                {/* Tone */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Emotional Tone</h4>
                    {selectedTone && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedTone.icon} {selectedTone.name}
                      </Badge>
                    )}
                  </div>
                  <ScenarioGrid
                    items={EMOTIONAL_TONES}
                    selected={selectedTone}
                    onSelect={onToneChange}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Current Selection Summary */}
        {hasSelection && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              {selectedSector && (
                <Badge variant="outline" className="text-xs">
                  {selectedSector.icon} {selectedSector.name}
                </Badge>
              )}
              {selectedStyle && (
                <Badge variant="outline" className="text-xs">
                  {selectedStyle.icon} {selectedStyle.name}
                </Badge>
              )}
              {selectedTone && (
                <Badge variant="outline" className="text-xs">
                  {selectedTone.icon} {selectedTone.name}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSectorChange(undefined);
                onStyleChange(undefined);
                onToneChange(undefined);
              }}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
