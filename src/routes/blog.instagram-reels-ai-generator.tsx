import { createFileRoute } from "@tanstack/react-router";
import InstagramReelsAIPage from "@/pages/blog/InstagramReelsAIPage";

export const Route = createFileRoute("/blog/instagram-reels-ai-generator")({
  head: () => ({
    meta: [
      { title: "Instagram Reels AI Generator: Automate Reels in 2026 — ClipMotion" },
      { name: "description", content: "How to generate Instagram Reels with AI end to end — hooks, 9:16 visuals, captions and a posting cadence that grows reach." },
      { property: "og:title", content: "Instagram Reels AI Generator: Automate Reels in 2026 — ClipMotion" },
      { property: "og:description", content: "How to generate Instagram Reels with AI end to end — hooks, 9:16 visuals, captions and a posting cadence that grows reach." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/instagram-reels-ai-generator" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/instagram-reels-ai-generator" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Instagram Reels AI Generator: Automate Reels in 2026 — ClipMotion","description":"How to generate Instagram Reels with AI end to end — hooks, 9:16 visuals, captions and a posting cadence that grows reach.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/instagram-reels-ai-generator"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: InstagramReelsAIPage,
});
