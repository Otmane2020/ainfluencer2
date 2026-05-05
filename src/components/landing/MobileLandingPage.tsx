import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Wand2,
  ArrowRight,
  Home,
  Compass,
  Plus,
  FolderOpen,
  User,
  ChevronRight,
  Camera,
  Layers,
  Scissors,
  Smartphone,
  Globe,
  Star,
  Upload,
  Download,
} from "lucide-react";

const showcaseImages = [
  { img: "/showcase/sofa-lifestyle.png", label: "Lifestyle" },
  { img: "/showcase/sofa-angle45.png", label: "45° angle" },
  { img: "/showcase/sofa-zoom.png", label: "Detail" },
  { img: "/showcase/watch-front.png", label: "Hero" },
  { img: "/showcase/watch-angle45.png", label: "Variant" },
  { img: "/showcase/watch-profile.png", label: "Profile" },
];

const featureCards = [
  { icon: Camera, title: "Product Shots", description: "10 pro images", gradient: "from-amber-500 to-orange-600", link: "/auth" },
  { icon: Scissors, title: "Background", description: "Auto removal", gradient: "from-emerald-500 to-teal-600", link: "/auth" },
  { icon: Layers, title: "Batch", description: "20 SKUs at once", gradient: "from-violet-500 to-fuchsia-600", link: "/auth" },
];

const stats = [
  { value: "+67%", label: "Conversion lift" },
  { value: "2 min", label: "Per product" },
  { value: "10×", label: "More images" },
];

export function MobileLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="ClipMotion" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs">
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary rounded-full px-4 text-xs">
              Try Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 pt-6 pb-2 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
            <Wand2 className="h-3 w-3 mr-1" /> AI Product Photography
          </Badge>
          <h1 className="font-display text-3xl font-bold leading-tight mb-2">
            1 photo → <span className="text-gradient">10 pro shots</span>
            <br />in 2 minutes
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Turn ordinary product photos into pro visuals that sell. No studio, no photographer.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gradient-primary shadow-glow w-full max-w-xs">
            <Sparkles className="mr-2 h-4 w-4" />
            Try Free
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground">5 free products · No credit card</p>
        </motion.div>
      </section>

      {/* Showcase scroller */}
      <section className="pt-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="font-display text-base font-bold">Real AI shots</h3>
          <Badge variant="outline" className="text-[10px]">
            <Sparkles className="h-3 w-3 mr-1 text-primary" /> HD
          </Badge>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {showcaseImages.map((item, index) => (
            <motion.div
              key={item.label + index}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="flex-shrink-0 w-36 aspect-[3/4] rounded-xl overflow-hidden relative cursor-pointer group bg-muted/30"
              onClick={() => navigate("/auth")}
            >
              <img src={item.img} alt={item.label} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="font-semibold text-white text-sm">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-4 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {featureCards.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => navigate(feature.link)}
              className="cursor-pointer"
            >
              <Card className="bg-muted/60 hover:bg-muted/80 border-border/50 transition-all">
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-1.5`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-xs">{feature.title}</span>
                  <span className="text-[10px] text-muted-foreground">{feature.description}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pt-6">
        <h3 className="font-display text-base font-bold mb-3">How it works</h3>
        <div className="space-y-2">
          {[
            { icon: Upload, title: "1. Upload your photo", desc: "Phone shot or catalog photo — anything works" },
            { icon: Wand2, title: "2. Pick a style", desc: "Studio, lifestyle or seasonal mood" },
            { icon: Download, title: "3. Download HD images", desc: "Ready for Shopify, Amazon and social" },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Built for */}
      <section className="px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-muted/40 border border-border/50 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold">Built for E-commerce</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Marketplace-ready images for Shopify, Amazon, Etsy, WooCommerce and social.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Shopify", "Amazon", "Etsy", "Instagram", "TikTok", "Google Shopping"].map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-center gap-6 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-xl font-bold text-gradient">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-4 pt-6">
        <Card className="bg-muted/40 border-border/50">
          <CardContent className="p-4">
            <div className="flex gap-0.5 text-primary mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground italic mb-3">
              "I run 200 SKUs. Used to spend hours in a studio. Now it's 10 minutes for the whole catalog."
            </p>
            <p className="text-xs font-medium">Mohamed S. · Shopify dropshipping</p>
          </CardContent>
        </Card>
      </section>

      {/* CTA Banner */}
      <section className="px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl gradient-primary p-5 text-center"
        >
          <Smartphone className="w-8 h-8 text-white mx-auto mb-2" />
          <h3 className="font-display text-lg font-bold text-white mb-1">Ready to sell more?</h3>
          <p className="text-white/80 text-xs mb-4">Get pro product shots without a studio</p>
          <Button onClick={() => navigate("/auth")} className="bg-white text-foreground hover:bg-white/90 w-full">
            Try Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 pb-safe">
        <div className="flex items-center justify-around py-2">
          <Link to="/" className="flex flex-col items-center gap-1 px-4 py-2 text-primary">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link to="/features" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-medium">Features</span>
          </Link>
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full gradient-primary shadow-glow"
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
          <Link to="/pricing" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <FolderOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">Pricing</span>
          </Link>
          <Link to="/auth" className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Sign In</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
