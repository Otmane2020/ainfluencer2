import { createFileRoute } from "@tanstack/react-router";
import Posts from "@/pages/Posts";

export const Route = createFileRoute("/_shell/posts")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Posts />;
}
