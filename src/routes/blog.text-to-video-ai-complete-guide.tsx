import { createFileRoute } from "@tanstack/react-router";
import TextToVideoAIGuidePage from "@/pages/blog/TextToVideoAIGuidePage";

export const Route = createFileRoute("/blog/text-to-video-ai-complete-guide")({
  head: () => ({
    meta: [
      { title: "Text To Video Ai Complete Guide — ClipMotion" },
      { name: "description", content: "Text To Video Ai Complete Guide guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Text To Video Ai Complete Guide — ClipMotion" },
      { property: "og:description", content: "Text To Video Ai Complete Guide guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: TextToVideoAIGuidePage,
});
