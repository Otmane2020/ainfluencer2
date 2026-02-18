import { Coins } from "lucide-react";

interface AnchoringLabelProps {
  planId: string;
  credits: number;
  price: number;
}

export const AnchoringLabel = ({ planId, credits, price }: AnchoringLabelProps) => {
  // Show how many images/videos the credits translate to
  const images = credits;
  const videos = Math.floor(credits / 4);

  return (
    <div className="text-center">
      <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
        <Coins className="h-3 w-3" />
        <span>≈ {images} images or {videos} videos</span>
      </div>
    </div>
  );
};
