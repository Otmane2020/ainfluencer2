import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SocialPlatformIcons } from "@/components/SocialPlatformIcons";
import {
  Play,
  Sparkles,
  Image,
  Video,
  Wand2,
  ArrowRight,
  Home,
  Compass,
  Plus,
  FolderOpen,
  User,
  ChevronRight,
  Zap,
  Camera,
  Globe,
  Calendar,
  Megaphone,
} from "lucide-react";
import { useState } from "react";

// AI Showcase gallery — stunning examples
const aiShowcase = [
  {
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop",
    label: "AI Portrait",
    type: "image" as const,
    gradient: "from-pink-500/60",
  },
  {
    img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=500&fit=crop",
    label: "Motion Video",
    type: "video" as const,
    gradient: "from-violet-500/60",
  },
  {
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop",
    label: "Product Shot",
    type: "image" as const,
    gradient: "from-amber-500/60",
  },
  {
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=500&fit=crop",
    label: "Cinematic AI",
    type: "video" as const,
    gradient: "from-blue-500/60",
  },
  {
    img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=500&fit=crop",
    label: "Abstract FX",
    type: "image" as const,
    gradient: "from-emerald-500/60",
  },
];

// Feature cards
const featureCards = [
  {
    icon: Sparkles,
    title: "ClipMotion",
    description: "Viral Videos",
    gradient: "from-primary to-secondary",
    link: "/clipmotion",
  },
  {
    icon: Image,
    title: "AI Image",
    description: "Smart Gen",
    gradient: "from-accent to-primary",
    link: "/images",
  },
  {
    icon: Video,
    title: "AI Video",
    description: "Cinema",
    gradient: "from-secondary to-accent",
    link: "/videos",
    badge: "Pro",
  },
];

// Social platforms for auto-publish section
const socialPlatforms = [
  { name: "Instagram", color: "#E4405F", emoji: "📸" },
  { name: "TikTok", color: "#000", emoji: "🎵" },
  { name: "LinkedIn", color: "#0A66C2", emoji: "💼" },
  { name: "Facebook", color: "#1877F2", emoji: "👥" },
  { name: "YouTube", color: "#FF0000", emoji: "🎬" },
];

// For You tabs
const forYouTabs = ["For You", "Shorts", "Motion", "Cinema"];

export function MobileLandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("For You");

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-xs"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="gradient-primary rounded-full px-4 text-xs"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 pt-6 pb-2 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
            <Wand2 className="h-3 w-3 mr-1" /> AI-Powered Content
          </Badge>
          <h1 className="font-display text-3xl font-bold leading-tight mb-2">
            Create <span className="text-gradient">Viral</span> Content{" "}
            <span className="text-gradient">Instantly</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            AI images, videos & social posts — published to all your platforms automatically.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="gradient-primary shadow-glow w-full max-w-xs"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Creating Free
          </Button>
        </motion.div>
      </section>

      {/* AI Showcase Scroller */}
      <section className="pt-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="font-display text-base font-bold">AI Generations</h3>
          <Badge variant="outline" className="text-[10px]">
            <Zap className="h-3 w-3 mr-1 text-primary" /> Live
          </Badge>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {aiShowcase.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex-shrink-0 w-36 aspect-[3/4] rounded-xl overflow-hidden relative cursor-pointer group"
              onClick={() => navigate("/auth")}
            >
              <img
                src={item.img}
                alt={item.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${item.gradient} to-transparent`} />
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <div className="flex items-center gap-1 mb-0.5">
                  {item.type === "video" ? (
                    <Play className="h-3 w-3 text-white/90" />
                  ) : (
                    <Image className="h-3 w-3 text-white/90" />
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

      {/* Feature Cards */}
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
              <Card className="bg-muted/60 hover:bg-muted/80 border-border/50 transition-all relative overflow-hidden">
                <CardContent className="p-3 flex flex-col items-center text-center">
                  {feature.badge && (
                    <Badge className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-none">
                      {feature.badge}
                    </Badge>
                  )}
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

      {/* Auto-Publish to Social Platforms */}
      <section className="px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-muted/40 border border-border/50 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold">Auto-Publish Everywhere</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            One click to post AI-generated content across all your social networks simultaneously.
          </p>
          <SocialPlatformIcons size="sm" showLabel animated />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["Auto-scheduling", "Smart captions", "Hashtag AI", "Analytics"].map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* For You Tabs — Content Grid */}
      <section className="pt-6">
        <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
          {forYouTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap text-sm font-medium pb-2 transition-colors ${
                activeTab === tab
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pt-4">
          {[
            { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&h=400&fit=crop", label: "Reels Ready" },
            { img: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=300&h=400&fit=crop", label: "AI Art" },
            { img: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=300&h=400&fit=crop", label: "Tech Demo" },
            { img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop", label: "Nature FX" },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="aspect-[3/4] rounded-xl overflow-hidden relative cursor-pointer"
              onClick={() => navigate("/auth")}
            >
              <img
                src={item.img}
                alt={item.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2">
                <span className="text-white text-xs font-medium">{item.label}</span>
              </div>
              <div className="absolute top-2 right-2">
                <Play className="w-5 h-5 text-white/80" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What You Can Create — Use Cases */}
      <section className="px-4 pt-6">
        <h3 className="font-display text-base font-bold mb-3">What You Can Create</h3>
        <div className="space-y-2">
          {[
            { icon: Camera, title: "Product Shots", desc: "Turn 1 photo into pro ads", gradient: "from-amber-500 to-orange-600" },
            { icon: Video, title: "TikTok & Reels", desc: "Viral vertical videos in seconds", gradient: "from-pink-500 to-rose-600" },
            { icon: Megaphone, title: "AI Campaigns", desc: "Auto-post content on autopilot", gradient: "from-blue-500 to-indigo-600" },
            { icon: Calendar, title: "LinkedIn Stories", desc: "Professional storytelling AI", gradient: "from-sky-500 to-cyan-600" },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              onClick={() => navigate("/auth")}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
                <item.icon className="w-5 h-5 text-white" />
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

      {/* Social Proof */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-center gap-6 text-center">
          {[
            { value: "50K+", label: "Creators" },
            { value: "10M+", label: "Generated" },
            { value: "98%", label: "Satisfaction" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-xl font-bold text-gradient">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl gradient-primary p-5 text-center"
        >
          <Wand2 className="w-8 h-8 text-white mx-auto mb-2" />
          <h3 className="font-display text-lg font-bold text-white mb-1">
            Start Creating Today
          </h3>
          <p className="text-white/80 text-xs mb-4">
            Join 50,000+ creators making viral content with AI
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="bg-white text-foreground hover:bg-white/90 w-full"
          >
            Get Started Free
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
            <span className="text-[10px] font-medium">Explore</span>
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
