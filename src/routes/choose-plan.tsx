import { createFileRoute } from "@tanstack/react-router";
import ChoosePlanPage from "@/pages/ChoosePlanPage";

export const Route = createFileRoute("/choose-plan")({
  head: () => ({
    meta: [
      { title: "Choose Your Plan — ClipMotion" },
      { name: "description", content: "Pick the ClipMotion credit plan that fits your creative workflow." },
      { property: "og:title", content: "Choose Your Plan — ClipMotion" },
      { property: "og:description", content: "Pick the ClipMotion credit plan that fits your creative workflow." },
    ],
  }),
  component: ChoosePlanPage,
});
