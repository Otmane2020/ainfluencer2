import { createFileRoute } from "@tanstack/react-router";
import BlogPage from "@/pages/BlogPage";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — AI Video & Image Guides | ClipMotion" },
      { name: "description", content: "Guides, comparisons and tutorials on AI video and image generation." },
      { property: "og:title", content: "Blog — AI Video & Image Guides | ClipMotion" },
      { property: "og:description", content: "Guides, comparisons and tutorials on AI video and image generation." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Blog — AI Video & Image Guides | ClipMotion","description":"Guides, comparisons and tutorials on AI video and image generation.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: BlogPage,
});
