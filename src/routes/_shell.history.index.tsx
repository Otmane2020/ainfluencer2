import { createFileRoute } from "@tanstack/react-router";
import LibraryPage from "@/pages/LibraryPage";

export const Route = createFileRoute("/_shell/history/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <LibraryPage />;
}
