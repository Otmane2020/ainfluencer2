import { createFileRoute } from "@tanstack/react-router";
import NanoBananaProPage from "@/pages/blog/NanoBananaProPage";

export const Route = createFileRoute("/blog/nano-banana-pro")({
  head: () => ({
    meta: [
      { title: "Nano Banana Pro — ClipMotion" },
      { name: "description", content: "Nano Banana Pro guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Nano Banana Pro — ClipMotion" },
      { property: "og:description", content: "Nano Banana Pro guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: NanoBananaProPage,
});
