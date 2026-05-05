import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Img, staticFile } from "remotion";
import { display, inter } from "../MainVideo";

const SHOTS = [
  { src: "images/sofa-1.jpg", tag: "Studio" },
  { src: "images/sofa-2.jpg", tag: "Studio" },
  { src: "images/sofa-3.jpg", tag: "Studio" },
  { src: "images/watch-1.jpg", tag: "Lifestyle" },
  { src: "images/watch-2.jpg", tag: "Lifestyle" },
  { src: "images/watch-3.jpg", tag: "Lifestyle" },
];

export const SceneMosaic: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headline = spring({ frame, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "100px 120px 80px" }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: 64,
          textAlign: "center",
          marginBottom: 40,
          opacity: headline,
          transform: `translateY(${(1 - headline) * 30}px)`,
          letterSpacing: -2,
        }}
      >
        Six conversion-ready shots, every time.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, width: "100%", maxWidth: 1500 }}>
        {SHOTS.map((s, i) => {
          const sp = spring({ frame: frame - 14 - i * 7, fps, config: { damping: 14, stiffness: 120 } });
          return (
            <div
              key={i}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 24,
                overflow: "hidden",
                opacity: sp,
                transform: `translateY(${(1 - sp) * 80}px) scale(${0.85 + sp * 0.15})`,
                boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
              }}
            >
              <Img src={staticFile(s.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  background: "rgba(0,0,0,0.75)",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {s.tag}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
