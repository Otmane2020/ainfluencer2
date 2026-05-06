import { useEffect } from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "Main",
    links: [
      { href: "/", label: "Home" },
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/use-cases", label: "Use Cases" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/demo", label: "Demo" },
    ],
  },
  {
    title: "Blog",
    links: [
      { href: "/blog", label: "Blog Index" },
      { href: "/blog/ai-product-photography-guide", label: "AI Product Photography Guide" },
      { href: "/blog/shopify-product-photos-with-ai", label: "Shopify Product Photos with AI" },
      { href: "/blog/lifestyle-product-shots-ai", label: "Lifestyle Product Shots AI" },
      { href: "/blog/background-removal-ai", label: "Background Removal AI" },
      { href: "/blog/batch-product-images-ai", label: "Batch Product Images AI" },
      { href: "/blog/best-ai-product-shot-tools-2026", label: "Best AI Product Shot Tools 2026" },
    ],
  },
  {
    title: "App",
    links: [
      { href: "/auth", label: "Sign in / Sign up" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/product-shots", label: "Product Shots" },
      { href: "/projects", label: "Projects" },
      { href: "/campaigns", label: "Campaigns" },
      { href: "/calendar", label: "Calendar" },
      { href: "/posts", label: "Posts" },
      { href: "/history", label: "History" },
      { href: "/integrations", label: "Integrations" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function SitemapPage() {
  useEffect(() => {
    document.title = "Sitemap | ClipMotion.AI";
    const desc = "Full sitemap of ClipMotion.AI — browse every page: features, pricing, blog articles, app sections and legal documents.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://clipmotion.ai/sitemap");
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Sitemap</h1>
          <p className="mt-3 text-muted-foreground">
            All pages of ClipMotion.AI in one place. Looking for the XML version?{" "}
            <a href="/sitemap.xml" className="text-primary underline">/sitemap.xml</a>
          </p>
        </header>

        <div className="grid gap-10 sm:grid-cols-2">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-4 text-xl font-semibold">{s.title}</h2>
              <ul className="space-y-2">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className="text-foreground/80 hover:text-primary transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
