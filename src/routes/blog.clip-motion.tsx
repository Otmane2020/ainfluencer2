import { createFileRoute } from "@tanstack/react-router";
import BlogClipMotionPage from "@/pages/BlogClipMotionPage";

export const Route = createFileRoute("/blog/clip-motion")({
  head: () => ({
    meta: [
      { title: "Clip Motion — ClipMotion" },
      { name: "description", content: "Clip Motion guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Clip Motion — ClipMotion" },
      { property: "og:description", content: "Clip Motion guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: BlogClipMotionPage,
});
