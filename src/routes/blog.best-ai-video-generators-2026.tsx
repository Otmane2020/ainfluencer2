import { createFileRoute } from "@tanstack/react-router";
import BestAIVideoGenerators2026Page from "@/pages/blog/BestAIVideoGenerators2026Page";

export const Route = createFileRoute("/blog/best-ai-video-generators-2026")({
  head: () => ({
    meta: [
      { title: "10 Best AI Video Generators in 2026 (Compared) — ClipMotion" },
      { name: "description", content: "A hands-on comparison of the 10 leading AI video generators in 2026: quality, speed, pricing and the best use case for each." },
      { property: "og:title", content: "10 Best AI Video Generators in 2026 (Compared) — ClipMotion" },
      { property: "og:description", content: "A hands-on comparison of the 10 leading AI video generators in 2026: quality, speed, pricing and the best use case for each." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/best-ai-video-generators-2026" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/best-ai-video-generators-2026" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"10 Best AI Video Generators in 2026 (Compared) — ClipMotion","description":"A hands-on comparison of the 10 leading AI video generators in 2026: quality, speed, pricing and the best use case for each.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/best-ai-video-generators-2026"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: BestAIVideoGenerators2026Page,
});
