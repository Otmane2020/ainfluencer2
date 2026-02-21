import React from "react";
import { AbsoluteFill, Audio, Sequence } from "remotion";
import { z } from "zod";
import { FPS, INTRO_DURATION } from "./lib/constants";
import { TimelineSchema } from "./lib/types";
import { calculateFrameTiming, buildSimpleTimeline } from "./lib/utils";
import { SceneBackground } from "./components/SceneBackground";
import { Subtitle } from "./components/Subtitle";
import { Vignette } from "./components/Vignette";
import { IntroTitle } from "./components/IntroTitle";

/**
 * Zod-validated props schema (official Remotion pattern).
 */
export const clipMotionSchema = z.object({
  // Timeline mode (structured scenes)
  timeline: TimelineSchema.nullable().optional(),
  // Legacy flat mode (single image + audio)
  imageUrl: z.string().optional().default(""),
  audioUrl: z.string().optional().default(""),
  titleText: z.string().optional().default(""),
});

export type ClipMotionVideoProps = z.infer<typeof clipMotionSchema>;

/**
 * Main ClipMotion composition.
 * Supports both timeline mode (multi-scene) and legacy flat mode.
 * Architecture based on official template-prompt-to-video.
 */
export const ClipMotionVideo: React.FC<ClipMotionVideoProps> = (props) => {
  const { durationInFrames } = require("remotion").useVideoConfig();

  // Resolve timeline: use structured timeline if provided, otherwise build from flat props
  const timeline =
    props.timeline ??
    buildSimpleTimeline(
      props.imageUrl || "",
      props.audioUrl || "",
      props.titleText || "",
      (durationInFrames / FPS) * 1000
    );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ── Intro title card ── */}
      <Sequence durationInFrames={INTRO_DURATION}>
        <IntroTitle title={timeline.shortTitle} />
      </Sequence>

      {/* ── Background scenes with transitions ── */}
      {timeline.elements.map((element, index) => {
        const { startFrame, duration } = calculateFrameTiming(
          element.startMs,
          element.endMs,
          { includeIntro: index === 0 }
        );
        return (
          <Sequence
            key={`scene-${index}`}
            from={startFrame}
            durationInFrames={duration}
          >
            <SceneBackground item={element} />
          </Sequence>
        );
      })}

      {/* ── Cinematic vignette ── */}
      <Vignette />

      {/* ── Subtitle overlays ── */}
      {timeline.text.map((element, index) => {
        const { startFrame, duration } = calculateFrameTiming(
          element.startMs,
          element.endMs,
          { addIntroOffset: true }
        );
        return (
          <Sequence
            key={`text-${index}`}
            from={startFrame}
            durationInFrames={duration}
          >
            <Subtitle item={element} />
          </Sequence>
        );
      })}

      {/* ── Audio tracks ── */}
      {timeline.audio.map((element, index) => {
        const { startFrame, duration } = calculateFrameTiming(
          element.startMs,
          element.endMs,
          { addIntroOffset: true }
        );
        return (
          <Sequence
            key={`audio-${index}`}
            from={startFrame}
            durationInFrames={duration}
          >
            <Audio src={element.audioUrl} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
