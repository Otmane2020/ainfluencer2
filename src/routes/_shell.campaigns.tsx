import { createFileRoute } from "@tanstack/react-router";
import CampaignsPage from "@/pages/CampaignsPage";

export const Route = createFileRoute("/_shell/campaigns")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CampaignsPage />;
}
