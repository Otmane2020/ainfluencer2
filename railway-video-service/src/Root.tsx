import React from "react";
import { Composition } from "remotion";
import { ClipMotionVideo } from "./ClipMotionVideo";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ClipMotionVideo"
        component={ClipMotionVideo}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          imageUrl: "",
          audioUrl: "",
          titleText: "",
        }}
        calculateMetadata={({ props }) => {
          // Duration is overridden at render time via inputProps
          return {
            durationInFrames: 300,
            fps: 30,
          };
        }}
      />

      <Composition
        id="ClipMotionVertical"
        component={ClipMotionVideo}
        durationInFrames={300}
        fps={30}
        width={720}
        height={1280}
        defaultProps={{
          imageUrl: "",
          audioUrl: "",
          titleText: "",
        }}
      />
    </>
  );
};
