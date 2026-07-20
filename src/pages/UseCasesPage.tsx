import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seoPages, softwareApplicationSchema, organizationSchema } from "@/lib/seo-data";
import { ArrowRight, Sparkles, ShoppingBag, Megaphone, Users, Building2, GraduationCap, Briefcase } from "lucide-react";

const useCases = [
  {
    icon: Users,
    title: "Content Creators",
    subtitle: "Scale your content output 10x",
    description: "Create more TikToks, Reels, and Shorts without spending hours editing. Let AI handle the heavy lifting while you focus on creativity.",
    benefits: [
      "Generate 10+ videos per day",
      "Consistent brand aesthetic",
      "AI voiceovers in your style",
      "Automatic caption generation",
    ],
    cta: "Perfect for YouTubers, TikTokers, and Instagram creators",
  },
  {
    icon: ShoppingBag,
    title: "E-commerce Brands",
    subtitle: "Product videos that convert",
    description: "Turn product photos into engaging video ads. Create demo videos, unboxings, and promotional content automatically.",
    benefits: [
      "Product demo videos",
      "UGC-style testimonials",
      "Dynamic ad creatives",
      "Multi-platform formats",
    ],
    cta: "Trusted by 5,000+ e-commerce brands",
  },
  {
    icon: Megaphone,
    title: "Marketing Agencies",
    subtitle: "Scale client deliverables",
    description: "Deliver more video content to clients without expanding your team. White-label solution with team collaboration features.",
    benefits: [
      "10x content output",
      "Client workspaces",
      "Brand kit management",
      "Approval workflows",
    ],
    cta: "Enterprise pricing available for agencies",
  },
  {
    icon: Building2,
    title: "Small Businesses",
    subtitle: "Professional videos, no budget needed",
    description: "Create professional marketing videos without hiring expensive agencies. Perfect for local businesses and startups.",
    benefits: [
      "No design skills required",
      "Affordable pricing",
      "Quick turnaround",
      "Professional results",
    ],
    cta: "Start with our free plan",
  },
  {
    icon: GraduationCap,
    title: "Educators & Coaches",
    subtitle: "Engaging educational content",
    description: "Transform lessons into engaging video content. Create course materials, tutorials, and educational shorts automatically.",
    benefits: [
      "Educational templates",
      "Multi-language support",
      "Animated explanations",
      "Course video series",
    ],
    cta: "Special pricing for educators",
  },
  {
    icon: Briefcase,
    title: "Enterprise Teams",
    subtitle: "Scale video production globally",
    description: "Enterprise-grade video automation with SSO, advanced security, and dedicated support. Perfect for large organizations.",
    benefits: [
      "SSO & security",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantees",
    ],
    cta: "Contact sales for enterprise pricing",
  },
];

const UseCasesPage = () => {
  const navigate = useNavigate();
  const seo = seoPages.useCases;

  return (
    <PublicPageLayout>
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        keywords={seo.keywords}
        structuredData={[softwareApplicationSchema, organizationSchema]}
      />

      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              AI Video for <span className="text-gradient">Every Industry</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              See how creators, brands, and businesses use ClipMotion to automate their video content and grow their audience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-glow transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-primary">
                      <useCase.icon className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="font-display text-xl font-semibold mb-1">{useCase.title}</h2>
                    <p className="text-primary text-sm mb-3">{useCase.subtitle}</p>
                    <p className="text-muted-foreground mb-4">{useCase.description}</p>
                    <ul className="space-y-2 mb-4">
                      {useCase.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm">
                          <Sparkles className="h-4 w-4 text-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground italic">{useCase.cta}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Video Workflow?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join 50,000+ creators and brands already using ClipMotion to automate their video content.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary">
            Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default UseCasesPage;
