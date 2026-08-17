import { createFileRoute } from "@tanstack/react-router";
import TikTokVideosWithAIPage from "@/pages/blog/TikTokVideosWithAIPage";

export const Route = createFileRoute("/blog/tiktok-videos-with-ai")({
  head: () => ({
    meta: [
      { title: "Create Viral TikTok Videos with AI: 2026 Strategy — ClipMotion" },
      { name: "description", content: "A repeatable AI workflow for TikTok: hook formulas, 9:16 visuals, captions, trends and posting frequency that compounds views." },
      { property: "og:title", content: "Create Viral TikTok Videos with AI: 2026 Strategy — ClipMotion" },
      { property: "og:description", content: "A repeatable AI workflow for TikTok: hook formulas, 9:16 visuals, captions, trends and posting frequency that compounds views." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/tiktok-videos-with-ai" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/tiktok-videos-with-ai" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Create Viral TikTok Videos with AI: 2026 Strategy — ClipMotion","description":"A repeatable AI workflow for TikTok: hook formulas, 9:16 visuals, captions, trends and posting frequency that compounds views.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/tiktok-videos-with-ai"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: TikTokVideosWithAIPage,
});
