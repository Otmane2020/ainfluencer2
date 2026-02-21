import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { TextElement } from "../lib/types";

/**
 * Animated subtitle overlay with spring entrance.
 * Based on official template-prompt-to-video Subtitle component.
 */
export const Subtitle: React.FC<{ item: TextElement }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const isVertical = height > width;

  const enter = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 5,
  });

  const positionStyle: React.CSSProperties = {
    top: item.position === "top" ? (isVertical ? 80 : 40) : undefined,
    bottom: item.position === "bottom" ? (isVertical ? 120 : 60) : undefined,
    ...(item.position === "center" && {
      top: "50%",
      transform: `translateY(-50%) scale(${enter})`,
    }),
  };

  return (
    <AbsoluteFill>
      {/* Stroke (shadow layer) */}
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          textAlign: "center",
          opacity: enter,
          ...positionStyle,
        }}
      >
        <span
          style={{
            display: "inline-block",
            color: "#fff",
            fontSize: isVertical ? 32 : 36,
            fontWeight: 800,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: "10px 24px",
            lineHeight: 1.3,
            maxWidth: "90%",
            WebkitTextStroke: "3px rgba(0,0,0,0.8)",
            paintOrder: "stroke fill",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          {item.text}
        </span>
      </div>
      {/* Fill layer */}
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          textAlign: "center",
          opacity: enter,
          ...positionStyle,
        }}
      >
        <span
          style={{
            display: "inline-block",
            color: "#fff",
            fontSize: isVertical ? 32 : 36,
            fontWeight: 800,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: "10px 24px",
            lineHeight: 1.3,
            maxWidth: "90%",
          }}
        >
          {item.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
