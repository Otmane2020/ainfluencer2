import { z } from "zod";

// ── Animation schemas ──
const AnimationSchema = z.object({
  type: z.literal("scale"),
  startMs: z.number(),
  endMs: z.number(),
  from: z.number(),
  to: z.number(),
});

const TransitionSchema = z.union([
  z.literal("fade"),
  z.literal("blur"),
  z.literal("none"),
]);

// ── Scene element (background image) ──
export const SceneElementSchema = z.object({
  imageUrl: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  enterTransition: TransitionSchema.optional().default("blur"),
  exitTransition: TransitionSchema.optional().default("fade"),
  animations: z.array(AnimationSchema).optional(),
});

// ── Text element (subtitle overlay) ──
export const TextElementSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  position: z
    .union([z.literal("top"), z.literal("center"), z.literal("bottom")])
    .optional()
    .default("bottom"),
});

// ── Audio element ──
export const AudioElementSchema = z.object({
  audioUrl: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

// ── Full timeline (matches official template pattern) ──
export const TimelineSchema = z.object({
  shortTitle: z.string(),
  elements: z.array(SceneElementSchema),
  text: z.array(TextElementSchema),
  audio: z.array(AudioElementSchema),
});

export type Animation = z.infer<typeof AnimationSchema>;
export type SceneElement = z.infer<typeof SceneElementSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type AudioElement = z.infer<typeof AudioElementSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
