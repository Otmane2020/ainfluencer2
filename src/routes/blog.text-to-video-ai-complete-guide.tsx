import { createFileRoute } from "@tanstack/react-router";
import TextToVideoAIGuidePage from "@/pages/blog/TextToVideoAIGuidePage";

export const Route = createFileRoute("/blog/text-to-video-ai-complete-guide")({
  head: () => ({
    meta: [
      { title: "Text to Video AI: Complete Beginner's Guide (2026) — ClipMotion" },
      { name: "description", content: "Learn text-to-video AI from scratch: how models work, writing effective prompts, aspect ratios, sound and exporting for each platform." },
      { property: "og:title", content: "Text to Video AI: Complete Beginner's Guide (2026) — ClipMotion" },
      { property: "og:description", content: "Learn text-to-video AI from scratch: how models work, writing effective prompts, aspect ratios, sound and exporting for each platform." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://clipmotion.ai/blog/text-to-video-ai-complete-guide" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/blog/text-to-video-ai-complete-guide" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting","headline":"Text to Video AI: Complete Beginner's Guide (2026) — ClipMotion","description":"Learn text-to-video AI from scratch: how models work, writing effective prompts, aspect ratios, sound and exporting for each platform.","image":"https://clipmotion.ai/og-image.png","datePublished":"2026-02-06","dateModified":"2026-02-06","mainEntityOfPage":{"@type":"WebPage","@id":"https://clipmotion.ai/blog/text-to-video-ai-complete-guide"},"author":{"@type":"Organization","name":"ClipMotion"},"publisher":{"@type":"Organization","name":"ClipMotion","logo":{"@type":"ImageObject","url":"https://clipmotion.ai/logo.png"}}}),
      },
    ],
  }),
  component: TextToVideoAIGuidePage,
});
