import { createFileRoute } from "@tanstack/react-router";
import SoraAIVideoPage from "@/pages/blog/SoraAIVideoPage";

export const Route = createFileRoute("/blog/sora-ai-video-generator")({
  head: () => ({
    meta: [
      { title: "Sora Ai Video Generator — ClipMotion" },
      { name: "description", content: "Sora Ai Video Generator guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Sora Ai Video Generator — ClipMotion" },
      { property: "og:description", content: "Sora Ai Video Generator guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: SoraAIVideoPage,
});
