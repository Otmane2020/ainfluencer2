import { FPS, INTRO_DURATION } from "./constants";
import type { SceneElement, Timeline } from "./types";

/**
 * Convert ms timing to Remotion frame timing.
 * Mirrors official template-prompt-to-video pattern.
 */
export const calculateFrameTiming = (
  startMs: number,
  endMs: number,
  options: { includeIntro?: boolean; addIntroOffset?: boolean } = {}
) => {
  const { includeIntro = false, addIntroOffset = false } = options;
  const startFrame =
    (startMs * FPS) / 1000 + (addIntroOffset ? INTRO_DURATION : 0);
  const duration =
    ((endMs - startMs) * FPS) / 1000 + (includeIntro ? INTRO_DURATION : 0);
  return { startFrame, duration };
};

/**
 * Calculate blur transition for a scene element.
 * Supports enter/exit blur transitions.
 */
export const calculateBlur = (item: SceneElement, localMs: number): number => {
  const maxBlur = 1;
  const fadeMs = 800;
  const startMs = item.startMs;
  const endMs = item.endMs;

  if (item.enterTransition === "blur" && localMs < fadeMs) {
    return (1 - localMs / fadeMs) * maxBlur;
  }
  if (item.exitTransition === "blur" && localMs > endMs - startMs - fadeMs) {
    return (1 - (endMs - startMs - localMs) / fadeMs) * maxBlur;
  }
  return 0;
};

/**
 * Build a single-scene timeline from flat inputProps.
 * Used when the worker receives simple imageUrl + audioUrl (legacy mode).
 */
export const buildSimpleTimeline = (
  imageUrl: string,
  audioUrl: string,
  titleText: string,
  durationMs: number
): Timeline => ({
  shortTitle: titleText || "ClipMotion",
  elements: [
    {
      imageUrl,
      startMs: 0,
      endMs: durationMs,
      enterTransition: "blur",
      exitTransition: "fade",
      animations: [
        { type: "scale" as const, startMs: 0, endMs: durationMs, from: 1, to: 1.12 },
      ],
    },
  ],
  text: titleText
    ? [{ text: titleText, startMs: 0, endMs: Math.min(5000, durationMs - 2000), position: "top" as const }]
    : [],
  audio: audioUrl
    ? [{ audioUrl, startMs: 0, endMs: durationMs }]
    : [],
});
