import { createFileRoute } from "@tanstack/react-router";
import Videos from "@/pages/Videos";

export const Route = createFileRoute("/_shell/videos-legacy")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Videos />;
}
