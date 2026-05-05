import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";

import { SceneHook } from "./scenes/SceneHook";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneUploadReveal } from "./scenes/SceneUploadReveal";
import { SceneMosaic } from "./scenes/SceneMosaic";
import { SceneStats } from "./scenes/SceneStats";
import { SceneOutro } from "./scenes/SceneOutro";

export const inter = loadInter("normal", { weights: ["400", "600", "800", "900"] }).fontFamily;
export const display = loadBricolage("normal", { weights: ["700", "800"] }).fontFamily;

export const FPS = 30;
const D_HOOK = 90;
const D_PROBLEM = 120;
const D_UPLOAD = 120;
const D_MOSAIC = 150;
const D_STATS = 120;
const D_OUTRO = 150;
const T = 18; // transition frames
export const DURATION = D_HOOK + D_PROBLEM + D_UPLOAD + D_MOSAIC + D_STATS + D_OUTRO - T * 5;

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();
  // subtle persistent vignette + drifting glow
  const driftX = Math.sin(frame / 60) * 80;
  const driftY = Math.cos(frame / 80) * 50;
  return (
    <AbsoluteFill style={{ background: "#06080A", fontFamily: inter, color: "white" }}>
      {/* persistent ambient glow */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: -300 + driftY,
            left: -200 + driftX,
            width: 1200,
            height: 1200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(217,70,239,0.35), transparent 60%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -300 - driftY,
            right: -200 - driftX,
            width: 1100,
            height: 1100,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,146,60,0.30), transparent 60%)",
            filter: "blur(60px)",
          }}
        />
      </AbsoluteFill>

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D_HOOK}><SceneHook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={D_PROBLEM}><SceneProblem /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={D_UPLOAD}><SceneUploadReveal /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={D_MOSAIC}><SceneMosaic /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={D_STATS}><SceneStats /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={D_OUTRO}><SceneOutro /></TransitionSeries.Sequence>
      </TransitionSeries>

      {/* persistent brand bar */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 60,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: -0.5,
          zIndex: 50,
        }}
      >
        ClipMotion<span style={{ color: "#e879f9" }}>.ai</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 36,
          right: 60,
          fontSize: 18,
          fontWeight: 600,
          padding: "10px 22px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          zIndex: 50,
        }}
      >
        AI Product Photography · Sponsored
      </div>

      <Audio src={staticFile("audio/demo3-music.mp3")} volume={0.8} />
    </AbsoluteFill>
  );
};
