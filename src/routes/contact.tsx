import { createFileRoute } from "@tanstack/react-router";
import ContactPage from "@/pages/ContactPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — ClipMotion" },
      { name: "description", content: "Get in touch with the ClipMotion team for support, billing or partnerships." },
      { property: "og:title", content: "Contact — ClipMotion" },
      { property: "og:description", content: "Get in touch with the ClipMotion team for support, billing or partnerships." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/contact" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/contact" }],
  }),
  component: ContactPage,
});
