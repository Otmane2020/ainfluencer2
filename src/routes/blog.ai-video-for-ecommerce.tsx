import { createFileRoute } from "@tanstack/react-router";
import AIVideoForEcommercePage from "@/pages/blog/AIVideoForEcommercePage";

export const Route = createFileRoute("/blog/ai-video-for-ecommerce")({
  head: () => ({
    meta: [
      { title: "AI Video for E-commerce: Automated Product Videos — ClipMotion" },
      { name: "description", content: "Turn product photos into demo, unboxing and UGC-style videos that lift conversion on product pages and paid social." },
      { property: "og:title", content: "AI Video for E-commerce: Automated Product Videos — ClipMotion" },
      { property: "og:description", content: "Turn product photos into demo, unboxing and UGC-style videos that lift conversion on product pages and paid social." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/ai-video-for-ecommerce" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/ai-video-for-ecommerce" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"AI Video for E-commerce: Automated Product Videos — ClipMotion","description":"Turn product photos into demo, unboxing and UGC-style videos that lift conversion on product pages and paid social.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/ai-video-for-ecommerce"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: AIVideoForEcommercePage,
});
