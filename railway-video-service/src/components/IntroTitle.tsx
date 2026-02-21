import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { INTRO_DURATION } from "../lib/constants";

/**
 * Full-screen intro title card (1 second).
 * Based on official template intro pattern.
 */
export const IntroTitle: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const enter = spring({
    frame,
    fps,
    config: { damping: 80, stiffness: 200 },
    durationInFrames: Math.floor(INTRO_DURATION * 0.6),
  });

  const exit = interpolate(
    frame,
    [INTRO_DURATION - 8, INTRO_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        display: "flex",
        backgroundColor: "#000",
        opacity: exit,
      }}
    >
      <div
        style={{
          fontSize: isVertical ? 56 : 64,
          lineHeight: 1.15,
          width: "85%",
          color: "#fff",
          fontWeight: 900,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textTransform: "uppercase",
          letterSpacing: 2,
          transform: `scale(${enter})`,
          opacity: enter,
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
};
