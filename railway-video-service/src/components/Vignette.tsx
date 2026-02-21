import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * Cinematic vignette overlay for professional look.
 */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)",
      pointerEvents: "none",
    }}
  />
);
