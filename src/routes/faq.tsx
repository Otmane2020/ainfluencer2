import { createFileRoute } from "@tanstack/react-router";
import FAQPage from "@/pages/FAQPage";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — ClipMotion" },
      { name: "description", content: "Answers about credits, AI models, exports and commercial usage on ClipMotion." },
      { property: "og:title", content: "FAQ — ClipMotion" },
      { property: "og:description", content: "Answers about credits, AI models, exports and commercial usage on ClipMotion." },
    ],
  }),
  component: FAQPage,
});
