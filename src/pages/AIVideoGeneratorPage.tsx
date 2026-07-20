import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seoPages, softwareApplicationSchema, organizationSchema } from "@/lib/seo-data";
import { ArrowRight, Sparkles, Video, Wand2, Zap, Check, Star } from "lucide-react";

const AIVideoGeneratorPage = () => {
  const navigate = useNavigate();
  const seo = seoPages.aiVideoGenerator;

  const steps = [
    { step: "1", title: "Enter Your Prompt", desc: "Describe your video idea in plain English. Our AI understands context, tone, and style preferences." },
    { step: "2", title: "AI Creates Your Video", desc: "Our advanced AI generates professional-quality video with animations, transitions, and voiceover." },
    { step: "3", title: "Download or Publish", desc: "Export in HD quality or publish directly to TikTok, Instagram, YouTube, and more." },
  ];

  const capabilities = [
    "Text-to-video generation in seconds",
    "30+ professional AI voices",
    "1080p HD video quality",
    "9:16, 1:1, 16:9 aspect ratios",
    "Auto-generated captions",
    "100+ motion templates",
    "Background music library",
    "Custom brand colors & fonts",
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 mb-8">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Video Generator</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Generate <span className="text-gradient">Professional Videos</span> from Text
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              ClipMotion's AI video generator transforms your text prompts into stunning, publish-ready videos in seconds. No editing skills required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="h-14 px-8 text-lg gradient-primary shadow-glow"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                Try AI Video Generator
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
              <div className="flex">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span>4.9/5 from 189,000+ reviews</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What is AI Video Generator */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 text-center">
              What is an AI Video Generator?
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              An AI video generator is a tool that uses artificial intelligence to automatically create videos from text descriptions, images, or audio. ClipMotion's AI video generator goes beyond simple automation—it understands context, applies professional motion design principles, and produces content that looks like it was made by a professional video editor.
            </p>
            <p className="text-lg text-muted-foreground">
              Unlike traditional video editing software that requires hours of manual work, our AI creates polished videos in seconds. Simply describe what you want, and the AI handles scripting, visual creation, animations, voiceovers, and final rendering automatically.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-12 text-center">
            How AI Video Generation Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <span className="font-display text-3xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-8 text-center">
              AI Video Generator Capabilities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capabilities.map((capability) => (
                <div key={capability} className="flex items-center gap-3 bg-card p-4 rounded-lg border">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{capability}</span>
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
            Start Generating Videos with AI Today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join 50,000+ creators using ClipMotion's AI video generator to create professional content in seconds.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary">
            <Sparkles className="mr-2 h-5 w-5" /> Create Your First Video Free
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default AIVideoGeneratorPage;
