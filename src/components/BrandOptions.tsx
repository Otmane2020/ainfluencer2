import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2, Image as ImageIcon, Link2, Type, User } from "lucide-react";

export interface BrandOptionsState {
  includeLogo: boolean;
  includeUrl: boolean;
  includeText: boolean;
  includeAvatar: boolean;
  overlayText?: string;
}

interface BrandOptionsProps {
  options: BrandOptionsState;
  onChange: (options: BrandOptionsState) => void;
  compact?: boolean;
}

export const BrandOptions = ({ options, onChange, compact = false }: BrandOptionsProps) => {
  const [open, setOpen] = useState(false);

  // Count active options for the badge
  const activeCount = [
    options.includeLogo,
    options.includeUrl,
    options.includeText,
    options.includeAvatar,
  ].filter(Boolean).length;

  const OptionRow = ({
    icon: Icon,
    label,
    checked,
    onCheckedChange,
  }: {
    icon: React.ElementType;
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="scale-90"
      />
    </div>
  );

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Brand
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Brand Elements</p>
            <OptionRow
              icon={ImageIcon}
              label="Logo"
              checked={options.includeLogo}
              onCheckedChange={(checked) => onChange({ ...options, includeLogo: checked })}
            />
            <OptionRow
              icon={Link2}
              label="Website URL"
              checked={options.includeUrl}
              onCheckedChange={(checked) => onChange({ ...options, includeUrl: checked })}
            />
            <OptionRow
              icon={User}
              label="Avatar"
              checked={options.includeAvatar}
              onCheckedChange={(checked) => onChange({ ...options, includeAvatar: checked })}
            />
            <OptionRow
              icon={Type}
              label="Text Overlay"
              checked={options.includeText}
              onCheckedChange={(checked) => onChange({ ...options, includeText: checked })}
            />
            {options.includeText && (
              <Input
                value={options.overlayText || ""}
                onChange={(e) => onChange({ ...options, overlayText: e.target.value })}
                placeholder="Custom text..."
                className="h-7 mt-2 text-xs"
              />
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full version for settings pages
  return (
    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
      <p className="text-sm font-medium mb-3">Brand Elements</p>
      <OptionRow
        icon={ImageIcon}
        label="Include Logo"
        checked={options.includeLogo}
        onCheckedChange={(checked) => onChange({ ...options, includeLogo: checked })}
      />
      <OptionRow
        icon={Link2}
        label="Include Website URL"
        checked={options.includeUrl}
        onCheckedChange={(checked) => onChange({ ...options, includeUrl: checked })}
      />
      <OptionRow
        icon={User}
        label="Include Avatar"
        checked={options.includeAvatar}
        onCheckedChange={(checked) => onChange({ ...options, includeAvatar: checked })}
      />
      <OptionRow
        icon={Type}
        label="Text Overlay"
        checked={options.includeText}
        onCheckedChange={(checked) => onChange({ ...options, includeText: checked })}
      />
      {options.includeText && (
        <Input
          value={options.overlayText || ""}
          onChange={(e) => onChange({ ...options, overlayText: e.target.value })}
          placeholder="Enter overlay text (or auto-generated)"
          className="mt-2"
        />
      )}
    </div>
  );
};

export default BrandOptions;
