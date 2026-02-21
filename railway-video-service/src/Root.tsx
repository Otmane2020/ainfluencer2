import React from "react";
import { Composition } from "remotion";
import { ClipMotionVideo, clipMotionSchema } from "./ClipMotionVideo";
import { FPS } from "./lib/constants";

export const Root: React.FC = () => {
  return (
    <>
      {/* Landscape (marketing videos, ads) */}
      <Composition
        id="ClipMotionVideo"
        component={ClipMotionVideo}
        durationInFrames={300}
        fps={FPS}
        width={1280}
        height={720}
        schema={clipMotionSchema}
        defaultProps={{
          timeline: null,
          imageUrl: "",
          audioUrl: "",
          titleText: "",
        }}
      />

      {/* Vertical (Reels, TikTok, Stories) */}
      <Composition
        id="ClipMotionVertical"
        component={ClipMotionVideo}
        durationInFrames={300}
        fps={FPS}
        width={720}
        height={1280}
        schema={clipMotionSchema}
        defaultProps={{
          timeline: null,
          imageUrl: "",
          audioUrl: "",
          titleText: "",
        }}
      />

      {/* Square (Instagram feed, Facebook) */}
      <Composition
        id="ClipMotionSquare"
        component={ClipMotionVideo}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1080}
        schema={clipMotionSchema}
        defaultProps={{
          timeline: null,
          imageUrl: "",
          audioUrl: "",
          titleText: "",
        }}
      />
    </>
  );
};
