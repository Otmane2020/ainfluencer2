import { createFileRoute } from "@tanstack/react-router";
import InstagramReelsAIPage from "@/pages/blog/InstagramReelsAIPage";

export const Route = createFileRoute("/blog/instagram-reels-ai-generator")({
  head: () => ({
    meta: [
      { title: "Instagram Reels Ai Generator — ClipMotion" },
      { name: "description", content: "Instagram Reels Ai Generator guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Instagram Reels Ai Generator — ClipMotion" },
      { property: "og:description", content: "Instagram Reels Ai Generator guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: InstagramReelsAIPage,
});
