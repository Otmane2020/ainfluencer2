import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { display, inter } from "../MainVideo";

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const s2 = spring({ frame: frame - 14, fps, config: { damping: 14, stiffness: 90 } });
  const s3 = spring({ frame: frame - 28, fps, config: { damping: 14, stiffness: 90 } });
  const flash = interpolate(frame, [0, 8, 16], [0, 0.6, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
      <div style={{ textAlign: "center", maxWidth: 1500 }}>
        <div
          style={{
            fontFamily: inter,
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#fb923c",
            opacity: s1,
            transform: `translateY(${(1 - s1) * 20}px)`,
            marginBottom: 40,
          }}
        >
          Stop wasting €2,000 per shoot
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 200,
            lineHeight: 0.9,
            letterSpacing: -6,
            opacity: s2,
            transform: `translateY(${(1 - s2) * 60}px) scale(${0.92 + s2 * 0.08})`,
          }}
        >
          One photo.<br />
          <span style={{
            background: "linear-gradient(135deg, #e879f9, #fb923c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Six pro shots.</span>
        </div>
        <div
          style={{
            fontFamily: inter,
            fontWeight: 600,
            fontSize: 38,
            color: "rgba(255,255,255,0.85)",
            marginTop: 50,
            opacity: s3,
            transform: `translateY(${(1 - s3) * 30}px)`,
          }}
        >
          AI product photography · ready in 30 seconds
        </div>
      </div>
    </AbsoluteFill>
  );
};
