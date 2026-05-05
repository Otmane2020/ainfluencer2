import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { display, inter } from "../MainVideo";

export const SceneUploadReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const arrow = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const sweep = interpolate(frame, [40, 100], [-100, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelLeft = spring({ frame, fps, config: { damping: 18 } });
  const labelRight = spring({ frame: frame - 70, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 80 }}>
        {/* LEFT — phone shot */}
        <div style={{ textAlign: "center", opacity: labelLeft, transform: `translateX(${(1 - labelLeft) * -60}px)` }}>
          <div style={{ fontFamily: inter, fontSize: 22, color: "rgba(255,255,255,0.6)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 24 }}>
            Your phone shot
          </div>
          <div
            style={{
              width: 480,
              height: 600,
              borderRadius: 40,
              overflow: "hidden",
              border: "2px dashed rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.03)",
              position: "relative",
            }}
          >
            <Img src={staticFile("images/sofa-original.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.85)" }} />
            <div style={{ position: "absolute", bottom: 20, left: 20, background: "rgba(0,0,0,0.7)", padding: "6px 14px", borderRadius: 8, fontSize: 18, fontWeight: 600 }}>
              sofa.jpg · 1.2MB
            </div>
          </div>
        </div>

        {/* CENTER — arrow + sweep */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div
            style={{
              fontFamily: display,
              fontWeight: 800,
              fontSize: 80,
              transform: `scale(${arrow})`,
              background: "linear-gradient(135deg,#e879f9,#fb923c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            →
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e879f9", letterSpacing: 3, textTransform: "uppercase", opacity: arrow }}>
            AI · 30 seconds
          </div>
        </div>

        {/* RIGHT — pro shot reveal */}
        <div style={{ textAlign: "center", opacity: labelRight, transform: `translateX(${(1 - labelRight) * 60}px)` }}>
          <div style={{ fontFamily: inter, fontSize: 22, color: "#fb923c", letterSpacing: 4, textTransform: "uppercase", marginBottom: 24, fontWeight: 700 }}>
            Studio result
          </div>
          <div
            style={{
              width: 480,
              height: 600,
              borderRadius: 40,
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 40px 100px rgba(232,121,249,0.4)",
            }}
          >
            <Img src={staticFile("images/sofa-1.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {/* sweep light */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${sweep}%`,
                width: 200,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                filter: "blur(20px)",
              }}
            />
            <div style={{ position: "absolute", top: 20, right: 20, background: "linear-gradient(135deg,#e879f9,#fb923c)", padding: "8px 16px", borderRadius: 999, fontSize: 18, fontWeight: 800 }}>
              ✨ AI
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
