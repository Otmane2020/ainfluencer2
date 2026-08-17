import { createFileRoute } from "@tanstack/react-router";
import MotionDesignAIPage from "@/pages/MotionDesignAIPage";

export const Route = createFileRoute("/motion-design-ai")({
  head: () => ({
    meta: [
      { title: "Motion Design AI — ClipMotion" },
      { name: "description", content: "AI-powered motion design: animate stills, add camera moves and export in seconds." },
      { property: "og:title", content: "Motion Design AI — ClipMotion" },
      { property: "og:description", content: "AI-powered motion design: animate stills, add camera moves and export in seconds." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/motion-design-ai" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/motion-design-ai" }],
  }),
  component: MotionDesignAIPage,
});
