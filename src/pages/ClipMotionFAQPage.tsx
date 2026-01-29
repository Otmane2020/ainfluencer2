import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { organizationSchema, SITE_URL } from "@/lib/seo-data";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, MessageCircleQuestion, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ClipMotionFAQPage = () => {
  const faqItems = [
    {
      question: "What is Clip Motion?",
      answer: "Clip Motion (ClipMotion) is an AI-powered video creation platform that transforms text prompts into professional videos. It uses advanced artificial intelligence to generate motion design, animations, voiceovers, and complete social media videos automatically—no editing skills required."
    },
    {
      question: "How does Clip Motion work?",
      answer: "Clip Motion works in 4 simple steps: (1) Enter a text description of your desired video, (2) The AI generates visuals, animations, and motion graphics, (3) Add AI voiceover or background music, (4) Export or publish directly to social media. The entire process takes less than 60 seconds."
    },
    {
      question: "Is Clip Motion free to use?",
      answer: "Yes, Clip Motion offers a free plan that lets you try the platform with limited video generations. Paid plans start at $49/month for the Starter plan, which includes 10 images and 2 videos per month. Pro and Agency plans offer unlimited features for professional creators."
    },
    {
      question: "What types of videos can I create with Clip Motion?",
      answer: "Clip Motion supports all major video formats including: TikTok videos (9:16), Instagram Reels, YouTube Shorts, Facebook videos, LinkedIn content, product demos, marketing ads, explainer videos, and AI influencer content. Videos are automatically optimized for each platform."
    },
    {
      question: "Do I need video editing experience to use Clip Motion?",
      answer: "No, Clip Motion is designed for users with zero video editing experience. The AI handles all technical aspects of video production including motion design, animation timing, transitions, and export settings. Simply describe what you want, and the AI creates it."
    },
    {
      question: "What is the difference between Clip Motion and other AI video tools?",
      answer: "Clip Motion is an all-in-one platform that combines AI video generation, motion design, AI avatars, and social media automation in one tool. Unlike point solutions that only handle one aspect, Clip Motion manages the entire workflow from content ideation to scheduled publishing across multiple platforms."
    },
    {
      question: "Can Clip Motion create AI influencer videos?",
      answer: "Yes, Clip Motion features AI avatar generation that creates realistic virtual influencers for your brand. You can generate custom AI spokespersons that deliver your message consistently across all your content, perfect for faceless YouTube channels and brand ambassadors."
    },
    {
      question: "What languages does Clip Motion support?",
      answer: "Clip Motion supports 30+ languages for AI voiceovers and content generation. The platform automatically detects your project's language from your website or brand materials and generates content in that language. Popular languages include English, Spanish, French, German, Portuguese, and more."
    },
    {
      question: "Can I schedule and auto-publish videos with Clip Motion?",
      answer: "Yes, Clip Motion includes built-in scheduling and auto-publishing features. Connect your social media accounts (Instagram, TikTok, Facebook, LinkedIn, YouTube) and schedule videos to publish automatically at optimal times for maximum engagement."
    },
    {
      question: "What video quality does Clip Motion produce?",
      answer: "Clip Motion generates videos up to 1080p HD resolution. All videos are optimized for social media with the correct aspect ratios: 9:16 for TikTok/Reels, 1:1 for Instagram feed, 16:9 for YouTube, and custom formats for ads. Export options include MP4 and WebM formats."
    },
    {
      question: "How fast can Clip Motion generate a video?",
      answer: "Most videos are generated in under 60 seconds. Complex motion design videos with AI voiceovers may take 2-3 minutes. The AI processes your request in real-time, so you can preview and iterate quickly without waiting."
    },
    {
      question: "Is my content safe and private on Clip Motion?",
      answer: "Yes, Clip Motion takes privacy seriously. Your content, brand assets, and generated videos are private to your account. We use enterprise-grade encryption and never share your content with third parties. Read our Privacy Policy for full details."
    },
    {
      question: "Can I use Clip Motion for commercial purposes?",
      answer: "Absolutely. All videos created with Clip Motion on paid plans are yours to use commercially. You have full rights to monetize, distribute, and use your generated content for business purposes including ads, marketing, and client work."
    },
    {
      question: "Does Clip Motion offer team features?",
      answer: "Yes, the Agency plan includes team collaboration features. You can invite team members, manage multiple projects, and share brand assets across your organization. Perfect for marketing teams and agencies managing multiple clients."
    },
    {
      question: "How do I get started with Clip Motion?",
      answer: "Getting started is easy: (1) Sign up for a free account at clipmotion.ai, (2) Create your first project and add your brand details, (3) Enter a prompt describing your video, (4) Generate and download your AI video. No credit card required to start."
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": "Clip Motion FAQ", "item": `${SITE_URL}/clip-motion-faq` }
    ]
  };

  return (
    <PublicPageLayout>
      <SEOHead 
        title="Clip Motion FAQ: All Your Questions Answered | ClipMotion"
        description="Get answers to frequently asked questions about Clip Motion AI video generator. Learn how it works, pricing, features, and how to create professional videos with AI."
        canonical={`${SITE_URL}/clip-motion-faq`}
        keywords="clip motion, clipmotion FAQ, AI video generator questions, clip motion how it works, clip motion pricing, clip motion features"
        structuredData={[faqSchema, breadcrumbSchema, organizationSchema]}
      />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-8">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Clip Motion FAQ</span>
          </nav>

          {/* Hero */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Answer Engine Optimized</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Clip Motion <span className="text-gradient">FAQ</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about Clip Motion, the AI video generator trusted by over 189,000 creators worldwide.
            </p>
          </header>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="text-center p-4 rounded-lg bg-card border border-border">
              <div className="text-2xl md:text-3xl font-bold text-primary">189K+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-card border border-border">
              <div className="text-2xl md:text-3xl font-bold text-primary">4.9★</div>
              <div className="text-sm text-muted-foreground">User Rating</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-card border border-border">
              <div className="text-2xl md:text-3xl font-bold text-primary">60s</div>
              <div className="text-sm text-muted-foreground">Avg. Generation</div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="mb-16">
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-lg px-6 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-left font-semibold hover:text-primary py-6">
                    <span className="flex items-start gap-3">
                      <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6 pl-8">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* CTA Section */}
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Ready to Create Your First AI Video?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join 189,000+ creators using Clip Motion to produce professional videos in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="font-semibold">
                <Link to="/auth">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/blog/clip-motion">Read Full Guide</Link>
              </Button>
            </div>
          </div>

          {/* Related Links */}
          <aside className="mt-16 pt-8 border-t border-border">
            <h2 className="font-display text-xl font-bold mb-4">Learn More About Clip Motion</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/features" className="px-4 py-2 rounded-full bg-card border border-border hover:border-primary/30 text-sm transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="px-4 py-2 rounded-full bg-card border border-border hover:border-primary/30 text-sm transition-colors">
                Pricing
              </Link>
              <Link to="/use-cases" className="px-4 py-2 rounded-full bg-card border border-border hover:border-primary/30 text-sm transition-colors">
                Use Cases
              </Link>
              <Link to="/ai-video-generator" className="px-4 py-2 rounded-full bg-card border border-border hover:border-primary/30 text-sm transition-colors">
                AI Video Generator
              </Link>
              <Link to="/contact" className="px-4 py-2 rounded-full bg-card border border-border hover:border-primary/30 text-sm transition-colors">
                Contact Support
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default ClipMotionFAQPage;
