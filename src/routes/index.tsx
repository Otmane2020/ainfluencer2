import { createFileRoute } from "@tanstack/react-router";
import ProductMotionLandingPage from "@/pages/ProductMotionLandingPage";

const title = "ClipMotion — Turn Product Photos into AI Motion Clips";
const description =
  "Create product visuals and short AI motion clips from a product photo or prompt. Built for Reels, TikTok, ads and e-commerce creative.";
const url = "https://clipmotion.ai/";
const ogImage = "https://clipmotion.ai/og-image.png";

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClipMotion",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url,
  description,
  featureList: [
    "AI image generation",
    "AI video generation",
    "Image-to-video generation",
    "Product motion clips",
    "HD exports",
  ],
};

export const Route = createFileRoute("/")({
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
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(softwareApplicationSchema) },
    ],
  }),
  component: ProductMotionLandingPage,
});
