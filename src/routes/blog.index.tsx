import { createFileRoute } from "@tanstack/react-router";
import BlogPage from "@/pages/BlogPage";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — AI Video & Image Guides | ClipMotion" },
      { name: "description", content: "Guides, comparisons and tutorials on AI video and image generation." },
      { property: "og:title", content: "Blog — AI Video & Image Guides | ClipMotion" },
      { property: "og:description", content: "Guides, comparisons and tutorials on AI video and image generation." },
    ],
  }),
  component: BlogPage,
});
