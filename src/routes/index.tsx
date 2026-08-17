import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/pages/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClipMotion — AI Image & Video Generation Studio" },
      { name: "description", content: "Turn prompts into cinematic AI images and videos. Generate, animate and export studio-quality visuals in minutes." },
      { property: "og:title", content: "ClipMotion — AI Image & Video Generation Studio" },
      { property: "og:description", content: "Turn prompts into cinematic AI images and videos. Generate, animate and export studio-quality visuals in minutes." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/" }],
  }),
  component: LandingPage,
});
