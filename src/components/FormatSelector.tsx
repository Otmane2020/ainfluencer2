import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContentFormat = "vertical" | "landscape" | "story";

export interface FormatOption {
  id: ContentFormat;
  label: string;
  description: string;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  icon: string;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: "vertical",
    label: "Vertical",
    description: "9:16 mobile",
    aspectRatio: "9:16",
    dimensions: { width: 720, height: 1280 },
    icon: "📱",
  },
  {
    id: "landscape",
    label: "Landscape",
    description: "16:9 horizontal",
    aspectRatio: "16:9",
    dimensions: { width: 1280, height: 720 },
    icon: "🖥️",
  },
  {
    id: "story",
    label: "Story",
    description: "9:16 full screen",
    aspectRatio: "9:16",
    dimensions: { width: 1080, height: 1920 },
    icon: "📲",
  },
];

interface FormatSelectorProps {
  selectedFormat: ContentFormat;
  onFormatChange: (format: ContentFormat) => void;
  compact?: boolean;
}

export const FormatSelector = ({
  selectedFormat,
  onFormatChange,
  compact = false,
}: FormatSelectorProps) => {
  const currentFormat = FORMAT_OPTIONS.find((f) => f.id === selectedFormat) || FORMAT_OPTIONS[0];

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MonitorSmartphone className="h-4 w-4" />
            <span>{currentFormat.icon} {currentFormat.label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-card border border-border z-50" align="start">
          <div className="space-y-1">
            {FORMAT_OPTIONS.map((format) => (
              <button
                key={format.id}
                onClick={() => onFormatChange(format.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  selectedFormat === format.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{format.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{format.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {format.description}
                    </div>
                  </div>
                </div>
                {selectedFormat === format.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex gap-2">
      {FORMAT_OPTIONS.map((format) => (
        <Button
          key={format.id}
          variant={selectedFormat === format.id ? "default" : "outline"}
          size="sm"
          onClick={() => onFormatChange(format.id)}
          className="flex-1 gap-1"
        >
          <span>{format.icon}</span>
          <span className="hidden sm:inline">{format.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default FormatSelector;
