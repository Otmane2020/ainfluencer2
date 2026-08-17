import { createFileRoute } from "@tanstack/react-router";
import AIVideoAdsGeneratorPage from "@/pages/blog/AIVideoAdsGeneratorPage";

export const Route = createFileRoute("/blog/ai-video-ads-generator")({
  head: () => ({
    meta: [
      { title: "Ai Video Ads Generator — ClipMotion" },
      { name: "description", content: "Ai Video Ads Generator guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Ai Video Ads Generator — ClipMotion" },
      { property: "og:description", content: "Ai Video Ads Generator guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: AIVideoAdsGeneratorPage,
});
