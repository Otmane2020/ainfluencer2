import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seoPages, softwareApplicationSchema, organizationSchema } from "@/lib/seo-data";
import { ArrowRight, Sparkles, ShoppingBag, Store, Briefcase, Camera, Layers, Globe } from "lucide-react";

const useCases = [
  {
    icon: ShoppingBag,
    title: "Shopify Sellers",
    subtitle: "Pro photos for every product page",
    description:
      "Refresh your full catalog without booking a studio. Upload a phone shot and get clean, on-brand images that lift conversion.",
    benefits: [
      "Square + portrait formats",
      "Background removal in 1 click",
      "On-brand consistent style",
      "Bulk catalog refresh",
    ],
    cta: "Loved by Shopify and WooCommerce sellers",
  },
  {
    icon: Store,
    title: "Amazon & Etsy Merchants",
    subtitle: "Marketplace-ready images that convert",
    description:
      "Generate marketplace-compliant product photos: white background hero shots plus lifestyle variants for the gallery.",
    benefits: [
      "Pure white background hero",
      "Lifestyle gallery shots",
      "Multi-angle variations",
      "High-res export",
    ],
    cta: "Built for Amazon, Etsy and eBay listings",
  },
  {
    icon: Layers,
    title: "DTC Brands",
    subtitle: "Scale your visual identity",
    description:
      "Stay consistent across hundreds of SKUs. Lock your brand colours, mood and lighting once — apply them everywhere.",
    benefits: [
      "Brand kit (colors + style)",
      "Seasonal campaign moods",
      "Consistent lighting",
      "Team workspaces",
    ],
    cta: "Trusted by DTC brands worldwide",
  },
  {
    icon: Camera,
    title: "Content Creators",
    subtitle: "Pro-looking shots without a studio",
    description:
      "Influencers and small creators can produce polished product photos for affiliate posts and brand collabs in minutes.",
    benefits: [
      "Phone photo → pro shot",
      "Lifestyle scenes",
      "Instagram + TikTok formats",
      "Free trial credits",
    ],
    cta: "Perfect for affiliate creators",
  },
  {
    icon: Briefcase,
    title: "Marketing Agencies",
    subtitle: "Deliver more shoots, faster",
    description:
      "Replace expensive product photoshoots. Spin up dozens of variations for A/B testing static ads on Meta, TikTok and Google.",
    benefits: [
      "Unlimited ad variations",
      "Client workspaces",
      "Brand kit management",
      "Approval workflows",
    ],
    cta: "Agency pricing available",
  },
  {
    icon: Globe,
    title: "Marketplaces & Catalogs",
    subtitle: "Standardise thousands of SKUs",
    description:
      "Normalise product imagery across vendors and categories. Same lighting, same crop, same background — at scale.",
    benefits: [
      "API access",
      "Bulk catalog ingestion",
      "Consistent crop & lighting",
      "Automated QA",
    ],
    cta: "Enterprise / API plan",
  },
];

const UseCasesPage = () => {
  const navigate = useNavigate();
  const seo = seoPages.useCases;

  return (
    <PublicPageLayout>
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        keywords={seo.keywords}
        structuredData={[softwareApplicationSchema, organizationSchema]}
      />

      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              AI Product Shots for <span className="text-gradient">Every Seller</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              See how Shopify stores, marketplaces, DTC brands and agencies use ClipMotion to produce pro product photography at scale.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-glow transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-primary">
                      <useCase.icon className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="font-display text-xl font-semibold mb-1">{useCase.title}</h2>
                    <p className="text-primary text-sm mb-3">{useCase.subtitle}</p>
                    <p className="text-muted-foreground mb-4">{useCase.description}</p>
                    <ul className="space-y-2 mb-4">
                      {useCase.benefits.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-sm">
                          <Sparkles className="h-4 w-4 text-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground italic">{useCase.cta}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Product Photos?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of sellers using ClipMotion to ship pro product imagery — without a studio.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary">
            Try Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default UseCasesPage;
