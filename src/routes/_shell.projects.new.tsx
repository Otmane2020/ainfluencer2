import { createFileRoute } from "@tanstack/react-router";
import ProjectNew from "@/pages/ProjectNew";

export const Route = createFileRoute("/_shell/projects/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectNew />;
}
