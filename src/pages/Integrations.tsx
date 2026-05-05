import { Card, CardContent } from "@/components/ui/card";
import { Plug, ExternalLink } from "lucide-react";
import { StoreIntegrations } from "@/components/integrations/StoreIntegrations";

const Integrations = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect your e-commerce stores to import products and push AI product shots back to your catalog.
        </p>
      </div>

      <StoreIntegrations />

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-3">
          <Plug className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">
              More integrations coming soon: BigCommerce, Wix, Squarespace, Magento, Amazon Seller, Etsy...
            </p>
            <a
              href="mailto:support@clipmotion.ai"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              Request an integration <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
