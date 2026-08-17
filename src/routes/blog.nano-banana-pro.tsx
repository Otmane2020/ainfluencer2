import { createFileRoute } from "@tanstack/react-router";
import NanoBananaProPage from "@/pages/blog/NanoBananaProPage";

export const Route = createFileRoute("/blog/nano-banana-pro")({
  head: () => ({
    meta: [
      { title: "Nano Banana Pro: AI Video for Brands & Agencies — ClipMotion" },
      { name: "description", content: "Nano Banana Pro explained: professional-grade output, batch workflows and where it fits in an agency video production stack." },
      { property: "og:title", content: "Nano Banana Pro: AI Video for Brands & Agencies — ClipMotion" },
      { property: "og:description", content: "Nano Banana Pro explained: professional-grade output, batch workflows and where it fits in an agency video production stack." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/nano-banana-pro" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/nano-banana-pro" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Nano Banana Pro: AI Video for Brands & Agencies — ClipMotion","description":"Nano Banana Pro explained: professional-grade output, batch workflows and where it fits in an agency video production stack.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/nano-banana-pro"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: NanoBananaProPage,
});
