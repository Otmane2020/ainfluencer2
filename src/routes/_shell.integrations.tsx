import { createFileRoute } from "@tanstack/react-router";
import Integrations from "@/pages/Integrations";

export const Route = createFileRoute("/_shell/integrations")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Integrations />;
}
