import { ReactNode } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { organizationSchema, SITE_URL } from "@/lib/seo-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Link } from "@/lib/router-compat";

interface RelatedArticle {
  slug: string;
  title: string;
  description: string;
}

interface BlogArticleLayoutProps {
  title: ReactNode;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  slug: string;
  breadcrumbLabel: string;
  publishDate: string;
  updateDate: string;
  readTime: string;
  category: string;
  children: ReactNode;
  relatedArticles?: RelatedArticle[];
}

export const BlogArticleLayout = ({
  title,
  seoTitle,
  seoDescription,
  seoKeywords,
  slug,
  breadcrumbLabel,
  publishDate,
  updateDate,
  readTime,
  category,
  children,
  relatedArticles = [],
}: BlogArticleLayoutProps) => {
  const canonical = `${SITE_URL}/blog/${slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: seoTitle,
    description: seoDescription,
    image: `${SITE_URL}/og-image.png`,
    author: { "@type": "Organization", name: "ClipMotion" },
    publisher: {
      "@type": "Organization",
      name: "ClipMotion",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    datePublished: publishDate,
    dateModified: updateDate,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    keywords: seoKeywords,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: breadcrumbLabel, item: canonical },
    ],
  };

  return (
    <PublicPageLayout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        keywords={seoKeywords}
        ogType="article"
        structuredData={[articleSchema, breadcrumbSchema, organizationSchema]}
      />

      <article className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{breadcrumbLabel}</span>
          </nav>

          {/* Meta */}
          <header className="mb-12">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">{category}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> {updateDate}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {readTime}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {title}
            </h1>
          </header>

          {/* Content */}
          <div className="prose prose-lg prose-invert max-w-none">
            {children}
          </div>

          {/* CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
              Ready to Create AI Videos?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join thousands of creators using ClipMotion to produce professional video content in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="font-semibold">
                <Link to="/auth">
                  Start Creating Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <aside className="mt-16 pt-8 border-t border-border">
              <h2 className="font-display text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedArticles.map((article) => (
                  <Link key={article.slug} to={`/blog/${article.slug}`} className="group">
                    <Card className="p-4 hover:border-primary/30 transition-all hover:shadow-glow h-full">
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">{article.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </div>
      </article>
    </PublicPageLayout>
  );
};
