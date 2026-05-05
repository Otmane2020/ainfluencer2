import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PricingPacks } from "@/components/PricingPacks";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  Camera,
  Upload,
  Wand2,
  Download,
  ArrowRight,
  Check,
  Star,
  Sparkles,
  Clock,
  ShoppingBag,
  Zap,
  Shield,
} from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload 1 product photo",
    desc: "Drop any product shot — even a basic phone picture on a white background.",
  },
  {
    icon: Wand2,
    title: "AI generates 10 pro variations",
    desc: "Lifestyle scenes, colored backdrops, close-ups, ambient shots — all in your brand style.",
  },
  {
    icon: Download,
    title: "Download & boost sales",
    desc: "Ready in 2 minutes. Plug them into Shopify, Amazon, Etsy, Instagram or your ads.",
  },
];

const benefits = [
  "No photographer, no studio, no Photoshop",
  "10 high-resolution pro shots per product",
  "Lifestyle, packshot & ad-ready scenes",
  "Keeps your product 100% accurate",
  "Commercial license included",
  "Results in under 2 minutes",
];

const testimonials = [
  {
    name: "Léa M.",
    role: "Shopify store owner",
    avatar: "L",
    content: "I doubled my add-to-cart rate after switching my product images. Game changer for small brands.",
    rating: 5,
  },
  {
    name: "Marcus B.",
    role: "Amazon seller",
    avatar: "M",
    content: "I was paying $80 per photo. Now I get 10 pro shots in 2 minutes for the price of a coffee.",
    rating: 5,
  },
  {
    name: "Aïcha D.",
    role: "Instagram boutique",
    avatar: "A",
    content: "My feed finally looks like a real brand. Customers think I hired a professional photographer.",
    rating: 5,
  },
];

const stats = [
  { value: "1 photo", label: "All you need" },
  { value: "10 shots", label: "Per generation" },
  { value: "2 min", label: "Average wait" },
  { value: "+87%", label: "Avg conversion lift" },
];

const LandingPage = () => {
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard (handles OAuth callback)
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
    <div className="min-h-screen bg-background">
      <SEOHead
        title="ClipMotion — Turn 1 product photo into 10 pro shots in 2 minutes"
        description="AI product photography for e-commerce sellers. Upload one product picture, get 10 professional, ad-ready images for Shopify, Amazon, Etsy, Instagram & Facebook ads."
        canonical="https://clipmotion.ai/"
        keywords="ai product photography, product shots ai, ecommerce photo generator, shopify product images, amazon product photos"
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 glass">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl overflow-hidden shadow-glow">
              <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
            </div>
            <span className="font-display text-lg md:text-xl font-bold text-gradient">ClipMotion</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs md:text-sm">
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary text-xs md:text-sm">
              Try Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-12 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-72 md:w-96 h-72 md:h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 md:w-96 h-72 md:h-96 bg-secondary/20 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 mb-6">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium">AI Product Photography for E-commerce</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              1 product photo →{" "}
              <span className="text-gradient">10 pro shots</span>{" "}
              in 2 minutes
            </h1>

            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Stop losing sales because of bad photos. Upload one product picture and get a full gallery of professional, ad-ready images for your Shopify, Amazon, Instagram or Facebook ads.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-10">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto h-14 px-8 text-lg gradient-primary shadow-glow hover:opacity-90"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Try 5 product shots free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-14 px-8 text-lg"
                onClick={() => {
                  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See how it works
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 mb-12 text-sm text-muted-foreground">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span>4.9/5 — loved by 12,000+ e-commerce sellers</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Before / After visual */}
      <section className="py-12 md:py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
              From <span className="text-muted-foreground line-through">boring</span> to{" "}
              <span className="text-gradient">scroll-stopping</span>
            </h2>
            <p className="text-muted-foreground">Same product. AI-generated variations. Higher conversion.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 max-w-5xl mx-auto">
            {[
              { label: "Original", img: "/showcase/kling-jewelry.png", muted: true },
              { label: "Lifestyle", img: "/showcase/kling-fashion.png" },
              { label: "Studio", img: "/showcase/kling-glamour.png" },
              { label: "Editorial", img: "/showcase/kling-cinematic.png" },
              { label: "Stage", img: "/showcase/kling-stage.png" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border"
              >
                <img
                  src={item.img}
                  alt={item.label}
                  className={`w-full h-full object-cover ${item.muted ? "grayscale opacity-70" : ""}`}
                  loading="lazy"
                />
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                    {item.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-3">3 steps. 2 minutes.</h2>
            <p className="text-muted-foreground text-lg">No skills. No software. Just better photos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors"
              >
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-glow">
                  {i + 1}
                </div>
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                  <s.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
                Built for <span className="text-gradient">e-commerce sellers</span>
              </h2>
              <p className="text-muted-foreground">Shopify, Amazon, Etsy, WooCommerce, Instagram Shop, TikTok Shop.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm md:text-base">{b}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Clock, title: "Save 10+ hours/week", desc: "vs. shooting & editing manually" },
                { icon: Zap, title: "Save $500+/month", desc: "vs. hiring a product photographer" },
                { icon: Shield, title: "Commercial license", desc: "Use anywhere — ads, store, social" },
              ].map((item, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 text-center">
                  <item.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="font-bold mb-1">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
              Sellers are <span className="text-gradient">crushing it</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex mb-3">
                  {[...Array(t.rating)].map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm mb-4 text-muted-foreground">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-3">
              Simple <span className="text-gradient">pricing</span>
            </h2>
            <p className="text-muted-foreground text-lg">Start free. Scale when you sell more.</p>
          </div>
          <PricingPacks />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <ShoppingBag className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Ready to make every product <span className="text-gradient">look premium</span>?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join 12,000+ sellers turning ordinary product photos into ad-ready visuals.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="h-14 px-8 text-lg gradient-primary shadow-glow"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Try 5 product shots free
          </Button>
          <p className="text-xs text-muted-foreground mt-4">No credit card required • Results in 2 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} ClipMotion — AI Product Photography</div>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
