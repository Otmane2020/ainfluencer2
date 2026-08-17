import { createFileRoute } from "@tanstack/react-router";
import CalendarPage from "@/pages/CalendarPage";

export const Route = createFileRoute("/_shell/calendar")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CalendarPage />;
}
