import { createFileRoute } from "@tanstack/react-router";
import TermsPage from "@/pages/TermsPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ClipMotion" },
      { name: "description", content: "Read the terms governing your use of the ClipMotion AI studio." },
      { property: "og:title", content: "Terms of Service — ClipMotion" },
      { property: "og:description", content: "Read the terms governing your use of the ClipMotion AI studio." },
    ],
  }),
  component: TermsPage,
});
