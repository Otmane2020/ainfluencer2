import { createFileRoute } from "@tanstack/react-router";
import HistoryPage from "@/pages/HistoryPage";

export const Route = createFileRoute("/_shell/history")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HistoryPage />;
}
