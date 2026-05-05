import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { seoPages, organizationSchema } from "@/lib/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const blogArticles = [
  {
    slug: "ai-product-photography-guide",
    title: "AI Product Photography in 2026: The Complete Guide",
    description: "Everything you need to know to replace expensive product shoots with AI.",
    category: "Ultimate Guide",
  },
  {
    slug: "shopify-product-photos-with-ai",
    title: "How to Create Shopify Product Photos with AI",
    description: "A step-by-step playbook for Shopify sellers — formats, lighting, conversion tips.",
    category: "Shopify Strategy",
  },
  {
    slug: "lifestyle-product-shots-ai",
    title: "Lifestyle Product Shots with AI (Without a Studio)",
    description: "Drop your product into kitchens, beaches, lofts — realistic AI lifestyle scenes.",
    category: "Tutorial",
  },
  {
    slug: "background-removal-ai",
    title: "AI Background Removal for E-commerce",
    description: "Clean cutouts, sharp edges, marketplace-ready white-background shots.",
    category: "How-to",
  },
  {
    slug: "batch-product-images-ai",
    title: "Generate 100s of Product Images in Minutes with AI",
    description: "Bulk process your full catalog with brand-consistent, on-brand product photos.",
    category: "Workflow",
  },
  {
    slug: "best-ai-product-shot-tools-2026",
    title: "10 Best AI Product Shot Generators in 2026 (Comparison)",
    description: "We compare the leading product shot tools — features, pricing, image quality.",
    category: "Comparison",
  },
];

const BlogPage = () => {
  const seo = seoPages.blog;

  return (
    <PublicPageLayout>
      <SEOHead title={seo.title} description={seo.description} canonical={seo.canonical} keywords={seo.keywords} structuredData={[organizationSchema]} />
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-center">
            ClipMotion <span className="text-gradient">Blog</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-center mb-12">
            Tips, tutorials and strategies to ship better product photos — and sell more.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {blogArticles.map((article) => (
              <Link key={article.slug} to={`/blog/${article.slug}`}>
                <Card className="hover:shadow-glow transition-all hover:border-primary/30 h-full">
                  <CardContent className="p-6">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{article.category}</span>
                    <h2 className="font-display text-lg font-semibold mb-2 mt-3 line-clamp-2">{article.title}</h2>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{article.description}</p>
                    <span className="text-primary text-sm flex items-center gap-1">Read article <ArrowRight className="h-4 w-4" /></span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default BlogPage;
