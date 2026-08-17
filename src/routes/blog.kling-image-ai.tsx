import { createFileRoute } from "@tanstack/react-router";
import KlingImageAIPage from "@/pages/blog/KlingImageAIPage";

export const Route = createFileRoute("/blog/kling-image-ai")({
  head: () => ({
    meta: [
      { title: "Kling Image AI: Create Stunning AI Visuals — ClipMotion" },
      { name: "description", content: "What Kling Image AI does best, prompt structures that work, and how to combine it with video models for a consistent brand look." },
      { property: "og:title", content: "Kling Image AI: Create Stunning AI Visuals — ClipMotion" },
      { property: "og:description", content: "What Kling Image AI does best, prompt structures that work, and how to combine it with video models for a consistent brand look." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/kling-image-ai" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/kling-image-ai" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Kling Image AI: Create Stunning AI Visuals — ClipMotion","description":"What Kling Image AI does best, prompt structures that work, and how to combine it with video models for a consistent brand look.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/kling-image-ai"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: KlingImageAIPage,
});
