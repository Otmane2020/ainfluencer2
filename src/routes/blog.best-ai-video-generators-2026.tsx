import { createFileRoute } from "@tanstack/react-router";
import BestAIVideoGenerators2026Page from "@/pages/blog/BestAIVideoGenerators2026Page";

export const Route = createFileRoute("/blog/best-ai-video-generators-2026")({
  head: () => ({
    meta: [
      { title: "Best Ai Video Generators 2026 — ClipMotion" },
      { name: "description", content: "Best Ai Video Generators 2026 guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Best Ai Video Generators 2026 — ClipMotion" },
      { property: "og:description", content: "Best Ai Video Generators 2026 guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: BestAIVideoGenerators2026Page,
});
