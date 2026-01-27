import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { seoPages, blogArticleIdeas, organizationSchema } from "@/lib/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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
            Learn AI video creation strategies, motion design tips, and social media best practices.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {blogArticleIdeas.slice(0, 9).map((article) => (
              <Card key={article.slug} className="hover:shadow-glow transition-all hover:border-primary/30">
                <CardContent className="p-6">
                  <h2 className="font-display text-lg font-semibold mb-2 line-clamp-2">{article.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">AI video tips and tutorials</p>
                  <span className="text-primary text-sm flex items-center gap-1">Read article <ArrowRight className="h-4 w-4" /></span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default BlogPage;
