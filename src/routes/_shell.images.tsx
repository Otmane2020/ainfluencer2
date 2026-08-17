import { createFileRoute } from "@tanstack/react-router";
import HiggsfieldStudio from "@/pages/HiggsfieldStudio";

export const Route = createFileRoute("/_shell/images")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HiggsfieldStudio defaultTab="text-to-image" />;
}
