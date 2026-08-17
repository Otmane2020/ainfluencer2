import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ClipMotion" },
      { name: "description", content: "How ClipMotion collects, stores and protects your data." },
      { property: "og:title", content: "Privacy Policy — ClipMotion" },
      { property: "og:description", content: "How ClipMotion collects, stores and protects your data." },
    ],
  }),
  component: PrivacyPolicyPage,
});
