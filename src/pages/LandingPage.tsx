import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingPacks } from "@/components/PricingPacks";
import {
  Play,
  Sparkles,
  Video,
  Calendar,
  TrendingUp,
  Zap,
  Users,
  Globe,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "AI Video Generation",
    description: "Create stunning AI-powered videos for Reels, TikTok, and Shorts in seconds.",
  },
  {
    icon: Sparkles,
    title: "AI Influencer Avatars",
    description: "Generate realistic AI influencers that represent your brand perfectly.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Plan and automate your content calendar across all social platforms.",
  },
  {
    icon: TrendingUp,
    title: "Engagement Analytics",
    description: "Track performance and optimize your content strategy with AI insights.",
  },
  {
    icon: Globe,
    title: "Multi-Platform",
    description: "Publish to Instagram, Facebook, TikTok, and LinkedIn simultaneously.",
  },
  {
    icon: Zap,
    title: "One-Click Publishing",
    description: "Generate, review, and publish content with a single click.",
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Content Creator",
    avatar: "S",
    content: "ClipMotion transformed my content workflow. I create 10x more content in half the time!",
    rating: 5,
  },
  {
    name: "Mike Chen",
    role: "Marketing Agency Owner",
    avatar: "M",
    content: "Our clients love the AI-generated content. It's indistinguishable from professional productions.",
    rating: 5,
  },
  {
    name: "Emma Wilson",
    role: "E-commerce Brand",
    avatar: "E",
    content: "The AI influencer feature is a game-changer. We created a virtual brand ambassador instantly.",
    rating: 5,
  },
];

const stats = [
  { value: "10M+", label: "Videos Generated" },
  { value: "50K+", label: "Happy Users" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "24/7", label: "AI Availability" },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 glass">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl overflow-hidden shadow-glow">
              <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
            </div>
            <span className="font-display text-lg md:text-xl font-bold text-gradient">ClipMotion</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
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
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium">AI-Powered Content Creation</span>
            </div>
            
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-4 md:mb-6">
              Create <span className="text-gradient">AI-Powered</span> Videos That Go{" "}
              <span className="text-gradient">Viral</span>
            </h1>
            
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 px-2">
              Generate stunning AI influencer videos, automate your social media presence, and grow your audience 10x faster with ClipMotion.
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
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-20 bg-muted/30">
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
              Powerful AI tools designed to help creators and brands scale their content effortlessly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-glow transition-all hover:border-primary/30 bg-card/50">
                  <CardContent className="p-4 md:p-6">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl gradient-primary flex items-center justify-center mb-3 md:mb-4 shadow-primary">
                      <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
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
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
              <p className="text-sm text-white/60 mt-4">No credit card required • Free forever plan available</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
                <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
              </div>
              <span className="font-display text-lg font-bold">ClipMotion</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ClipMotion. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
