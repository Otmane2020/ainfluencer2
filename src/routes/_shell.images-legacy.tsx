import { createFileRoute } from "@tanstack/react-router";
import Images from "@/pages/Images";

export const Route = createFileRoute("/_shell/images-legacy")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Images />;
}
