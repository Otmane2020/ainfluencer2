import { createFileRoute } from "@tanstack/react-router";
import HiggsfieldStudio from "@/pages/HiggsfieldStudio";

export const Route = createFileRoute("/_shell/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HiggsfieldStudio defaultTab="product-motion" />;
}
