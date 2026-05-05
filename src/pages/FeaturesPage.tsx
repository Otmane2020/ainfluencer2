import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seoPages, softwareApplicationSchema, organizationSchema } from "@/lib/seo-data";
import {
  Camera, Scissors, Layers, Smartphone, Globe, Palette, Wand2,
  Image as ImageIcon, Sparkles, Zap, Download, Shield, ArrowRight, Check
} from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "1 photo → 10 pro product shots",
    description: "Upload one ordinary product photo. Our AI generates 10 high-converting visuals ready for your store, ads and social.",
    benefits: ["HD output", "Multiple angles", "Instant variations"],
  },
  {
    icon: Scissors,
    title: "Automatic background removal",
    description: "AI detects your product and removes the background in one click. Clean cutouts with sharp, natural edges.",
    benefits: ["One-click cutout", "Sharp edges", "Transparent PNG"],
  },
  {
    icon: Globe,
    title: "Lifestyle scene placement",
    description: "Place your product into realistic lifestyle scenes: living room, beach, office, kitchen and 20+ more environments.",
    benefits: ["20+ scenes", "Realistic lighting", "Brand-consistent mood"],
  },
  {
    icon: Smartphone,
    title: "Multi-platform formats",
    description: "Square for Instagram, portrait for TikTok, landscape for banners — every shot is auto-formatted for the platform you sell on.",
    benefits: ["Square / 9:16 / 16:9", "Shopify-ready", "Amazon-compliant"],
  },
  {
    icon: Layers,
    title: "Batch — full catalog at once",
    description: "Upload up to 20 products in a single session and generate hundreds of images while you focus on selling.",
    benefits: ["Up to 20 products", "Bulk export", "Consistent style"],
  },
  {
    icon: Palette,
    title: "20+ professional styles",
    description: "Studio shot, lifestyle, colored backdrop, seasonal mood, minimalist… choose the look that matches your brand.",
    benefits: ["Studio & lifestyle", "Seasonal moods", "Brand presets"],
  },
  {
    icon: Wand2,
    title: "Smart angle generation",
    description: "Front, 45°, side profile, top-down and macro detail. Every angle a buyer needs to make the decision.",
    benefits: ["Front / 45° / profile", "Macro detail", "Top-down view"],
  },
  {
    icon: ImageIcon,
    title: "Color & material variations",
    description: "Show every color, finish or material variation of your product without re-shooting it.",
    benefits: ["Color swaps", "Material edits", "Same composition"],
  },
  {
    icon: Sparkles,
    title: "AI light & shadow correction",
    description: "Fix bad phone lighting and harsh shadows automatically. Your product looks like it came out of a real studio.",
    benefits: ["Auto re-lighting", "Shadow cleanup", "True colors"],
  },
  {
    icon: Zap,
    title: "Result in under 2 minutes",
    description: "From upload to final images in less than two minutes — no photographer, no studio, no editing skills required.",
    benefits: ["< 2 min generation", "No setup", "Priority queue"],
  },
  {
    icon: Download,
    title: "Ready to publish",
    description: "Export directly in the formats your storefront expects: Shopify, WooCommerce, Amazon, Instagram, TikTok and more.",
    benefits: ["HD downloads", "Storefront formats", "One-click export"],
  },
  {
    icon: Shield,
    title: "Brand safety & consistency",
    description: "Lock your brand colors, mood and composition so every product image feels like it belongs to the same gallery.",
    benefits: ["Brand presets", "Style lock", "Consistent gallery"],
  },
];

const FeaturesPage = () => {
  const navigate = useNavigate();
  const seo = seoPages.features;

  return (
    <PublicPageLayout>
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        keywords={seo.keywords}
        structuredData={[softwareApplicationSchema, organizationSchema]}
      />

      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Powerful <span className="text-gradient">AI features</span> for product photography
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              ClipMotion · Product Shot AI turns one ordinary product photo into a full gallery of high-converting visuals — no photographer, no studio.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="gradient-primary shadow-glow"
            >
              Try Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-glow transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-primary">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <ul className="space-y-1">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to refresh your product gallery?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start free today and see how ClipMotion · Product Shot AI can transform your e-commerce visuals in minutes.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary">
            <Wand2 className="mr-2 h-5 w-5" /> Get started free
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default FeaturesPage;
