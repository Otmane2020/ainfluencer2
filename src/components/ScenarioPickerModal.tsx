import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Eye, Hash, Sparkles, Target, X, Zap, Heart, Trophy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ScenarioScene {
  timestamp: string;
  visual: string;
  voiceover: string;
}

export interface GeneratedScenario {
  id: string;
  title: string;
  angle: "problem" | "benefit" | "emotion" | "proof" | "urgency";
  scenes: ScenarioScene[];
  fullScript: string;
  hashtags: string[];
  estimatedEngagement: "high" | "medium" | "low";
}

interface ScenarioPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: GeneratedScenario[];
  onSelect: (scenario: GeneratedScenario) => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

const ANGLE_CONFIG = {
  problem: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Problem" },
  benefit: { icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Benefit" },
  emotion: { icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10", label: "Emotion" },
  proof: { icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10", label: "Proof" },
  urgency: { icon: Zap, color: "text-red-500", bg: "bg-red-500/10", label: "Urgency" },
};

const ENGAGEMENT_CONFIG = {
  high: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "High" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  low: { color: "text-muted-foreground", bg: "bg-muted", label: "Low" },
};

export const ScenarioPickerModal = ({
  open,
  onOpenChange,
  scenarios,
  onSelect,
  onRegenerate,
  isRegenerating,
}: ScenarioPickerModalProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (scenario: GeneratedScenario) => {
    setSelectedId(scenario.id);
    setTimeout(() => {
      onSelect(scenario);
      onOpenChange(false);
      setSelectedId(null);
      setExpandedId(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose Your Video Scenario
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {scenarios.map((scenario, index) => {
                const angleConfig = ANGLE_CONFIG[scenario.angle] || ANGLE_CONFIG.benefit;
                const engagementConfig = ENGAGEMENT_CONFIG[scenario.estimatedEngagement] || ENGAGEMENT_CONFIG.medium;
                const AngleIcon = angleConfig.icon;
                const isExpanded = expandedId === scenario.id;
                const isSelected = selectedId === scenario.id;

                return (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      scale: isSelected ? 0.98 : 1,
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      relative rounded-xl border-2 transition-all duration-200 overflow-hidden
                      ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                    `}
                  >
                    {/* Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={`${angleConfig.bg} ${angleConfig.color} border-0`}>
                              <AngleIcon className="h-3 w-3 mr-1" />
                              {angleConfig.label}
                            </Badge>
                            <Badge variant="outline" className={`${engagementConfig.bg} ${engagementConfig.color} border-0`}>
                              <Target className="h-3 w-3 mr-1" />
                              {engagementConfig.label} Engagement
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg truncate">{scenario.title}</h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : scenario.id)}
                            className="text-muted-foreground"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {isExpanded ? "Hide" : "Preview"}
                          </Button>
                          <Button
                            onClick={() => handleSelect(scenario)}
                            disabled={isSelected}
                            className="min-w-[100px]"
                          >
                            {isSelected ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Select
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Script preview */}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {scenario.fullScript}
                      </p>

                      {/* Hashtags */}
                      {scenario.hashtags.length > 0 && (
                        <div className="flex items-center gap-1 mt-3 flex-wrap">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {scenario.hashtags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="text-xs text-primary">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expanded scene view */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t bg-muted/30"
                        >
                          <div className="p-4 space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              Scene Breakdown
                            </h4>
                            <div className="space-y-2">
                              {scenario.scenes.map((scene, sceneIdx) => (
                                <div
                                  key={sceneIdx}
                                  className="grid grid-cols-[80px_1fr_1fr] gap-3 p-3 rounded-lg bg-background border text-sm"
                                >
                                  <div className="font-mono text-primary font-medium">
                                    {scene.timestamp}
                                  </div>
                                  <div className="text-muted-foreground">
                                    <span className="text-xs uppercase tracking-wide text-muted-foreground/70 block mb-1">
                                      Visual
                                    </span>
                                    {scene.visual}
                                  </div>
                                  <div>
                                    <span className="text-xs uppercase tracking-wide text-muted-foreground/70 block mb-1">
                                      Voiceover
                                    </span>
                                    "{scene.voiceover}"
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {scenarios.length} scenarios generated
          </p>
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                </motion.div>
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate All
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
