import { createFileRoute } from "@tanstack/react-router";
import ClipMotionFAQPage from "@/pages/ClipMotionFAQPage";

export const Route = createFileRoute("/clip-motion-faq")({
  head: () => ({
    meta: [
      { title: "Clip Motion Faq — ClipMotion" },
      { name: "description", content: "Clip Motion Faq guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Clip Motion Faq — ClipMotion" },
      { property: "og:description", content: "Clip Motion Faq guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/clip-motion-faq" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/clip-motion-faq" }],
  }),
  component: ClipMotionFAQPage,
});
