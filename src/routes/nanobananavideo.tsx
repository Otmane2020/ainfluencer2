import { createFileRoute } from "@tanstack/react-router";
import NanoBananaVideoPage from "@/pages/NanoBananaVideoPage";

export const Route = createFileRoute("/nanobananavideo")({
  head: () => ({
    meta: [
      { title: "Nanobananavideo — ClipMotion" },
      { name: "description", content: "Nanobananavideo guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Nanobananavideo — ClipMotion" },
      { property: "og:description", content: "Nanobananavideo guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: NanoBananaVideoPage,
});
