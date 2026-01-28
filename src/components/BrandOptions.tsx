import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Link2, Image as ImageIcon, Type } from "lucide-react";

export interface BrandOptionsState {
  includeLogo: boolean;
  includeUrl: boolean;
  includeText: boolean;
  overlayText?: string;
}

interface BrandOptionsProps {
  options: BrandOptionsState;
  onChange: (options: BrandOptionsState) => void;
  compact?: boolean;
}

export const BrandOptions = ({ options, onChange, compact = false }: BrandOptionsProps) => {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={options.includeLogo}
            onCheckedChange={(checked) => onChange({ ...options, includeLogo: checked })}
            className="scale-75"
          />
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Logo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={options.includeUrl}
            onCheckedChange={(checked) => onChange({ ...options, includeUrl: checked })}
            className="scale-75"
          />
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">URL</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={options.includeText}
            onCheckedChange={(checked) => onChange({ ...options, includeText: checked })}
            className="scale-75"
          />
          <Type className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Text</span>
        </label>
        {options.includeText && (
          <Input
            value={options.overlayText || ""}
            onChange={(e) => onChange({ ...options, overlayText: e.target.value })}
            placeholder="Overlay text..."
            className="h-7 w-32 text-xs"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Brand Elements</Label>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Include Logo</p>
              <p className="text-xs text-muted-foreground">Add brand logo to generated content</p>
            </div>
          </div>
          <Switch
            checked={options.includeLogo}
            onCheckedChange={(checked) => onChange({ ...options, includeLogo: checked })}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Link2 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Include Website URL</p>
              <p className="text-xs text-muted-foreground">Display website link in content</p>
            </div>
          </div>
          <Switch
            checked={options.includeUrl}
            onCheckedChange={(checked) => onChange({ ...options, includeUrl: checked })}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Type className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Text Overlay</p>
              <p className="text-xs text-muted-foreground">Add text for social media engagement</p>
            </div>
          </div>
          <Switch
            checked={options.includeText}
            onCheckedChange={(checked) => onChange({ ...options, includeText: checked })}
          />
        </div>
        {options.includeText && (
          <Input
            value={options.overlayText || ""}
            onChange={(e) => onChange({ ...options, overlayText: e.target.value })}
            placeholder="Enter text to overlay (or leave empty for auto-generated)"
            className="mt-2"
          />
        )}
      </div>
    </div>
  );
};

export default BrandOptions;
