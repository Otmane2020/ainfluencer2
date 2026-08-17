import { createFileRoute } from "@tanstack/react-router";
import ProductShotsPage from "@/pages/ProductShotsPage";

export const Route = createFileRoute("/_shell/product-shots")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProductShotsPage />;
}
