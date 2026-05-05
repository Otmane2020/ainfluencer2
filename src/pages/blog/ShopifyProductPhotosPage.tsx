import { BlogArticleLayout } from "@/components/blog/BlogArticleLayout";
import { Card } from "@/components/ui/card";
import { ShoppingBag, CheckCircle2 } from "lucide-react";

const ShopifyProductPhotosPage = () => (
  <BlogArticleLayout
    title={<>How to Create <span className="text-gradient">Shopify Product Photos</span> with AI</>}
    seoTitle="Shopify Product Photos with AI – Step-by-Step Guide | ClipMotion"
    seoDescription="Step-by-step guide for Shopify sellers: generate pro product photos with AI, optimise formats, lift conversion and refresh your full catalog in minutes."
    seoKeywords="Shopify product photos, AI Shopify images, ecommerce photography, product shot AI, Shopify conversion"
    slug="shopify-product-photos-with-ai"
    breadcrumbLabel="Shopify Product Photos with AI"
    publishDate="2026-02-08"
    updateDate="2026-05-01"
    readTime="7 min read"
    category="Shopify Strategy"
    relatedArticles={[
      { slug: "ai-product-photography-guide", title: "AI Product Photography Guide", description: "The complete 2026 overview" },
      { slug: "background-removal-ai", title: "AI Background Removal", description: "Clean cutouts in one click" },
      { slug: "batch-product-images-ai", title: "Batch Product Images", description: "Process 100s of SKUs at once" },
    ]}
  >
    <p className="text-xl text-muted-foreground leading-relaxed mb-8">
      Your Shopify product photos are your storefront. Better images mean higher add-to-cart and lower return rates. Here is how to generate them with AI in minutes, not weeks.
    </p>

    <section className="mb-14">
      <h2 className="font-display text-3xl font-bold mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><ShoppingBag className="h-6 w-6 text-primary" /></div>
        The Shopify image checklist
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Hero image (square 2048px)", desc: "Clean white background, centered product, generous padding." },
          { title: "Lifestyle gallery (3–5 images)", desc: "Show context, scale and how the product is used." },
          { title: "Detail shots", desc: "Materials, textures, finishes — what photos can't show in wide angles." },
          { title: "Mobile-first portrait", desc: "9:16 variant for the Shopify mobile gallery and ads." },
        ].map((it, i) => (
          <Card key={i} className="p-4"><h3 className="font-semibold mb-1">{it.title}</h3><p className="text-sm text-muted-foreground">{it.desc}</p></Card>
        ))}
      </div>
    </section>

    <section className="mb-14">
      <h2 className="font-display text-3xl font-bold mb-6">Step-by-step workflow</h2>
      <ol className="space-y-4 list-decimal list-inside text-muted-foreground">
        <li><strong className="text-foreground">Upload one source photo</strong> per product (a phone shot works).</li>
        <li><strong className="text-foreground">Pick a style</strong>: pure studio, lifestyle, seasonal mood…</li>
        <li><strong className="text-foreground">Generate 10 variants</strong> in about 2 minutes.</li>
        <li><strong className="text-foreground">Export</strong> in Shopify-friendly sizes (2048×2048, 1080×1350).</li>
        <li><strong className="text-foreground">Bulk upload</strong> to your product pages and watch CTR climb.</li>
      </ol>
    </section>

    <section className="mb-14">
      <h2 className="font-display text-3xl font-bold mb-6">Pro tips for Shopify sellers</h2>
      <ul className="space-y-4">
        {[
          "Always keep one true white-background hero — it's the highest-converting first image.",
          "Use lifestyle shots in positions 2–4 to build emotional context.",
          "Add a detail/macro shot at the end to reinforce quality perception.",
          "Re-generate seasonal variants 4× a year (spring, summer, fall, holidays).",
          "Test square vs portrait crops on mobile — the lift can be 10–20% on add-to-cart.",
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

export default ShopifyProductPhotosPage;
