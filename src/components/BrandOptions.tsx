import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link2, Image as ImageIcon } from "lucide-react";

export interface BrandOptionsState {
  includeLogo: boolean;
  includeUrl: boolean;
}

interface BrandOptionsProps {
  options: BrandOptionsState;
  onChange: (options: BrandOptionsState) => void;
  compact?: boolean;
}

export const BrandOptions = ({ options, onChange, compact = false }: BrandOptionsProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
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
      </div>
    </div>
  );
};

export default BrandOptions;
