import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { seoPages, organizationSchema } from "@/lib/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/router-compat";

const blogArticles = [
  {
    slug: "kling-video-ai",
    title: "Kling 2.6 Video AI: The Ultimate Guide to AI Video Generation",
    description: "Master Kling 2.6 for text-to-video, image-to-video, and video-to-video generation.",
    category: "AI Model Deep Dive",
  },
  {
    slug: "kling-image-ai",
    title: "Kling Image AI: Create Stunning Visuals with AI",
    description: "Generate professional AI images for product photography, social media, and branding.",
    category: "AI Model Deep Dive",
  },
  {
    slug: "sora-ai-video-generator",
    title: "Sora AI Video Generator by OpenAI: Complete Guide",
    description: "Everything about OpenAI Sora 2—capabilities, tips, and how to use it on ClipMotion.",
    category: "AI Model Deep Dive",
  },
  {
    slug: "nano-banana-video-guide",
    title: "Nano Banana Video: Ultra-Fast AI Video Creation",
    description: "Create TikTok, Reels, and Shorts in seconds with Nano Banana's lightning-fast pipeline.",
    category: "Product Guide",
  },
  {
    slug: "nano-banana-pro",
    title: "Nano Banana Pro: Professional-Grade AI Video for Brands",
    description: "Multi-scene storytelling, brand consistency, and premium AI models for agencies.",
    category: "Product Guide",
  },
  {
    slug: "best-ai-video-generators-2026",
    title: "10 Best AI Video Generators in 2026 (Comprehensive Comparison)",
    description: "Compare ClipMotion, Sora, Kling, Runway, and more—ranked and reviewed.",
    category: "Comparison Guide",
  },
  {
    slug: "text-to-video-ai-complete-guide",
    title: "Text to Video AI: The Complete 2026 Guide for Beginners",
    description: "Learn to write effective prompts and choose the right AI model for your videos.",
    category: "Tutorial",
  },
  {
    slug: "ai-video-ads-generator",
    title: "AI Video Ads Generator: Create High-Converting Ads in Minutes",
    description: "Generate Facebook, Instagram, and TikTok video ads at a fraction of the cost.",
    category: "Marketing Strategy",
  },
  {
    slug: "tiktok-videos-with-ai",
    title: "Create Viral TikTok Videos with AI: 2026 Strategy Guide",
    description: "Automate your TikTok content with AI—formats, schedules, and viral strategies.",
    category: "Social Media Strategy",
  },
  {
    slug: "instagram-reels-ai-generator",
    title: "Instagram Reels AI Generator: Automate Your Content",
    description: "Generate and schedule Instagram Reels at scale with AI automation.",
    category: "Social Media Strategy",
  },
  {
    slug: "ai-video-for-ecommerce",
    title: "AI Video for E-commerce: Boost Sales with Product Videos",
    description: "Product demos, unboxing content, and shoppable videos powered by AI.",
    category: "E-commerce Strategy",
  },
  {
    slug: "clip-motion",
    title: "Clip Motion: The Complete Guide to AI Video Creation",
    description: "Everything you need to know about ClipMotion's AI-powered platform.",
    category: "Ultimate Guide",
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
            Learn AI video creation strategies, motion design tips, and social media best practices.
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
