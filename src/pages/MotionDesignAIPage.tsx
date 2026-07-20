import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seoPages, softwareApplicationSchema, organizationSchema } from "@/lib/seo-data";
import { ArrowRight, Sparkles, Palette, Layers, Type, Shapes, Star, Check } from "lucide-react";

const MotionDesignAIPage = () => {
  const navigate = useNavigate();
  const seo = seoPages.motionDesignAI;

  const features = [
    {
      icon: Type,
      title: "Kinetic Typography",
      description: "Animated text that moves with rhythm and purpose. Perfect for quotes, lyrics, and impactful messaging.",
    },
    {
      icon: Shapes,
      title: "Shape Animations",
      description: "Dynamic geometric animations that add visual interest and guide viewer attention.",
    },
    {
      icon: Layers,
      title: "Layered Compositions",
      description: "Multi-layered animations with depth and dimension, creating a polished, professional look.",
    },
    {
      icon: Palette,
      title: "Color Transitions",
      description: "Smooth gradient shifts and color animations that enhance mood and brand recognition.",
    },
  ];

  const benefits = [
    "No After Effects or design skills needed",
    "100+ professionally designed templates",
    "Custom animations from text prompts",
    "Export in 1080p HD quality",
    "Brand kit integration",
    "Instant preview and rendering",
  ];

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
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 mb-8">
              <Palette className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Motion Design AI</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              <span className="text-gradient">Motion Design</span> Without the Learning Curve
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Create professional motion graphics with AI. No After Effects required. ClipMotion generates stunning animations from simple text descriptions.
            </p>

            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-14 px-8 text-lg gradient-primary shadow-glow"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Try Motion Design AI
            </Button>

            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
              <div className="flex">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span>Rated 4.9/5 by 189,000+ users</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What is Motion Design AI */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 text-center">
              What is Motion Design AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Motion Design AI refers to artificial intelligence systems that automatically create animated graphics, kinetic typography, and visual effects. ClipMotion's motion design AI understands design principles, timing, and visual hierarchy to generate animations that would traditionally require professional motion designers using tools like After Effects or Cinema 4D.
            </p>
            <p className="text-lg text-muted-foreground">
              Whether you need animated logos, promotional videos, or social media content with dynamic graphics, our AI handles the complex animation work while you focus on your creative vision.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-12 text-center">
            Motion Design Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-glow transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-primary">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-8 text-center">
              Why Choose AI Motion Design?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 bg-card p-4 rounded-lg border">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Create Motion Graphics with AI
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Professional motion design is now accessible to everyone. Start creating stunning animations today.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary">
            <Palette className="mr-2 h-5 w-5" /> Start Creating Free
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default MotionDesignAIPage;
