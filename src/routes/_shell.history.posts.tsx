import { createFileRoute } from "@tanstack/react-router";
import PostHistoryPage from "@/pages/PostHistoryPage";

export const Route = createFileRoute("/_shell/history/posts")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PostHistoryPage />;
}
