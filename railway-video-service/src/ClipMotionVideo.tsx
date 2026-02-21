import React from "react";
import {
  AbsoluteFill,
  Img,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";

export interface ClipMotionVideoProps {
  imageUrl: string;
  audioUrl: string;
  titleText: string;
}

export const ClipMotionVideo: React.FC<ClipMotionVideoProps> = ({
  imageUrl,
  audioUrl,
  titleText,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // ── Ken Burns zoom effect ──
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.12], {
    extrapolateRight: "clamp",
  });

  // ── Title fade-in with spring ──
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 80, stiffness: 200 },
    durationInFrames: fps, // 1 second spring
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [-20, 0]);

  // ── Title fade-out near end ──
  const fadeOutStart = durationInFrames - fps * 2;
  const titleFadeOut = interpolate(
    frame,
    [fadeOutStart, durationInFrames - fps],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const finalTitleOpacity = titleOpacity * titleFadeOut;

  // ── Vignette overlay for cinematic feel ──
  const vignetteStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
    pointerEvents: "none",
  };

  // ── Bottom gradient for text legibility ──
  const isVertical = height > width;
  const titleFontSize = isVertical ? 32 : 36;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background image with Ken Burns */}
      {imageUrl && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          />
        </AbsoluteFill>
      )}

      {/* Vignette overlay */}
      <div style={vignetteStyle} />

      {/* Title overlay */}
      {titleText && titleText.trim() && (
        <div
          style={{
            position: "absolute",
            top: isVertical ? 80 : 40,
            left: 20,
            right: 20,
            textAlign: "center",
            opacity: finalTitleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <span
            style={{
              display: "inline-block",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              color: "#fff",
              fontSize: titleFontSize,
              fontWeight: 700,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              padding: "10px 24px",
              borderRadius: 8,
              lineHeight: 1.3,
              maxWidth: "90%",
              letterSpacing: 0.5,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            {titleText.slice(0, 80)}
          </span>
        </div>
      )}

      {/* Audio track */}
      {audioUrl && (
        <Sequence from={0}>
          <Audio src={audioUrl} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
