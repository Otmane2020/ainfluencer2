import { createFileRoute } from "@tanstack/react-router";
import NanoBananaVideoGuidePage from "@/pages/blog/NanoBananaVideoGuidePage";

export const Route = createFileRoute("/blog/nano-banana-video-guide")({
  head: () => ({
    meta: [
      { title: "Nano Banana Video Guide — ClipMotion" },
      { name: "description", content: "Nano Banana Video Guide guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Nano Banana Video Guide — ClipMotion" },
      { property: "og:description", content: "Nano Banana Video Guide guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: NanoBananaVideoGuidePage,
});
