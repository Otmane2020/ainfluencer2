// VideoModeSelector removed - standard video mode is now the only option
// This component is kept as a placeholder for backwards compatibility

import { cn } from "@/lib/utils";

interface VideoModeSelectorProps {
  mode?: string;
  onModeChange?: (mode: string) => void;
  className?: string;
  showMotion?: boolean;
}

// Component no longer renders anything - video mode selection has been removed
export const VideoModeSelector = ({
  className,
}: VideoModeSelectorProps) => {
  return null;
};

export default VideoModeSelector;
