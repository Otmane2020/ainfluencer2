import { createFileRoute } from "@tanstack/react-router";
import UseCasesPage from "@/pages/UseCasesPage";

export const Route = createFileRoute("/use-cases")({
  head: () => ({
    meta: [
      { title: "Use Cases — ClipMotion AI Studio" },
      { name: "description", content: "See how brands use ClipMotion for ads, product shots, social clips and creative storytelling." },
      { property: "og:title", content: "Use Cases — ClipMotion AI Studio" },
      { property: "og:description", content: "See how brands use ClipMotion for ads, product shots, social clips and creative storytelling." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/use-cases" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/use-cases" }],
  }),
  component: UseCasesPage,
});
