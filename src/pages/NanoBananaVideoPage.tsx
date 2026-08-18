import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { organizationSchema, SITE_URL } from "@/lib/seo-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router-compat";
import { 
  Zap, 
  Video, 
  Sparkles, 
  Clock, 
  Globe, 
  Check, 
  ArrowRight,
  Star,
  Play,
  Layers,
  Wand2,
  Target,
  TrendingUp
} from "lucide-react";

// Nano Banana Video specific structured data
const nanoBananaArticleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Nano Banana Video: AI Video Generation for Short-Form Content",
  description: "Nano Banana Video is an AI-powered video generation technology that creates ultra-fast, high-quality short videos for TikTok, Instagram Reels, and YouTube Shorts.",
  image: `${SITE_URL}/og-image.png`,
  author: {
    "@type": "Organization",
    name: "ClipMotion",
  },
  publisher: {
    "@type": "Organization",
    name: "ClipMotion",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
  },
  datePublished: "2026-01-30",
  dateModified: "2026-01-30",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `${SITE_URL}/nanobananavideo`,
  },
};

const nanoBananaProductSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Nano Banana Video Generator",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: `${SITE_URL}/nanobananavideo`,
  description: "Nano Banana Video is the fastest AI video generator for short-form content. Create TikTok videos, Instagram Reels, and YouTube Shorts in seconds with advanced AI technology.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Plans from $19/mo",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "47500",
    bestRating: "5",
    worstRating: "1",
  },
};

const nanoBananaFAQSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Nano Banana Video?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nano Banana Video is an AI-powered video generation technology developed by ClipMotion that creates ultra-fast, high-quality short-form videos. It uses advanced neural networks optimized for quick rendering while maintaining professional quality, making it perfect for TikTok, Instagram Reels, and YouTube Shorts.",
      },
    },
    {
      "@type": "Question",
      name: "How fast can Nano Banana Video generate videos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nano Banana Video can generate a complete short-form video in as little as 30 seconds to 2 minutes, depending on complexity. This is up to 10x faster than traditional AI video generation methods.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms does Nano Banana Video support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nano Banana Video generates videos optimized for all major social platforms including TikTok (9:16), Instagram Reels (9:16), YouTube Shorts (9:16), Facebook Stories, and LinkedIn. Videos are automatically formatted for each platform's requirements.",
      },
    },
    {
      "@type": "Question",
      name: "Is Nano Banana Video free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, ClipMotion offers a free tier that includes Nano Banana Video capabilities. You can generate your first videos for free, then upgrade to paid plans starting at €49/month for more credits and features.",
      },
    },
    {
      "@type": "Question",
      name: "What makes Nano Banana Video different from other AI video tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nano Banana Video is specifically optimized for short-form vertical content with lightning-fast generation times. It combines text-to-video AI, motion graphics, AI voiceovers, and music in a single streamlined workflow, unlike tools that require multiple steps or software.",
      },
    },
  ],
};

const features = [
  {
    icon: Zap,
    title: "Lightning Fast Generation",
    description: "Generate complete short-form videos in 30 seconds to 2 minutes. 10x faster than traditional methods.",
  },
  {
    icon: Video,
    title: "Vertical-First Design",
    description: "Optimized for 9:16 format. Perfect for TikTok, Instagram Reels, YouTube Shorts, and Stories.",
  },
  {
    icon: Sparkles,
    title: "AI Motion Graphics",
    description: "Automatic text animations, transitions, and visual effects that make your content pop.",
  },
  {
    icon: Globe,
    title: "50+ AI Voices",
    description: "Natural-sounding voiceovers in multiple languages with customizable tones and styles.",
  },
  {
    icon: Layers,
    title: "Smart Templates",
    description: "Pre-built scenarios for product demos, tutorials, testimonials, and viral content formats.",
  },
  {
    icon: Target,
    title: "Brand Consistency",
    description: "Your logo, colors, and brand identity automatically integrated into every video.",
  },
];

const useCases = [
  {
    title: "TikTok Content Creators",
    description: "Generate viral short-form content at scale. Post multiple times daily without burning out.",
  },
  {
    title: "E-commerce Brands",
    description: "Create product showcase videos that drive sales on social commerce platforms.",
  },
  {
    title: "Marketing Agencies",
    description: "Deliver more video content to clients faster with automated production workflows.",
  },
  {
    title: "Personal Brands",
    description: "Build your online presence with consistent, professional video content.",
  },
];

const NanoBananaVideoPage = () => {
  const navigate = useNavigate();

  return (
    <PublicPageLayout>
      <SEOHead
        title="Nano Banana Video – Ultra-Fast AI Video Generator for TikTok & Reels | ClipMotion"
        description="Nano Banana Video creates AI-powered short-form videos in seconds. Generate TikTok videos, Instagram Reels, and YouTube Shorts 10x faster with advanced neural network technology."
        canonical={`${SITE_URL}/nanobananavideo`}
        keywords="nano banana video, AI video generator, TikTok video maker, Instagram Reels generator, YouTube Shorts AI, fast video creation, short-form video AI, text to video, AI video maker, vertical video generator"
        structuredData={[
          organizationSchema,
          nanoBananaArticleSchema,
          nanoBananaProductSchema,
          nanoBananaFAQSchema,
        ]}
      />

      {/* Hero Section */}
      <section className="relative pt-20 md:pt-32 pb-12 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 md:w-96 h-48 md:h-96 bg-primary/20 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-2 mb-8">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Ultra-Fast AI Video Technology</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-gradient">Nano Banana</span> Video
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              The fastest AI video generator for short-form content. Create TikTok videos, Instagram Reels, and YouTube Shorts in seconds—not hours.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto h-14 px-8 text-lg gradient-primary shadow-glow hover:opacity-90 transition-opacity"
              >
                <Play className="mr-2 h-5 w-5" />
                Try Nano Banana Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/clipmotion")}
                className="w-full sm:w-auto h-14 px-8 text-lg"
              >
                See Examples
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { value: "30s", label: "Average Generation Time" },
                { value: "10x", label: "Faster Than Traditional" },
                { value: "50+", label: "AI Voice Options" },
                { value: "4.9★", label: "User Rating" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-3xl md:text-4xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What is Nano Banana Video */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-center mb-6">
              What is <span className="text-gradient">Nano Banana Video</span>?
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground">
              <p className="text-lg md:text-xl leading-relaxed mb-6">
                Nano Banana Video is ClipMotion's proprietary AI video generation technology specifically designed for short-form vertical content. Unlike traditional video creation tools that take hours, Nano Banana uses advanced neural networks optimized for rapid rendering while maintaining broadcast-quality output.
              </p>
              <p className="text-lg md:text-xl leading-relaxed mb-6">
                The technology combines <strong>text-to-video AI</strong>, <strong>motion graphics automation</strong>, <strong>AI voiceover synthesis</strong>, and <strong>intelligent music selection</strong> into a single streamlined workflow. Simply describe your video concept, and Nano Banana generates a complete, platform-ready video in seconds.
              </p>
              <p className="text-lg md:text-xl leading-relaxed">
                Whether you're a content creator looking to scale your TikTok presence, an e-commerce brand creating product videos, or a marketing agency delivering client content, Nano Banana Video helps you produce <strong>10x more videos in the same amount of time</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center mb-4">
            Nano Banana Video <span className="text-gradient">Features</span>
          </h2>
          <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Everything you need to create viral short-form content at scale.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-glow transition-all hover:border-primary/30 bg-card/50">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center mb-4">
            Who Uses <span className="text-gradient">Nano Banana Video</span>?
          </h2>
          <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            From solo creators to enterprise teams, Nano Banana powers video content at every scale.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="hover:shadow-glow transition-all hover:border-primary/30 bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-2">{useCase.title}</h3>
                      <p className="text-muted-foreground">{useCase.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center mb-12">
            How <span className="text-gradient">Nano Banana Video</span> Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: "1", title: "Describe Your Video", desc: "Enter a text prompt or select a pre-built scenario. Add your brand context for personalized content." },
              { step: "2", title: "AI Generates Instantly", desc: "Nano Banana's neural network creates your video with motion graphics, voiceover, and music in seconds." },
              { step: "3", title: "Publish Everywhere", desc: "Download in 9:16 format or auto-publish to TikTok, Instagram, YouTube, and more with one click." },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <span className="font-display text-3xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center mb-12">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>

          <div className="max-w-3xl mx-auto space-y-6">
            {nanoBananaFAQSchema.mainEntity.map((faq, index) => (
              <Card key={index} className="bg-card/50">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg font-semibold mb-3">{faq.name}</h3>
                  <p className="text-muted-foreground">{faq.acceptedAnswer.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
              Ready to Create Videos <span className="text-gradient">10x Faster</span>?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of creators using Nano Banana Video to dominate short-form content. Pick a plan today.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-14 px-10 text-lg gradient-primary shadow-glow hover:opacity-90 transition-opacity"
            >
              <Wand2 className="mr-2 h-5 w-5" />
              Start Creating with Nano Banana
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default NanoBananaVideoPage;
