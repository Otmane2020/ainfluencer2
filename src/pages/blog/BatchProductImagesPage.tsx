import { BlogArticleLayout } from "@/components/blog/BlogArticleLayout";
import { Card } from "@/components/ui/card";
import { Layers, CheckCircle2 } from "lucide-react";

const BatchProductImagesPage = () => (
  <BlogArticleLayout
    title={<>Generate <span className="text-gradient">100s of Product Images</span> in Minutes with AI</>}
    seoTitle="Batch Product Image Generation with AI | ClipMotion"
    seoDescription="Process your full e-commerce catalog at once. Generate hundreds of brand-consistent product images with AI batch mode — perfect for Shopify, marketplaces and DTC brands."
    seoKeywords="batch product images, bulk product photos, catalog photos AI, product image automation"
    slug="batch-product-images-ai"
    breadcrumbLabel="Batch Product Images with AI"
    publishDate="2026-03-01"
    updateDate="2026-05-01"
    readTime="6 min read"
    category="Workflow"
    relatedArticles={[
      { slug: "shopify-product-photos-with-ai", title: "Shopify Product Photos", description: "Step-by-step playbook" },
      { slug: "ai-product-photography-guide", title: "AI Product Photography Guide", description: "Complete 2026 overview" },
    ]}
  >
    <p className="text-xl text-muted-foreground leading-relaxed mb-8">
      You don't have time to shoot 200 SKUs one by one. Batch mode lets you queue your full catalog and walk away — your product gallery refreshed before lunch.
    </p>

    <section className="mb-14">
      <h2 className="font-display text-3xl font-bold mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Layers className="h-6 w-6 text-primary" /></div>
        How batch mode works
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Upload many photos", desc: "Drag and drop up to 20 products per batch." },
          { title: "Lock your style", desc: "Pick a single style + brand kit — applied to every product." },
          { title: "Export in bulk", desc: "Download a zip with HD images for every SKU and format." },
        ].map((it, i) => (
          <Card key={i} className="p-4"><h3 className="font-semibold mb-1">{it.title}</h3><p className="text-sm text-muted-foreground">{it.desc}</p></Card>
        ))}
      </div>
    </section>

    <section className="mb-14">
      <h2 className="font-display text-3xl font-bold mb-6">Best practices for catalog refreshes</h2>
      <ul className="space-y-4">
        {[
          "Group SKUs by category — same style suits same product family.",
          "Use the same lighting/scene per category to keep the catalog cohesive.",
          "Run a quarterly batch refresh to keep your storefront looking fresh.",
          "Export a marketplace-compliant white-background version + lifestyle gallery in the same job.",
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

export default BatchProductImagesPage;
