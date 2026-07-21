import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingPacks } from "@/components/PricingPacks";
import { TrustedByCarousel } from "@/components/TrustedByCarousel";
import { SocialPlatformIcons } from "@/components/SocialPlatformIcons";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { SocialProofToast } from "@/components/nudges/SocialProofToast";
import { MobileLandingPage } from "@/components/landing/MobileLandingPage";

import { MobileStickyCta } from "@/components/MobileStickyeCTA";
import {
  Play,
  Wand2,
  Video,
  Calendar,
  TrendingUp,
  Zap,
  Users,
  Globe,
  ArrowRight,
  Check,
  Star,
  Sparkles,
  Image,
  Camera,
  Megaphone,
  Mic,
  User,
  Layers,
  Share2,
  Clock,
  Target,
  Film,
} from "lucide-react";

// Core product features — ClipMotion AI Studio (Higgsfield-powered)
const coreProducts = [
  {
    icon: Image,
    title: "AI Image Studio",
    description: "Generate stunning cinematic images with Higgsfield Soul & Reve. Choose aspect ratio, resolution, and style — export in seconds.",
    badge: "IMAGES",
    link: "/images",
  },
  {
    icon: Video,
    title: "AI Video Studio",
    description: "Create prompt-based videos with DoP, Kling v2.1 Pro, and Seedance. Cinema-grade motion straight from text.",
    badge: "VIDEOS",
    link: "/videos",
  },
  {
    icon: Film,
    title: "Image → Video",
    description: "Bring your images to life with cinematic camera moves and controlled motion. Perfect for reels, ads, and product shots.",
    badge: "MOTION",
    link: "/image-to-video",
  },
];

// Platform features
const platformFeatures = [
  {
    icon: Wand2,
    title: "State-of-the-Art Models",
    description: "Higgsfield Soul, Reve, DoP, Kling v2.1 Pro, and Seedance — all the best models under one credit balance.",
  },
  {
    icon: Layers,
    title: "Full Creative Control",
    description: "Aspect ratio, resolution, duration, motion strength, and negative prompt — tune every generation.",
  },
  {
    icon: Zap,
    title: "Fast Async Queue",
    description: "Submit a job, keep working. We poll in the background and surface the result the moment it's ready.",
  },
  {
    icon: Target,
    title: "Prompt-First Workflow",
    description: "A single clean interface for text-to-image, text-to-video, and image-to-video. No clutter, just creation.",
  },
  {
    icon: Sparkles,
    title: "1080p HD Exports",
    description: "Download production-ready assets at 720p or 1080p, ready to publish anywhere.",
  },
  {
    icon: Users,
    title: "Commercial Usage",
    description: "Every generation on Pro and Business plans ships with full commercial usage rights.",
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Content Creator",
    avatar: "S",
    content: "ClipMotion is my daily driver for reels. The image-to-video quality is unreal.",
    rating: 5,
  },
  {
    name: "Mike Chen",
    role: "Creative Director",
    avatar: "M",
    content: "Having Soul, Kling, and DoP in one place — with one credit balance — saved us hours every week.",
    rating: 5,
  },
  {
    name: "Emma Wilson",
    role: "E-commerce Brand",
    avatar: "E",
    content: "Product shots to cinematic motion clips in minutes. It replaced two tools and a freelancer.",
    rating: 5,
  },
];

const stats = [
  { value: "5+", label: "SOTA AI Models" },
  { value: "1080p", label: "HD Exports" },
  { value: "~30s", label: "Avg. Generation" },
  { value: "24/7", label: "Availability" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Redirect authenticated users to dashboard (handles OAuth callback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/dashboard");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Show mobile-optimized landing page on mobile devices
  if (isMobile) {
    return <MobileLandingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
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
            <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs md:text-sm px-2 md:px-4">
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary text-xs md:text-sm px-3 md:px-4">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-32 pb-12 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 md:w-96 h-48 md:h-96 bg-secondary/20 rounded-full blur-3xl" />
        
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 md:px-4 py-1.5 md:py-2 mb-6 md:mb-8">
              <Wand2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium">AI Image & Video Studio — powered by Higgsfield</span>
            </div>
            
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-4 md:mb-6">
              Turn prompts into <span className="text-gradient">cinematic</span> images &{" "}
              <span className="text-gradient">videos</span>
            </h1>
            
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 px-2">
              ClipMotion unifies the best generative AI models — Soul, Reve, DoP, Kling, Seedance — in one clean studio. Text-to-image, text-to-video, and image-to-video with one credit balance.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-8 md:mb-12">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 text-base md:text-lg gradient-primary shadow-glow hover:opacity-90 transition-opacity"
              >
                <Play className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Start Creating Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 text-base md:text-lg"
                onClick={() => navigate("/auth")}
              >
                Watch Demo
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Models strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-12 md:mt-16"
            >
              <p className="text-sm text-muted-foreground mb-4">Best-in-class models, one credit balance</p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                {["Higgsfield Soul", "Reve", "DoP", "Kling v2.1 Pro", "Seedance Pro"].map((m) => (
                  <span key={m} className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-border bg-card/50 text-muted-foreground">
                    {m}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* AI Showcase Gallery */}
      <section className="py-12 md:py-16 overflow-hidden bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-xl md:text-2xl font-bold">AI Generations</h3>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/20 rounded-full px-3 py-1">
              <Zap className="h-3.5 w-3.5" /> Live Examples
            </span>
          </div>
        </div>
        <div className="flex gap-4 animate-marquee hover:[animation-play-state:paused]">
          {[
            { img: "/showcase/kling-fashion.png", label: "Kling Fashion", type: "video", gradient: "from-pink-400/70", badge: "Kling" },
            { img: "/showcase/kling-glamour.png", label: "Kling Glamour", type: "video", gradient: "from-rose-400/70", badge: "Kling" },
            { img: "/showcase/kling-jewelry.png", label: "Kling Jewelry", type: "video", gradient: "from-amber-600/70", badge: "Kling" },
            { img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=500&fit=crop", label: "Motion Video", type: "video", gradient: "from-violet-500/60" },
            { img: "/showcase/kling-cinematic.png", label: "Kling Cinema", type: "video", gradient: "from-red-600/70", badge: "Kling" },
            { img: "/showcase/kling-stage.png", label: "Kling Stage", type: "video", gradient: "from-red-500/70", badge: "Kling" },
            { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=500&fit=crop", label: "Cinematic AI", type: "video", gradient: "from-blue-500/60" },
            { img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=500&fit=crop", label: "Abstract FX", type: "image", gradient: "from-emerald-500/60" },
            { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=500&fit=crop", label: "Reels Ready", type: "video", gradient: "from-rose-500/60" },
            { img: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=500&fit=crop", label: "AI Art", type: "image", gradient: "from-indigo-500/60" },
            { img: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400&h=500&fit=crop", label: "Tech Demo", type: "video", gradient: "from-cyan-500/60" },
            // Duplicate for seamless loop
            { img: "/showcase/kling-fashion.png", label: "Kling Fashion", type: "video", gradient: "from-pink-400/70", badge: "Kling" },
            { img: "/showcase/kling-glamour.png", label: "Kling Glamour", type: "video", gradient: "from-rose-400/70", badge: "Kling" },
            { img: "/showcase/kling-jewelry.png", label: "Kling Jewelry", type: "video", gradient: "from-amber-600/70", badge: "Kling" },
            { img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=500&fit=crop", label: "Motion Video", type: "video", gradient: "from-violet-500/60" },
            { img: "/showcase/kling-cinematic.png", label: "Kling Cinema", type: "video", gradient: "from-red-600/70", badge: "Kling" },
            { img: "/showcase/kling-stage.png", label: "Kling Stage", type: "video", gradient: "from-red-500/70", badge: "Kling" },
            { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=500&fit=crop", label: "Cinematic AI", type: "video", gradient: "from-blue-500/60" },
            { img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=500&fit=crop", label: "Abstract FX", type: "image", gradient: "from-emerald-500/60" },
            { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=500&fit=crop", label: "Reels Ready", type: "video", gradient: "from-rose-500/60" },
            { img: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=500&fit=crop", label: "AI Art", type: "image", gradient: "from-indigo-500/60" },
            { img: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400&h=500&fit=crop", label: "Tech Demo", type: "video", gradient: "from-cyan-500/60" },
          ].map((item, index) => (
            <motion.div
              key={`showcase-${index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(index * 0.05, 0.4) }}
              className="flex-shrink-0 w-52 aspect-[3/4] rounded-2xl overflow-hidden relative cursor-pointer group"
              onClick={() => navigate("/auth")}
            >
              <img
                src={item.img}
                alt={item.label}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${item.gradient} to-transparent`} />
              {"badge" in item && item.badge && (
                <div className="absolute top-2 left-2">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/90 text-white backdrop-blur-sm">
                    {item.badge}
                  </span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {item.type === "video" ? (
                    <Play className="h-3.5 w-3.5 text-white/90" />
                  ) : (
                    <Image className="h-3.5 w-3.5 text-white/90" />
                  )}
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-medium">
                    {item.type}
                  </span>
                </div>
                <p className="font-semibold text-white text-sm">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trusted By Carousel */}
      <TrustedByCarousel />

      {/* Core Products Section */}
      <section id="products" className="py-12 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-16"
          >
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              AI-Powered <span className="text-gradient">Content Suite</span>
            </h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Everything you need to create, automate, and publish stunning content at scale.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {coreProducts.map((product, index) => (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="h-full hover:shadow-glow transition-all hover:border-primary/30 bg-card/50 cursor-pointer group"
                  onClick={() => navigate(product.link)}
                >
                  <CardContent className="p-4 md:p-6 relative">
                    {product.badge && (
                      <div className="absolute top-3 right-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          product.badge === "FLAGSHIP" 
                            ? "bg-gradient-to-r from-primary to-secondary text-white" 
                            : product.badge === "FAST"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : product.badge === "AI SMART"
                            ? "bg-accent/20 text-accent"
                            : product.badge === "PREMIUM"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-primary/20 text-primary"
                        }`}>
                          {product.badge}
                        </span>
                      </div>
                    )}
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl gradient-primary flex items-center justify-center mb-3 md:mb-4 shadow-primary group-hover:scale-110 transition-transform">
                      <product.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <h3 className="font-display text-lg md:text-xl font-semibold mb-2">{product.title}</h3>
                    <p className="text-sm md:text-base text-muted-foreground">{product.description}</p>
                    <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Try now <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-16"
          >
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              Everything You Need to <span className="text-gradient">Dominate</span> Social Media
            </h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Powerful features designed to help creators and brands scale their content effortlessly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {platformFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-glow transition-all hover:border-primary/30 bg-card/50">
                  <CardContent className="p-4 md:p-6">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-muted flex items-center justify-center mb-3 md:mb-4">
                      <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-lg md:text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Create Content in <span className="text-gradient">3 Simple Steps</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: "1", title: "Describe Your Vision", desc: "Tell our AI what kind of content you want to create" },
              { step: "2", title: "AI Generates Content", desc: "Our proprietary AI engine creates stunning visuals and videos" },
              { step: "3", title: "Publish & Grow", desc: "Schedule and publish across all platforms with one click" },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative text-center"
              >
                <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <span className="font-display text-3xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Simple, <span className="text-gradient">Transparent</span> Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your needs. Start free, upgrade anytime.
            </p>
          </motion.div>

          <PricingPacks />
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Loved by <span className="text-gradient">50,000+</span> Creators
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                        <span className="font-bold text-white">{testimonial.avatar}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 gradient-hero" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 py-16 px-8 text-center text-white">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Ready to Transform Your Content?
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
                Join 50,000+ creators who are already using ClipMotion to grow their audience and save time.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="h-14 px-8 text-lg bg-white text-foreground hover:bg-white/90"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
              <p className="text-sm text-white/60 mt-4">No credit card required • Free forever plan available</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-display font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/ai-video-generator" className="hover:text-foreground transition-colors">AI Video Generator</Link></li>
                <li><Link to="/motion-design-ai" className="hover:text-foreground transition-colors">Motion Design AI</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/use-cases" className="hover:text-foreground transition-colors">Use Cases</Link></li>
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><a href="https://twitter.com/clipmotion" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="https://linkedin.com/company/clipmotion" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LinkedIn</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden">
                <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
              </div>
              <span className="font-display text-lg font-bold">ClipMotion</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ClipMotion. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <MobileStickyCta showFlashSale={true} />

      {/* Social proof nudge toasts */}
      <SocialProofToast initialDelay={6000} interval={18000} />
    </div>
  );
};

export default LandingPage;
