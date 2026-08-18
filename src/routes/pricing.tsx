import { createFileRoute } from "@tanstack/react-router";
import PricingPage from "@/pages/PricingPage";
import { productSchema } from "@/lib/seo-data";

const title = "Pricing — ClipMotion AI Studio";
const description =
  "Simple credit-based pricing for AI image and video generation. Starter, Pro and Business plans. Pay as you create, cancel anytime.";
const url = "https://clipmotion.ai/pricing";
const ogImage = "https://clipmotion.ai/og-image.png";

export const Route = createFileRoute("/pricing")({
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
    scripts: [{ type: "application/ld+json", children: JSON.stringify(productSchema) }],
  }),
  component: PricingPage,
});
