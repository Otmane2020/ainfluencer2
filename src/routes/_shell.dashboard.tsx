import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/_shell/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Dashboard />;
}
