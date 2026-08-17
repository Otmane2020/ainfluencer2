import { createFileRoute } from "@tanstack/react-router";
import TermsPage from "@/pages/TermsPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ClipMotion" },
      { name: "description", content: "Read the terms governing your use of the ClipMotion AI studio." },
      { property: "og:title", content: "Terms of Service — ClipMotion" },
      { property: "og:description", content: "Read the terms governing your use of the ClipMotion AI studio." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/terms" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/terms" }],
  }),
  component: TermsPage,
});
