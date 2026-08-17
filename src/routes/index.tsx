import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/pages/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClipMotion — AI Image & Video Generation Studio" },
      { name: "description", content: "Turn prompts into cinematic AI images and videos. Generate, animate and export studio-quality visuals in minutes." },
      { property: "og:title", content: "ClipMotion — AI Image & Video Generation Studio" },
      { property: "og:description", content: "Turn prompts into cinematic AI images and videos. Generate, animate and export studio-quality visuals in minutes." },
    ],
  }),
  component: LandingPage,
});
