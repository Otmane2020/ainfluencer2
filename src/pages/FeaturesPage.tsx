import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router-compat";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seoPages, softwareApplicationSchema, organizationSchema } from "@/lib/seo-data";
import {
  Video, Wand2, Calendar, TrendingUp, Globe, Zap, Mic, Users, Palette,
  Clock, Languages, Shield, ArrowRight, Check
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "AI Video Generation",
    description: "Transform text prompts into stunning videos in seconds. Our AI understands context, tone, and visual style to create professional-quality videos.",
    benefits: ["1080p HD quality", "Multiple aspect ratios", "30+ video styles"],
  },
  {
    icon: Wand2,
    title: "AI Influencer Avatars",
    description: "Create realistic AI avatars that represent your brand. Generate virtual influencers that speak in your voice and style.",
    benefits: ["Photorealistic quality", "Custom appearances", "Lip-sync technology"],
  },
  {
    icon: Palette,
    title: "Motion Design AI",
    description: "Professional motion graphics without design skills. Kinetic typography, animated transitions, and dynamic visual effects.",
    benefits: ["100+ motion templates", "Custom animations", "Brand kit support"],
  },
  {
    icon: Mic,
    title: "AI Voice Generation",
    description: "Natural-sounding voiceovers in 30+ languages. Clone voices or choose from our library of professional AI voices.",
    benefits: ["30+ languages", "Voice cloning", "Emotion control"],
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "AI-powered content calendar that suggests optimal posting times. Automate your entire publishing workflow.",
    benefits: ["Optimal timing", "Bulk scheduling", "Auto-posting"],
  },
  {
    icon: Globe,
    title: "Multi-Platform Publishing",
    description: "Publish to Instagram, Facebook, TikTok, LinkedIn, and YouTube from one dashboard. Format-optimized for each platform.",
    benefits: ["5+ platforms", "Auto-formatting", "Cross-posting"],
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description: "Track performance across all platforms. AI-powered insights to optimize your content strategy.",
    benefits: ["Real-time metrics", "AI recommendations", "ROI tracking"],
  },
  {
    icon: Languages,
    title: "Multi-Language Support",
    description: "Create content in 50+ languages. Automatic translation and localization for global reach.",
    benefits: ["50+ languages", "Auto-translation", "Cultural adaptation"],
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Work together with your team. Role-based permissions, approval workflows, and shared asset libraries.",
    benefits: ["Unlimited members", "Approval flows", "Shared assets"],
  },
  {
    icon: Clock,
    title: "Instant Generation",
    description: "Get your videos in seconds, not hours. Our optimized AI pipeline delivers results faster than any competitor.",
    benefits: ["< 30s generation", "Priority queue", "Batch processing"],
  },
  {
    icon: Shield,
    title: "Brand Safety",
    description: "Content moderation and brand guidelines enforcement. Ensure every video meets your quality standards.",
    benefits: ["Content filtering", "Brand guidelines", "Quality control"],
  },
  {
    icon: Zap,
    title: "API Access",
    description: "Integrate ClipMotion into your workflow. Full REST API with SDKs for popular programming languages.",
    benefits: ["REST API", "Webhooks", "SDKs"],
  },
];

const FeaturesPage = () => {
  const navigate = useNavigate();
  const seo = seoPages.features;

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
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Powerful <span className="text-gradient">AI Features</span> for Video Creation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              ClipMotion combines cutting-edge AI with intuitive tools to help you create professional videos 10x faster than traditional methods.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="gradient-primary shadow-glow"
            >
              Start Creating Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10">
            Everything you need to create AI videos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-glow transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-primary">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <ul className="space-y-1">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Experience These Features?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start your free trial today and see how ClipMotion can transform your content creation workflow.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary">
            <Wand2 className="mr-2 h-5 w-5" /> Get Started Free
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default FeaturesPage;
