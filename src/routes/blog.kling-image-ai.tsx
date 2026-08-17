import { createFileRoute } from "@tanstack/react-router";
import KlingImageAIPage from "@/pages/blog/KlingImageAIPage";

export const Route = createFileRoute("/blog/kling-image-ai")({
  head: () => ({
    meta: [
      { title: "Kling Image Ai — ClipMotion" },
      { name: "description", content: "Kling Image Ai guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Kling Image Ai — ClipMotion" },
      { property: "og:description", content: "Kling Image Ai guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: KlingImageAIPage,
});
