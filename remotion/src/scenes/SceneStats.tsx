import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { display, inter } from "../MainVideo";

const STATS = [
  { v: 30, suffix: "s", label: "Generation time" },
  { v: 6, suffix: "x", label: "Shots per upload" },
  { v: 67, suffix: "%", label: "Avg. conversion lift" },
  { v: 0, suffix: "€", label: "Photographer cost" },
];

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>
      <div
        style={{
          fontFamily: inter,
          fontSize: 22,
          color: "#fb923c",
          letterSpacing: 6,
          textTransform: "uppercase",
          marginBottom: 24,
          opacity: head,
          fontWeight: 700,
        }}
      >
        The new math
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 84,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: -3,
          marginBottom: 70,
          opacity: head,
          transform: `translateY(${(1 - head) * 30}px)`,
        }}
      >
        From <span style={{ textDecoration: "line-through", color: "rgba(255,255,255,0.4)" }}>€2,400</span>{" "}
        to <span style={{ background: "linear-gradient(135deg,#e879f9,#fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>$0</span>.
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        {STATS.map((s, i) => {
          const sp = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 14 } });
          const count = Math.round(interpolate(sp, [0, 1], [0, s.v]));
          return (
            <div
              key={i}
              style={{
                width: 320,
                padding: "40px 32px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 28,
                textAlign: "center",
                opacity: sp,
                transform: `translateY(${(1 - sp) * 50}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: display,
                  fontSize: 110,
                  fontWeight: 800,
                  letterSpacing: -4,
                  background: "linear-gradient(135deg,#e879f9,#fb923c)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                }}
              >
                {s.suffix === "€" ? `${s.suffix}${count}` : `${count}${s.suffix}`}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: 12, letterSpacing: 1 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
