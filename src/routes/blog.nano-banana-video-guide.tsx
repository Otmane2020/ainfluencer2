import { createFileRoute } from "@tanstack/react-router";
import NanoBananaVideoGuidePage from "@/pages/blog/NanoBananaVideoGuidePage";

export const Route = createFileRoute("/blog/nano-banana-video-guide")({
  head: () => ({
    meta: [
      { title: "Nano Banana Video: Ultra-Fast AI Video Explained — ClipMotion" },
      { name: "description", content: "How Nano Banana generates video in seconds, its strengths and limits, and prompt tips for fast social-ready clips." },
      { property: "og:title", content: "Nano Banana Video: Ultra-Fast AI Video Explained — ClipMotion" },
      { property: "og:description", content: "How Nano Banana generates video in seconds, its strengths and limits, and prompt tips for fast social-ready clips." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/nano-banana-video-guide" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/nano-banana-video-guide" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Nano Banana Video: Ultra-Fast AI Video Explained — ClipMotion","description":"How Nano Banana generates video in seconds, its strengths and limits, and prompt tips for fast social-ready clips.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/nano-banana-video-guide"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: NanoBananaVideoGuidePage,
});
