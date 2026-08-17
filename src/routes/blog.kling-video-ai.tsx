import { createFileRoute } from "@tanstack/react-router";
import KlingVideoAIPage from "@/pages/blog/KlingVideoAIPage";

export const Route = createFileRoute("/blog/kling-video-ai")({
  head: () => ({
    meta: [
      { title: "Kling Video Ai — ClipMotion" },
      { name: "description", content: "Kling Video Ai guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Kling Video Ai — ClipMotion" },
      { property: "og:description", content: "Kling Video Ai guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: KlingVideoAIPage,
});
