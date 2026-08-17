import { createFileRoute } from "@tanstack/react-router";
import AIVideoForEcommercePage from "@/pages/blog/AIVideoForEcommercePage";

export const Route = createFileRoute("/blog/ai-video-for-ecommerce")({
  head: () => ({
    meta: [
      { title: "Ai Video For Ecommerce — ClipMotion" },
      { name: "description", content: "Ai Video For Ecommerce guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Ai Video For Ecommerce — ClipMotion" },
      { property: "og:description", content: "Ai Video For Ecommerce guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: AIVideoForEcommercePage,
});
