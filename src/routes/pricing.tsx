import { createFileRoute } from "@tanstack/react-router";
import TransparentPricingPage from "@/pages/TransparentPricingPage";

const title = "Pricing — ClipMotion AI Product Motion Studio";
const description =
  "Transparent credit-based pricing for ClipMotion AI image, video and image-to-video generation. See generation costs before you create and cancel anytime.";
const url = "https://clipmotion.ai/pricing";
const ogImage = "https://clipmotion.ai/og-image.png";

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  url,
  description,
  isPartOf: {
    "@type": "WebSite",
    name: "ClipMotion",
    url: "https://clipmotion.ai/",
  },
};

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
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(pricingSchema) }],
  }),
  component: TransparentPricingPage,
});
