import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clapperboard,
  X,
  Layers,
  Palette,
  Volume2,
  UtensilsCrossed,
  ShoppingBag,
  Home,
  Stethoscope,
  Building2,
  Dumbbell,
  Sparkles,
  Car,
  Laptop,
  GraduationCap,
  Briefcase,
  Package,
  MessageCircle,
  Box,
  ArrowRightLeft,
  BookOpen,
  Film,
  BookMarked,
  Heart,
  Smartphone,
  Zap,
  Sunrise,
  Shield,
  Rocket,
  Award,
  PartyPopper,
  Crown,
  Fingerprint,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Icon mapping for dynamic rendering
const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingBag,
  Home,
  Stethoscope,
  Building2,
  Dumbbell,
  Sparkles,
  Car,
  Laptop,
  GraduationCap,
  Briefcase,
  Package,
  MessageCircle,
  Box,
  ArrowRightLeft,
  BookOpen,
  Film,
  BookMarked,
  Heart,
  Smartphone,
  Zap,
  Sunrise,
  Shield,
  Rocket,
  Award,
  PartyPopper,
  Crown,
  Fingerprint,
};

const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Layers;
};

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

  const hasSelection = selectedSector || selectedStyle || selectedTone;
  const selectionCount = [selectedSector, selectedStyle, selectedTone].filter(Boolean).length;

  const ScenarioGrid = ({
    items,
    selected,
    onSelect,
    category,
    categoryIcon: CategoryIcon,
  }: {
    items: VideoScenario[];
    selected?: VideoScenario;
    onSelect: (item: VideoScenario | undefined) => void;
    category: string;
    categoryIcon: LucideIcon;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CategoryIcon className="h-4 w-4" />
        <span>{category}</span>
        {selected && (
          <span className="ml-auto text-xs text-primary font-normal">
            {selected.name}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = getIcon(item.icon);
          const isSelected = selected?.id === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(isSelected ? undefined : item)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all duration-200",
                "hover:bg-accent/50 hover:border-primary/30",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                  : "border-border/50 bg-card/50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium leading-tight">{item.name}</span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 text-sm gap-2 rounded-lg transition-all",
            hasSelection
              ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
              : "hover:border-primary/30"
          )}
        >
          <Clapperboard className="h-4 w-4" />
          <span className="hidden sm:inline">
            {hasSelection ? `${selectionCount} Selected` : "Add Scenario"}
          </span>
          <span className="sm:hidden">
            {hasSelection ? selectionCount : "+"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clapperboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold">Video Scenario</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Define the context and style for your video
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-2 mx-4 mt-4 bg-muted/50 rounded-lg">
          <button
            onClick={() => setActiveTab("presets")}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === "presets"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Quick Presets
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeTab === "custom"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Custom Build
          </button>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-4">
            <AnimatePresence mode="wait">
              {activeTab === "presets" && (
                <motion.div
                  key="presets"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {SCENARIO_PRESETS.map((preset) => {
                    const scenario = getPresetScenario(preset.id);
                    const SectorIcon = scenario?.sector ? getIcon(scenario.sector.icon) : Layers;
                    const StyleIcon = scenario?.style ? getIcon(scenario.style.icon) : Layers;
                    const ToneIcon = scenario?.tone ? getIcon(scenario.tone.icon) : Layers;

                    return (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className="group flex items-start gap-4 rounded-xl border-2 border-border/50 bg-card/50 p-4 text-left transition-all hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm"
                      >
                        <div className="flex -space-x-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border-2 border-background">
                            <SectorIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center border-2 border-background">
                            <StyleIcon className="h-4 w-4 text-secondary-foreground" />
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center border-2 border-background">
                            <ToneIcon className="h-4 w-4 text-accent-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm block">{preset.name}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {preset.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === "custom" && (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <ScenarioGrid
                    items={BUSINESS_SECTORS}
                    selected={selectedSector}
                    onSelect={onSectorChange}
                    category="Industry"
                    categoryIcon={Briefcase}
                  />
                  <ScenarioGrid
                    items={VIDEO_STYLES}
                    selected={selectedStyle}
                    onSelect={onStyleChange}
                    category="Video Style"
                    categoryIcon={Palette}
                  />
                  <ScenarioGrid
                    items={EMOTIONAL_TONES}
                    selected={selectedTone}
                    onSelect={onToneChange}
                    category="Tone & Mood"
                    categoryIcon={Volume2}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer with selection summary */}
        {hasSelection && (
          <div className="border-t border-border/50 p-4 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {selectedSector && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {(() => {
                      const Icon = getIcon(selectedSector.icon);
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {selectedSector.name}
                  </div>
                )}
                {selectedStyle && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-secondary-foreground text-xs font-medium">
                    {(() => {
                      const Icon = getIcon(selectedStyle.icon);
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {selectedStyle.name}
                  </div>
                )}
                {selectedTone && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                    {(() => {
                      const Icon = getIcon(selectedTone.icon);
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {selectedTone.name}
                  </div>
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
                className="text-xs text-muted-foreground hover:text-destructive gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
