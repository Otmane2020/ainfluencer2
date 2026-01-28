import { useState } from "react";
import { Sparkles, Zap, TrendingUp, Film, Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VideoGenerator } from "@/components/VideoGenerator";
import { CLIPMOTION_FEATURES } from "@/lib/clipMotionConfig";

const ClipMotionPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              ClipMotion
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                NEW
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Create viral social videos optimized for TikTok, Reels & Shorts
            </p>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-2">
          {CLIPMOTION_FEATURES.map((feature) => (
            <div
              key={feature.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-sm"
            >
              {feature.id === "vertical" && <Film className="h-3.5 w-3.5 text-primary" />}
              {feature.id === "fast-paced" && <Zap className="h-3.5 w-3.5 text-primary" />}
              {feature.id === "hooks" && <TrendingUp className="h-3.5 w-3.5 text-primary" />}
              {feature.id === "short" && <Clock className="h-3.5 w-3.5 text-primary" />}
              {feature.id === "animated" && <Layers className="h-3.5 w-3.5 text-primary" />}
              <span>{feature.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Video Generator with ClipMotion mode forced */}
      <VideoGenerator defaultVideoMode="clipmotion" hideVideoModeSelector />
    </div>
  );
};

export default ClipMotionPage;
