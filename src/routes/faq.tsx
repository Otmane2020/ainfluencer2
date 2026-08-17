import { createFileRoute } from "@tanstack/react-router";
import FAQPage from "@/pages/FAQPage";
import { faqSchema } from "@/lib/seo-data";

const title = "FAQ — ClipMotion AI Video & Image Studio";
const description =
  "Answers about credits, AI models, video formats, exports, refunds and commercial usage on ClipMotion.";
const url = "https://clipmotion.ai/faq";
const ogImage = "https://clipmotion.ai/og-image.png";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqSchema) }],
  }),
  component: FAQPage,
});
