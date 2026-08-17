import { createFileRoute } from "@tanstack/react-router";
import TikTokVideosWithAIPage from "@/pages/blog/TikTokVideosWithAIPage";

export const Route = createFileRoute("/blog/tiktok-videos-with-ai")({
  head: () => ({
    meta: [
      { title: "Tiktok Videos With Ai — ClipMotion" },
      { name: "description", content: "Tiktok Videos With Ai guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Tiktok Videos With Ai — ClipMotion" },
      { property: "og:description", content: "Tiktok Videos With Ai guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: TikTokVideosWithAIPage,
});
