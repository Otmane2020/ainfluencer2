import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/pages/LandingPage";
import { softwareApplicationSchema } from "@/lib/seo-data";

const title = "ClipMotion — AI Image & Video Generation Studio";
const description =
  "Turn prompts into cinematic AI images and videos. Generate, animate and export studio-quality visuals in minutes.";
const url = "https://clipmotion.ai/";
const ogImage = "https://clipmotion.ai/og-image.png";

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
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(softwareApplicationSchema) },
    ],
  }),
  component: LandingPage,
});
