import { createFileRoute } from "@tanstack/react-router";
import SmartImagePage from "@/pages/SmartImagePage";

export const Route = createFileRoute("/_shell/smart-image")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SmartImagePage />;
}
