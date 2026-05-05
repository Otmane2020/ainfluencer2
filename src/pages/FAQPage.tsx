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
        a: "ClipMotion is an AI product photography platform. Upload a single product photo and we generate 10 professional, high-converting product images — clean studio shots, lifestyle scenes and multi-platform formats — in about 2 minutes.",
      },
      {
        q: "Who is ClipMotion for?",
        a: "Shopify sellers, Amazon and Etsy merchants, DTC brands, marketplaces and agencies who need pro product photos without booking a studio or hiring a photographer.",
      },
      {
        q: "What makes ClipMotion different?",
        a: "We are 100% focused on product photography for e-commerce. No generic image generator: every output is optimised for product pages, ads and social feeds.",
      },
    ],
  },
  {
    category: "Photos & Quality",
    questions: [
      {
        q: "What kind of source photo can I upload?",
        a: "Any photo of your product works — a phone snap, an existing white-background shot or a catalog image. Our AI cleans the cutout, relights it and recreates it in new scenes.",
      },
      {
        q: "What image formats and resolutions do you produce?",
        a: "HD images up to 2048 px, in square (1:1), portrait (9:16) and landscape (16:9). Optimised for Shopify, Amazon, Etsy, WooCommerce, Instagram, TikTok and Google Shopping.",
      },
      {
        q: "Can I keep my brand colours and style consistent?",
        a: "Yes — upload your brand kit (colours, logo, mood references). The AI keeps a consistent look across every product in your catalog.",
      },
      {
        q: "Do you support batch generation?",
        a: "Yes. Upload up to 20 products at once and generate hundreds of images in a single session.",
      },
    ],
  },
  {
    category: "Pricing & Licensing",
    questions: [
      {
        q: "Is there a free trial?",
        a: "Yes — new users get free credits to generate their first product shots, no credit card required.",
      },
      {
        q: "Can I use the images in paid ads?",
        a: "Absolutely. Every generated image comes with a full commercial license, including paid ads on Meta, TikTok, Google and printed catalogs.",
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Yes. You can cancel at any time from your account settings; your access continues until the end of the current billing period.",
      },
      {
        q: "Do unused credits roll over?",
        a: "Credits don't expire. Use them at your own pace, whenever you have a new product to shoot.",
      },
    ],
  },
  {
    category: "Technical & Privacy",
    questions: [
      {
        q: "How long does generation take?",
        a: "Around 2 minutes per product gallery. Batch jobs complete in the background and you get notified when they're ready.",
      },
      {
        q: "Are my product photos private?",
        a: "Yes. Your uploads and generated images are private by default. We use industry-standard encryption and never use your content to train AI models without consent.",
      },
      {
        q: "Do you have an API?",
        a: "Yes — REST API access for product shot generation is available on Pro and Agency plans, perfect for automating Shopify or PIM workflows.",
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

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about ClipMotion's AI product photography platform.
            </p>
          </motion.div>
        </div>
      </section>

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

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Our team is here to help. Reach out and we'll reply within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="outline" onClick={() => navigate("/contact")}>
              <MessageCircle className="mr-2 h-5 w-5" /> Contact Support
            </Button>
            <Button onClick={() => navigate("/auth")} className="gradient-primary">
              <Sparkles className="mr-2 h-5 w-5" /> Try Free
            </Button>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default FAQPage;
