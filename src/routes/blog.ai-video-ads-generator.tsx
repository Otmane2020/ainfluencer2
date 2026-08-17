import { createFileRoute } from "@tanstack/react-router";
import AIVideoAdsGeneratorPage from "@/pages/blog/AIVideoAdsGeneratorPage";

export const Route = createFileRoute("/blog/ai-video-ads-generator")({
  head: () => ({
    meta: [
      { title: "AI Video Ads Generator: High-Converting Ads in Minutes — ClipMotion" },
      { name: "description", content: "Build scroll-stopping video ads with AI: hooks, UGC angles, product shots and platform-ready exports for Meta, TikTok and YouTube." },
      { property: "og:title", content: "AI Video Ads Generator: High-Converting Ads in Minutes — ClipMotion" },
      { property: "og:description", content: "Build scroll-stopping video ads with AI: hooks, UGC angles, product shots and platform-ready exports for Meta, TikTok and YouTube." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/ai-video-ads-generator" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/ai-video-ads-generator" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"AI Video Ads Generator: High-Converting Ads in Minutes — ClipMotion","description":"Build scroll-stopping video ads with AI: hooks, UGC angles, product shots and platform-ready exports for Meta, TikTok and YouTube.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/ai-video-ads-generator"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: AIVideoAdsGeneratorPage,
});
