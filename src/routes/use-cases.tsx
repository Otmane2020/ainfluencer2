import { createFileRoute } from "@tanstack/react-router";
import UseCasesPage from "@/pages/UseCasesPage";

export const Route = createFileRoute("/use-cases")({
  head: () => ({
    meta: [
      { title: "Use Cases — ClipMotion AI Studio" },
      { name: "description", content: "See how brands use ClipMotion for ads, product shots, social clips and creative storytelling." },
      { property: "og:title", content: "Use Cases — ClipMotion AI Studio" },
      { property: "og:description", content: "See how brands use ClipMotion for ads, product shots, social clips and creative storytelling." },
    ],
  }),
  component: UseCasesPage,
});
