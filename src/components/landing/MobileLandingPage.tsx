import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Sparkles,
  Image,
  Video,
  Wand2,
  TrendingUp,
  ArrowRight,
  Home,
  Compass,
  Plus,
  FolderOpen,
  User,
  ChevronRight,
  Zap,
  Camera,
} from "lucide-react";
import { useState } from "react";

// Feature cards data
const featureCards = [
  {
    icon: Sparkles,
    title: "ClipMotion",
    description: "AI Motion Videos",
    gradient: "from-primary to-secondary",
    link: "/clipmotion",
  },
  {
    icon: Image,
    title: "AI Image",
    description: "Smart Generation",
    gradient: "from-accent to-primary",
    link: "/images",
  },
  {
    icon: Video,
    title: "AI Video",
    description: "Cinema Quality",
    gradient: "from-secondary to-accent",
    link: "/videos",
    badge: "Premium",
  },
];

// Trending content mockup
const trendingContent = [
  {
    id: 1,
    title: "Motion Control",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=400&fit=crop",
    gradient: "from-green-500/50 to-transparent",
  },
  {
    id: 2,
    title: "AI Portraits",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop",
    gradient: "from-orange-500/50 to-transparent",
  },
  {
    id: 3,
    title: "Product Shots",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=400&fit=crop",
    gradient: "from-blue-500/50 to-transparent",
  },
  {
    id: 4,
    title: "Viral Effects",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=400&fit=crop",
    gradient: "from-purple-500/50 to-transparent",
  },
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
          <button className="p-2 rounded-full border border-border/50 bg-muted/50">
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full border border-border/50 bg-muted/50">
              <Sparkles className="w-5 h-5 text-primary" />
            </button>
            <Button 
              size="sm" 
              onClick={() => navigate("/auth")}
              className="gradient-primary rounded-full px-4"
            >
              Upgrade
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Carousel */}
      <section className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden aspect-[16/9]"
        >
          <img
            src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&h=450&fit=crop"
            alt="AI Video Generation"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="font-display text-xl font-bold text-white mb-1">
              ClipMotion AI Studio
            </h2>
            <p className="text-white/70 text-sm">Create viral videos in seconds</p>
          </div>
          {/* Carousel dots */}
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            <div className="w-6 h-1.5 rounded-full bg-white" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section className="px-4 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {featureCards.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(feature.link)}
              className="cursor-pointer"
            >
              <Card className="bg-muted/60 hover:bg-muted/80 border-border/50 transition-all relative overflow-hidden">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  {feature.badge && (
                    <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-none">
                      {feature.badge}
                    </Badge>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-2`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-sm">{feature.title}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trends Section */}
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h3 className="font-display text-lg font-bold">Trends</h3>
          <button className="flex items-center gap-1 text-sm text-muted-foreground">
            More <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {trendingContent.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-40 aspect-[3/4] rounded-xl overflow-hidden relative cursor-pointer group"
              onClick={() => navigate("/auth")}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${item.gradient}`} />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-semibold text-white text-sm italic">{item.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* For You Tabs */}
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

        {/* Content Grid */}
        <div className="grid grid-cols-2 gap-2 px-4 pt-4">
          {[
            { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&h=400&fit=crop", label: "Viral Dance" },
            { img: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=300&h=400&fit=crop", label: "AI Art" },
            { img: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=300&h=400&fit=crop", label: "Tech Demo" },
            { img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop", label: "Nature FX" },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="aspect-[3/4] rounded-xl overflow-hidden relative cursor-pointer"
              onClick={() => navigate("/auth")}
            >
              <img
                src={item.img}
                alt={item.label}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2">
                <span className="text-white text-xs font-medium">{item.label}</span>
              </div>
              <div className="absolute top-2 right-2">
                <Play className="w-6 h-6 text-white/80" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl gradient-primary p-5 text-center"
        >
          <Wand2 className="w-10 h-10 text-white mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-white mb-2">
            Start Creating Today
          </h3>
          <p className="text-white/80 text-sm mb-4">
            Join 50,000+ creators making viral content
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="bg-white text-foreground hover:bg-white/90 w-full"
          >
            Get Started Free
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
