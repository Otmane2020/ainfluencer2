import { createFileRoute } from "@tanstack/react-router";
import NanoBananaVideoPage from "@/pages/NanoBananaVideoPage";

export const Route = createFileRoute("/nanobananavideo")({
  head: () => ({
    meta: [
      { title: "Nanobananavideo — ClipMotion" },
      { name: "description", content: "Nanobananavideo guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Nanobananavideo — ClipMotion" },
      { property: "og:description", content: "Nanobananavideo guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/nanobananavideo" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/nanobananavideo" }],
  }),
  component: NanoBananaVideoPage,
});
