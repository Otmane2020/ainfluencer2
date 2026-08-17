import { createFileRoute } from "@tanstack/react-router";
import FAQPage from "@/pages/FAQPage";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — ClipMotion" },
      { name: "description", content: "Answers about credits, AI models, exports and commercial usage on ClipMotion." },
      { property: "og:title", content: "FAQ — ClipMotion" },
      { property: "og:description", content: "Answers about credits, AI models, exports and commercial usage on ClipMotion." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/faq" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/faq" }],
  }),
  component: FAQPage,
});
