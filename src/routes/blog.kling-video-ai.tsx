import { createFileRoute } from "@tanstack/react-router";
import KlingVideoAIPage from "@/pages/blog/KlingVideoAIPage";

export const Route = createFileRoute("/blog/kling-video-ai")({
  head: () => ({
    meta: [
      { title: "Kling 2.6 Video AI: The Ultimate Guide — ClipMotion" },
      { name: "description", content: "A complete guide to Kling 2.6: motion quality, camera control, image-to-video workflows and prompt patterns for cinematic clips." },
      { property: "og:title", content: "Kling 2.6 Video AI: The Ultimate Guide — ClipMotion" },
      { property: "og:description", content: "A complete guide to Kling 2.6: motion quality, camera control, image-to-video workflows and prompt patterns for cinematic clips." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/kling-video-ai" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/kling-video-ai" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Kling 2.6 Video AI: The Ultimate Guide — ClipMotion","description":"A complete guide to Kling 2.6: motion quality, camera control, image-to-video workflows and prompt patterns for cinematic clips.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/kling-video-ai"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: KlingVideoAIPage,
});
