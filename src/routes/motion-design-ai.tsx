import { createFileRoute } from "@tanstack/react-router";
import MotionDesignAIPage from "@/pages/MotionDesignAIPage";

export const Route = createFileRoute("/motion-design-ai")({
  head: () => ({
    meta: [
      { title: "Motion Design AI — ClipMotion" },
      { name: "description", content: "AI-powered motion design: animate stills, add camera moves and export in seconds." },
      { property: "og:title", content: "Motion Design AI — ClipMotion" },
      { property: "og:description", content: "AI-powered motion design: animate stills, add camera moves and export in seconds." },
    ],
  }),
  component: MotionDesignAIPage,
});
