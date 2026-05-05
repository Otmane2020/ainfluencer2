import { BlogArticleLayout } from "@/components/blog/BlogArticleLayout";
import { Card } from "@/components/ui/card";
import { Scissors, CheckCircle2 } from "lucide-react";

const BackgroundRemovalAIPage = () => (
  <BlogArticleLayout
    title={<>AI <span className="text-gradient">Background Removal</span> for E-commerce</>}
    seoTitle="AI Background Removal for E-commerce – Clean Cutouts in 1 Click | ClipMotion"
    seoDescription="Remove backgrounds from product photos with AI. Marketplace-compliant white background, sharp edges, no manual masking. Built for Shopify, Amazon and Etsy."
    seoKeywords="AI background removal, remove background, product cutout, white background photo, transparent product image"
    slug="background-removal-ai"
    breadcrumbLabel="AI Background Removal"
    publishDate="2026-02-22"
    updateDate="2026-05-01"
    readTime="5 min read"
    category="How-to"
    relatedArticles={[
      { slug: "shopify-product-photos-with-ai", title: "Shopify Product Photos", description: "Optimised hero images for Shopify" },
      { slug: "batch-product-images-ai", title: "Batch Product Images", description: "Bulk-cutout your full catalog" },
    ]}
  >
    <p className="text-xl text-muted-foreground leading-relaxed mb-8">
      Manual background removal eats hours per week. AI cutouts run in seconds, with edges clean enough for Amazon's marketplace rules and Shopify's hero positions.
    </p>

    <section className="mb-14">
      <h2 className="font-display text-3xl font-bold mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Scissors className="h-6 w-6 text-primary" /></div>
        Why automated cutouts win
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Sharp edges", desc: "Hair, fur, mesh and transparent materials handled cleanly." },
          { title: "Pure white", desc: "Marketplace-compliant #FFFFFF, ready for Amazon and Etsy." },
          { title: "Transparent PNG", desc: "Drop into ads, banners and social posts without recropping." },
        ].map((it, i) => (
          <Card key={i} className="p-4"><h3 className="font-semibold mb-1">{it.title}</h3><p className="text-sm text-muted-foreground">{it.desc}</p></Card>
        ))}
      </div>
    </section>

    <section className="mb-14">
      <h2 className="font-display text-3xl font-bold mb-6">Best practices</h2>
      <ul className="space-y-4">
        {[
          "Shoot against a contrasting background for the cleanest auto-cutout.",
          "Avoid heavy shadows on the background — they confuse most cutout models.",
          "Export both transparent PNG and pure-white JPG for different use cases.",
          "Use the cutout as a base, then re-place the product into lifestyle scenes for variation.",
        ].map((tip, i) => (
          <li key={i} className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  </BlogArticleLayout>
);

export default BackgroundRemovalAIPage;
