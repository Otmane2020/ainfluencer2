import { createFileRoute } from "@tanstack/react-router";
import TikTokCallbackPage from "@/pages/TikTokCallbackPage";

export const Route = createFileRoute("/api/tiktok/callback")({
  head: () => ({
    meta: [
      { title: "Callback — ClipMotion" },
      { name: "description", content: "Callback guide and insights from ClipMotion, the AI image and video studio." },
      { property: "og:title", content: "Callback — ClipMotion" },
      { property: "og:description", content: "Callback guide and insights from ClipMotion, the AI image and video studio." },
    ],
  }),
  component: TikTokCallbackPage,
});
