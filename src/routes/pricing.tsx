import { createFileRoute } from "@tanstack/react-router";
import PricingPage from "@/pages/PricingPage";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ClipMotion AI Studio" },
      { name: "description", content: "Simple credit-based pricing for AI image and video generation. Starter, Pro and Business plans." },
      { property: "og:title", content: "Pricing — ClipMotion AI Studio" },
      { property: "og:description", content: "Simple credit-based pricing for AI image and video generation. Starter, Pro and Business plans." },
    ],
  }),
  component: PricingPage,
});
