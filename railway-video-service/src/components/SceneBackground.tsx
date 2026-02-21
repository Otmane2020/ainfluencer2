import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { FPS, EXTRA_SCALE } from "../lib/constants";
import type { SceneElement } from "../lib/types";
import { calculateBlur } from "../lib/utils";

/**
 * Background scene with Ken Burns zoom + blur transitions.
 * Based on official template-prompt-to-video Background component.
 */
export const SceneBackground: React.FC<{ item: SceneElement }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const localMs = (frame / FPS) * 1000;

  // Scale animation from timeline
  let animScale = 1 + EXTRA_SCALE;
  const currentScaleAnim = item.animations?.find(
    (anim) =>
      anim.type === "scale" && anim.startMs <= localMs && anim.endMs >= localMs
  );

  if (currentScaleAnim) {
    const progress =
      (localMs - currentScaleAnim.startMs) /
      (currentScaleAnim.endMs - currentScaleAnim.startMs);
    animScale =
      EXTRA_SCALE +
      progress * (currentScaleAnim.to - currentScaleAnim.from) +
      currentScaleAnim.from;
  }

  // Blur transition
  const blur = calculateBlur(item, localMs);
  const currentBlur = 25 * blur;

  // Fade transition
  const durationMs = item.endMs - item.startMs;
  const fadeInOpacity =
    item.enterTransition === "fade"
      ? interpolate(localMs, [0, 600], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  const fadeOutOpacity =
    item.exitTransition === "fade"
      ? interpolate(localMs, [durationMs - 600, durationMs], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  return (
    <AbsoluteFill style={{ opacity: fadeInOpacity * fadeOutOpacity }}>
      <Img
        src={item.imageUrl}
        style={{
          width: width * animScale,
          height: height * animScale,
          position: "absolute",
          top: -(height * animScale - height) / 2,
          left: -(width * animScale - width) / 2,
          objectFit: "cover",
          filter: currentBlur > 0 ? `blur(${currentBlur}px)` : undefined,
        }}
      />
    </AbsoluteFill>
  );
};
