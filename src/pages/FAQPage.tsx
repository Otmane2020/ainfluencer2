import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { seoPages, faqSchema, organizationSchema } from "@/lib/seo-data";
import { Sparkles, MessageCircle } from "lucide-react";

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is ClipMotion?",
        a: "ClipMotion is an AI-powered video generation platform that enables users to create professional motion design videos, AI influencer content, and social media videos in seconds. It automates the entire content creation workflow from script generation to multi-platform publishing.",
      },
      {
        q: "How does AI video generation work?",
        a: "ClipMotion uses advanced AI models to generate videos from text prompts. Simply describe your video concept, select your preferred style and AI voice, and our platform generates professional-quality videos with motion graphics, animations, and voiceovers automatically.",
      },
      {
        q: "Can I create AI influencer videos?",
        a: "Yes! ClipMotion features AI avatar generation that creates realistic virtual influencers for your brand. You can generate custom AI spokespersons that deliver your message consistently across all your content.",
      },
    ],
  },
  {
    category: "Features & Capabilities",
    questions: [
      {
        q: "What platforms can I publish to?",
        a: "ClipMotion supports direct publishing to Instagram, Facebook, TikTok, LinkedIn, and YouTube. You can schedule and automate posts across all platforms from a single dashboard.",
      },
      {
        q: "What video formats and resolutions are supported?",
        a: "ClipMotion generates videos up to 1080p HD resolution in formats optimized for each social platform: 9:16 for TikTok/Reels, 1:1 for Instagram feed, 16:9 for YouTube, and custom aspect ratios for ads.",
      },
      {
        q: "Can I use my own voice or brand assets?",
        a: "Yes, you can upload custom brand assets, logos, and colors. For voiceovers, we offer 30+ AI voices in multiple languages, or you can record your own voice.",
      },
      {
        q: "How is ClipMotion different from other AI video tools?",
        a: "ClipMotion is an all-in-one platform that combines AI video generation, motion design, AI avatars, and social media automation. Unlike point solutions, we handle the entire workflow from content ideation to scheduled publishing across multiple platforms.",
      },
    ],
  },
  {
    category: "Pricing & Plans",
    questions: [
      {
        q: "Is there a free plan?",
        a: "Yes, ClipMotion offers a free plan that lets you try the platform with limited video generations. Paid plans start at €49/month for the Starter plan with 10 images and 2 videos per month.",
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Absolutely. You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period.",
      },
      {
        q: "Do you offer refunds?",
        a: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied with ClipMotion, contact our support team within 14 days of purchase for a full refund.",
      },
      {
        q: "Do unused credits roll over?",
        a: "Credits do not roll over to the next month. We recommend choosing a plan that matches your regular usage, and you can always purchase additional credits if needed.",
      },
    ],
  },
  {
    category: "Technical",
    questions: [
      {
        q: "How long does it take to generate a video?",
        a: "Most videos are generated in under 30 seconds. Longer or more complex videos may take 1-2 minutes. You'll receive a notification when your video is ready.",
      },
      {
        q: "Do you have an API?",
        a: "Yes, we offer a full REST API for developers and businesses who want to integrate ClipMotion into their workflows. API access is available on Pro and Agency plans.",
      },
      {
        q: "Is my content private and secure?",
        a: "Yes. All content you create is private by default. We use industry-standard encryption for data transfer and storage. We never use your content to train our AI models without explicit permission.",
      },
    ],
  },
];

const FAQPage = () => {
  const navigate = useNavigate();
  const seo = seoPages.faq;

  return (
    <PublicPageLayout>
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        keywords={seo.keywords}
        structuredData={[faqSchema, organizationSchema]}
      />

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about ClipMotion's AI video generation platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {faqs.map((category, catIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIndex * 0.1 }}
              className="mb-12"
            >
              <h2 className="font-display text-2xl font-bold mb-6">{category.category}</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {category.questions.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`${catIndex}-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-left font-medium hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-4">
            Still Have Questions?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Our support team is here to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="outline" onClick={() => navigate("/contact")}>
              <MessageCircle className="mr-2 h-5 w-5" /> Contact Support
            </Button>
            <Button onClick={() => navigate("/auth")} className="gradient-primary">
              <Sparkles className="mr-2 h-5 w-5" /> Get Started Free
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default FAQPage;
