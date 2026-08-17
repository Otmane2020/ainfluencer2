import { createFileRoute } from "@tanstack/react-router";
import FeaturesPage from "@/pages/FeaturesPage";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — ClipMotion AI Studio" },
      { name: "description", content: "Explore ClipMotion features: text-to-image, image-to-video, motion control, camera moves and instant export." },
      { property: "og:title", content: "Features — ClipMotion AI Studio" },
      { property: "og:description", content: "Explore ClipMotion features: text-to-image, image-to-video, motion control, camera moves and instant export." },
    ],
  }),
  component: FeaturesPage,
});
