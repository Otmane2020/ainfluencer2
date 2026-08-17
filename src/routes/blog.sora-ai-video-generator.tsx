import { createFileRoute } from "@tanstack/react-router";
import SoraAIVideoPage from "@/pages/blog/SoraAIVideoPage";

export const Route = createFileRoute("/blog/sora-ai-video-generator")({
  head: () => ({
    meta: [
      { title: "Sora AI Video Generator: OpenAI's Video Model — ClipMotion" },
      { name: "description", content: "Inside OpenAI Sora: realism, physics, duration limits and practical prompts for marketing videos you can actually ship." },
      { property: "og:title", content: "Sora AI Video Generator: OpenAI's Video Model — ClipMotion" },
      { property: "og:description", content: "Inside OpenAI Sora: realism, physics, duration limits and practical prompts for marketing videos you can actually ship." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/sora-ai-video-generator" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/sora-ai-video-generator" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Sora AI Video Generator: OpenAI's Video Model — ClipMotion","description":"Inside OpenAI Sora: realism, physics, duration limits and practical prompts for marketing videos you can actually ship.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/sora-ai-video-generator"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: SoraAIVideoPage,
});
