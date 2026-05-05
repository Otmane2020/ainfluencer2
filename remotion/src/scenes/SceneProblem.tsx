import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Img, staticFile } from "remotion";
import { display, inter } from "../MainVideo";

export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    { label: "Studio booking", price: "€800", icon: "📷" },
    { label: "Photographer", price: "€1200", icon: "👤" },
    { label: "Retouching", price: "€400", icon: "✂️" },
    { label: "2 weeks delay", price: "⏳", icon: "📅" },
  ];

  const headline = spring({ frame, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: 90,
          textAlign: "center",
          letterSpacing: -3,
          opacity: headline,
          transform: `translateY(${(1 - headline) * 40}px)`,
          marginBottom: 70,
        }}
      >
        The old way is <span style={{ color: "#fb923c" }}>broken</span>.
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        {items.map((it, i) => {
          const s = spring({ frame: frame - 18 - i * 8, fps, config: { damping: 14, stiffness: 110 } });
          const stamp = spring({ frame: frame - 60 - i * 6, fps, config: { damping: 8 } });
          return (
            <div
              key={i}
              style={{
                width: 280,
                height: 320,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 28,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                opacity: s,
                transform: `translateY(${(1 - s) * 60}px) scale(${0.9 + s * 0.1})`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 64 }}>{it.icon}</div>
              <div>
                <div style={{ fontSize: 22, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{it.label}</div>
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 56, marginTop: 8, color: "white" }}>{it.price}</div>
              </div>
              {/* big red strike */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "-10%",
                  width: "120%",
                  height: 8,
                  background: "#ef4444",
                  transformOrigin: "left center",
                  transform: `rotate(-12deg) scaleX(${stamp})`,
                  boxShadow: "0 0 20px rgba(239,68,68,0.6)",
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
