import { createFileRoute } from "@tanstack/react-router";
import ProjectDetail from "@/pages/ProjectDetail";

export const Route = createFileRoute("/_shell/projects/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectDetail />;
}
