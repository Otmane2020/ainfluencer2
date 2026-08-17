import { createFileRoute } from "@tanstack/react-router";
import ContactPage from "@/pages/ContactPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — ClipMotion" },
      { name: "description", content: "Get in touch with the ClipMotion team for support, billing or partnerships." },
      { property: "og:title", content: "Contact — ClipMotion" },
      { property: "og:description", content: "Get in touch with the ClipMotion team for support, billing or partnerships." },
    ],
  }),
  component: ContactPage,
});
