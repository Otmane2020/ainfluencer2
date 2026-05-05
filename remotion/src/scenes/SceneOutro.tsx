import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { display, inter } from "../MainVideo";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame, fps, config: { damping: 18 } });
  const w1 = spring({ frame: frame - 14, fps, config: { damping: 12 } });
  const w2 = spring({ frame: frame - 28, fps, config: { damping: 12 } });
  const tag = spring({ frame: frame - 50, fps, config: { damping: 16 } });
  const cta = spring({ frame: frame - 70, fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.025;
  const arrow = interpolate(frame % 60, [0, 60], [0, 14]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>
      <div style={{ textAlign: "center", maxWidth: 1500 }}>
        <div
          style={{
            fontFamily: inter,
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#e879f9",
            opacity: k,
            fontWeight: 700,
            marginBottom: 30,
          }}
        >
          Try it free · 10 credits on signup
        </div>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 220, lineHeight: 0.9, letterSpacing: -8 }}>
          <div
            style={{
              opacity: w1,
              transform: `translateY(${(1 - w1) * 60}px)`,
            }}
          >
            ClipMotion<span style={{ color: "#e879f9" }}>.ai</span>
          </div>
          <div
            style={{
              fontSize: 90,
              marginTop: 30,
              opacity: w2,
              transform: `translateY(${(1 - w2) * 40}px)`,
              background: "linear-gradient(135deg,#e879f9,#fb923c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: -3,
            }}
          >
            Pro shots. Zero studio.
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.75)",
            marginTop: 40,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 20}px)`,
            fontWeight: 500,
          }}
        >
          For Shopify · Amazon · Meta Ads · TikTok
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            marginTop: 60,
            padding: "26px 56px",
            borderRadius: 999,
            background: "linear-gradient(135deg,#e879f9,#fb923c)",
            fontSize: 38,
            fontWeight: 800,
            color: "white",
            opacity: cta,
            transform: `translateY(${(1 - cta) * 30}px) scale(${cta * pulse})`,
            boxShadow: "0 30px 80px rgba(232,121,249,0.5)",
            fontFamily: display,
          }}
        >
          clipmotion.ai
          <span style={{ display: "inline-block", transform: `translateX(${arrow}px)` }}>→</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
