import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — ClipMotion" },
      { name: "description", content: "Sign in or create your ClipMotion account to start generating AI visuals." },
      { property: "og:title", content: "Sign In — ClipMotion" },
      { property: "og:description", content: "Sign in or create your ClipMotion account to start generating AI visuals." },
    ],
  }),
  component: Auth,
});
