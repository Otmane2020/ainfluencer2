import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PricingPacks } from "@/components/PricingPacks";
import { supabase } from "@/integrations/supabase/client";

import { MobileStickyCta } from "@/components/MobileStickyeCTA";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  Upload,
  Wand2,
  Download,
  ArrowRight,
  Sparkles,
  Scissors,
  Globe,
  Smartphone,
  Layers,
  Star,
} from "lucide-react";

const stats = [
  { value: "10x", label: "More images per product" },
  { value: "2 min", label: "Generation time" },
  { value: "+67%", label: "Avg. conversion lift" },
  { value: "$0", label: "Photographer needed" },
];

const steps = [
  {
    n: "01",
    icon: Upload,
    title: "Upload your product photo",
    desc: "Any photo works. White background, phone shot, doesn't matter.",
  },
  {
    n: "02",
    icon: Wand2,
    title: "Pick your style",
    desc: "Lifestyle, pro studio, colored backdrop, seasonal mood — 20+ styles.",
  },
  {
    n: "03",
    icon: Download,
    title: "Download your images",
    desc: "10 HD images ready for Shopify, WooCommerce, Amazon or social.",
  },
];

const features = [
  {
    icon: Scissors,
    title: "Automatic background removal",
    desc: "AI detects and removes the background in one click. Clean cutout, sharp edges.",
  },
  {
    icon: Globe,
    title: "Lifestyle scene placement",
    desc: "Drop your product into realistic scenes: living room, beach, office, kitchen…",
  },
  {
    icon: Smartphone,
    title: "Multi-platform formats",
    desc: "Square (Instagram), portrait (TikTok), landscape (banner) generated automatically.",
  },
  {
    icon: Layers,
    title: "Batch — multiple products",
    desc: "Upload up to 20 products at once. Generate 200 images in a single session.",
  },
];

const testimonials = [
  {
    avatar: "K",
    name: "Kofi A.",
    role: "Fashion boutique",
    content:
      "My sales jumped 40% after I refreshed my product photos. Product Shot AI is a must-have.",
  },
  {
    avatar: "A",
    name: "Aminata D.",
    role: "Online cosmetics",
    content:
      "I had ugly phone photos. Now my product pages look like a real, professional brand.",
  },
  {
    avatar: "M",
    name: "Mohamed S.",
    role: "Shopify dropshipping",
    content:
      "I run 200 SKUs. Used to spend hours in a studio. Now it's 10 minutes for the whole catalog.",
  },
];

const showcases = [
  {
    label: "Furniture",
    before: "/showcase/sofa-profile.png",
    after: [
      "/showcase/sofa-lifestyle.png",
      "/showcase/sofa-angle45.png",
      "/showcase/sofa-zoom.png",
      "/showcase/sofa-top.png",
    ],
    caption: "Lifestyle · Studio mood · Multi-color · Detail zoom · Square & portrait",
  },
  {
    label: "Watches & accessories",
    before: "/showcase/watch-front.png",
    after: [
      "/showcase/watch-angle45.png",
      "/showcase/watch-profile.png",
      "/showcase/watch-zoom.png",
      "/showcase/watch-front.png",
    ],
    caption: "Front · 45° angle · Side profile · Macro detail — every angle a buyer wants",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) navigate("/dashboard");
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="ClipMotion – Product Shot AI | 1 photo, 10 pro product images in 2 minutes"
        description="ClipMotion turns one product photo into 10 high-converting visuals for Shopify, Amazon, Instagram and TikTok. No photographer, no studio. Try free."
        canonical="https://clipmotion.ai"
        keywords="product shot AI, AI product photography, ecommerce photos, Shopify product images, AI background removal, lifestyle product images, ClipMotion"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "ClipMotion – Product Shot AI",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: "https://clipmotion.ai",
          description: "AI product photography for e-commerce. Generate 10 high-converting product images from a single photo.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "1280", bestRating: "5" },
        }}
      />
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden shadow-glow">
              <img src="/logo.png" alt="ClipMotion – Product Shot AI" className="h-full w-full object-contain scale-125" />
            </div>
            <span className="font-display text-lg md:text-xl font-bold text-gradient">ClipMotion</span>
            <span className="hidden sm:inline text-xs text-muted-foreground">· Product Shot AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/demo")} className="hidden sm:inline-flex">Demo</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/demo2")} className="hidden sm:inline-flex">Demo 2</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth?mode=signin")}>Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary">
              Start Free →
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary tracking-widest uppercase">AI built for E-commerce</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            1 product photo →<br />
            <span className="text-gradient">10 pro images</span><br />
            in 2 minutes
          </h1>
          <p className="mt-6 text-base md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Turn ordinary product shots into pro visuals that sell.
            No photographer. No studio.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="h-12 px-8 gradient-primary shadow-glow">
              <Sparkles className="mr-2 h-4 w-4" /> Try Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
            }} className="h-12 px-8">
              Watch demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* STATS */}
      <div className="border-y border-border">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-16 gap-y-8 px-6 py-10">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl md:text-4xl text-primary leading-none">{s.value}</div>
              <div className="mt-2 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DEMO Before/After */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-xs tracking-[0.15em] uppercase text-primary mb-4">Real result</div>
          <h2 className="font-display text-3xl md:text-5xl mb-12">
            See the <span className="text-gradient italic">transformation</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 text-[0.7rem] tracking-widest uppercase text-muted-foreground border-b border-border flex items-center justify-between">
                <span>Demo</span>
                <a href="/demo" className="text-primary hover:underline normal-case tracking-normal">Open ↗</a>
              </div>
              <iframe src="/demo" title="Demo" loading="lazy" className="w-full h-[640px] border-0 bg-background" />
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 text-[0.7rem] tracking-widest uppercase text-muted-foreground border-b border-border flex items-center justify-between">
                <span>Demo 2</span>
                <a href="/demo2" className="text-primary hover:underline normal-case tracking-normal">Open ↗</a>
              </div>
              <iframe src="/demo2.html" title="Demo 2" loading="lazy" className="w-full h-[640px] border-0 bg-background" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs tracking-[0.15em] uppercase text-primary mb-4">How it works</div>
            <h2 className="font-display text-3xl md:text-5xl mb-3">
              Simple as <span className="text-gradient italic">1-2-3</span>
            </h2>
            <p className="text-muted-foreground">No technical skills. Result in under 2 minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.n} className="bg-card border border-border rounded-2xl p-8 hover:border-primary/40 hover:-translate-y-1 transition-all">
                  <div className="font-display text-5xl text-primary/20 leading-none mb-5">{s.n}</div>
                  <Icon className="h-7 w-7 text-primary mb-4" />
                  <h3 className="font-medium mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs tracking-[0.15em] uppercase text-primary mb-4">Features</div>
            <h2 className="font-display text-3xl md:text-5xl mb-3">
              Everything you <span className="text-gradient italic">need</span>
            </h2>
            <p className="text-muted-foreground">Built specifically for e-commerce sellers.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-card border border-border rounded-2xl p-8 flex gap-5 hover:border-primary/30 transition-colors">
                  <div className="flex-shrink-0 w-13 h-13 p-3 bg-primary/10 rounded-xl">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs tracking-[0.15em] uppercase text-primary mb-4">Pricing</div>
            <h2 className="font-display text-3xl md:text-5xl mb-3">
              Start <span className="text-gradient italic">free</span>
            </h2>
            <p className="text-muted-foreground">No credit card required for the free trial.</p>
          </div>
          <PricingPacks onSelectPack={(plan) => navigate(`/auth?plan=${plan.id}`)} />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs tracking-[0.15em] uppercase text-primary mb-4">They use Product Shot AI</div>
            <h2 className="font-display text-3xl md:text-5xl mb-3">
              They <span className="text-gradient italic">sell more</span>
            </h2>
            <p className="text-muted-foreground">E-commerce sellers who transformed their product gallery.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-2xl p-7">
                <div className="flex gap-0.5 text-primary mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold text-primary-foreground">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6 text-center">
        <div className="relative max-w-3xl mx-auto rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 p-12 md:p-20 overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <h2 className="relative font-display text-3xl md:text-5xl mb-4">
            Ready to sell <span className="text-gradient italic">more</span>?
          </h2>
          <p className="relative text-muted-foreground mb-9">
            Join hundreds of sellers using Product Shot AI to create visuals that convert.
          </p>
          <div className="relative flex flex-wrap gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="h-12 px-8 gradient-primary shadow-glow">
              <Sparkles className="mr-2 h-4 w-4" /> Start free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/demo")} className="h-12 px-8">
              ▶ Watch live demo
            </Button>
          </div>
          <p className="relative mt-4 text-xs text-muted-foreground">
            5 free products · No credit card · Result in 2 minutes
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 pb-32 md:pb-10 text-center text-sm text-muted-foreground">
        <Link to="/" className="inline-flex items-center gap-2 mb-3">
          <span className="font-display font-bold text-foreground">ClipMotion</span>
          <span className="text-xs">· Product Shot AI</span>
        </Link>
        <p>© {new Date().getFullYear()} ClipMotion. All rights reserved.</p>
        <div className="mt-3 flex justify-center gap-5 text-xs">
          <Link to="/privacy-policy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
        </div>
      </footer>

      <MobileStickyCta showFlashSale={false} />
      
    </div>
  );
};

export default LandingPage;
