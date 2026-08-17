import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ClipMotion" },
      { name: "description", content: "How ClipMotion collects, stores and protects your data." },
      { property: "og:title", content: "Privacy Policy — ClipMotion" },
      { property: "og:description", content: "How ClipMotion collects, stores and protects your data." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://clipmotion.ai/privacy-policy" },
      { property: "og:image", content: "https://clipmotion.ai/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://clipmotion.ai/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://clipmotion.ai/privacy-policy" }],
  }),
  component: PrivacyPolicyPage,
});
