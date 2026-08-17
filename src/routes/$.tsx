import { createFileRoute } from "@tanstack/react-router";
import NotFound from "@/pages/NotFound";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page not found — ClipMotion" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFound,
});
