import { createFileRoute } from "@tanstack/react-router";
import AIVideoGeneratorPage from "@/pages/AIVideoGeneratorPage";

export const Route = createFileRoute("/ai-video-generator")({
  head: () => ({
    meta: [
      { title: "AI Video Generator — ClipMotion" },
      { name: "description", content: "Generate cinematic AI videos from text or images with ClipMotion’s video models." },
      { property: "og:title", content: "AI Video Generator — ClipMotion" },
      { property: "og:description", content: "Generate cinematic AI videos from text or images with ClipMotion’s video models." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/ai-video-generator" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/ai-video-generator" }],
  }),
  component: AIVideoGeneratorPage,
});
