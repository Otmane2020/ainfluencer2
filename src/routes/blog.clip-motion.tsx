import { createFileRoute } from "@tanstack/react-router";
import BlogClipMotionPage from "@/pages/BlogClipMotionPage";

export const Route = createFileRoute("/blog/clip-motion")({
  head: () => ({
    meta: [
      { title: "Clip Motion: AI Motion Design Explained — ClipMotion" },
      { name: "description", content: "What clip motion means in AI video, how motion design is automated, and how to produce animated clips from a single prompt." },
      { property: "og:title", content: "Clip Motion: AI Motion Design Explained — ClipMotion" },
      { property: "og:description", content: "What clip motion means in AI video, how motion design is automated, and how to produce animated clips from a single prompt." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/clip-motion" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/clip-motion" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Clip Motion: AI Motion Design Explained — ClipMotion","description":"What clip motion means in AI video, how motion design is automated, and how to produce animated clips from a single prompt.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/clip-motion"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: BlogClipMotionPage,
});
