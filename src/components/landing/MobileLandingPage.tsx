import { useNavigate, Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingPacks } from "@/components/PricingPacks";
import {
  Play,
  Sparkles,
  Image as ImageIcon,
  Video,
  Film,
  ArrowRight,
  Zap,
  Check,
  Star,
  ShieldCheck,
  Mail,
  Linkedin,
  Instagram,
  Twitter,
} from "lucide-react";

const HERO_VIDEO =
  "https://cloud-cdn.higgsfield.ai/6a3799cd-f426-48fd-be4c-857325f13a1e/06a2e341-3f3f-40cc-8b20-44239e74af4d.mp4";

const MODELS = ["Soul", "Reve", "DoP", "Kling v2.1 Pro", "Seedance"];

const STUDIOS = [
  {
    icon: ImageIcon,
    title: "AI Image Studio",
    description: "Cinematic images from a single prompt. 1 credit each.",
    link: "/images",
  },
  {
    icon: Video,
    title: "AI Video Studio",
    description: "Text-to-video with pro camera motion. 4 credits each.",
    link: "/videos",
  },
  {
    icon: Film,
    title: "Image → Video",
    description: "Turn any product shot into a scroll-stopping clip.",
    link: "/image-to-video",
  },
];

const STEPS = [
  { n: "1", title: "Write your prompt", text: "Describe the shot in plain English." },
  { n: "2", title: "Pick a model", text: "Soul, Kling, DoP, Seedance — one balance." },
  { n: "3", title: "Export in 1080p", text: "Download and publish anywhere." },
];

const PROOF = [
  { value: "5+", label: "SOTA models" },
  { value: "~30s", label: "Avg. render" },
  { value: "1080p", label: "HD export" },
];

export const MobileLandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
          </Link>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-8 pb-10">
        <div className="absolute -top-16 left-1/4 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 right-0 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium">AI Image & Video Studio</span>
          </div>

          <h1 className="font-display mt-5 text-3xl font-bold leading-tight">
            Turn a prompt into a{" "}
            <span className="text-gradient">cinematic video</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            One studio, the best generative models, one credit balance. Start free — no card
            required.
          </p>

          {/* Latest generated video */}
          <motion.figure
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-6 w-full max-w-[260px]"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
              <video
                src={HERO_VIDEO}
                className="aspect-[9/16] w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Latest AI generated video made with ClipMotion"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                <Zap className="h-3 w-3" /> Latest generation
              </span>
            </div>
            <figcaption className="mt-2 text-[11px] text-muted-foreground">
              Image-to-video made in ClipMotion — one prompt, cinematic motion.
            </figcaption>
          </motion.figure>

          <div className="mt-6 space-y-2.5">
            <Button
              size="lg"
              className="h-12 w-full gradient-primary text-base shadow-glow"
              onClick={() => navigate("/auth")}
            >
              <Play className="mr-2 h-4 w-4" />
              Start creating free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full text-base"
              onClick={() => navigate("/pricing")}
            >
              See pricing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 10 free credits • Cancel anytime
          </p>

          <div className="mt-7 grid grid-cols-3 gap-3">
            {PROOF.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card/50 py-3">
                <div className="font-display text-lg font-bold text-gradient">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {MODELS.map((m) => (
              <span
                key={m}
                className="rounded-full border border-border bg-card/50 px-2.5 py-1 text-[10px] text-muted-foreground"
              >
                {m}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Studios */}
      <section className="px-4 py-8">
        <h2 className="font-display text-xl font-bold">Everything in one studio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Text-to-image, text-to-video and image-to-video.
        </p>
        <div className="mt-4 space-y-3">
          {STUDIOS.map((s) => (
            <Card
              key={s.title}
              className="border-border/60 bg-card/60 active:scale-[0.99] transition-transform"
              onClick={() => navigate("/auth")}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
                  <s.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/20 px-4 py-8">
        <h2 className="font-display text-xl font-bold">3 steps to your first clip</h2>
        <div className="mt-4 space-y-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-3 rounded-xl border border-border bg-card/60 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                {s.n}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-8">
        <h2 className="font-display text-xl font-bold">Why creators switch</h2>
        <ul className="mt-4 space-y-2.5">
          {[
            "All top models under one credit balance",
            "1 credit per image, 4 per video — no surprises",
            "Full control: ratio, resolution, motion, negative prompt",
            "Commercial rights on Pro and Business",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Social proof */}
      <section className="px-4 py-8">
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
            ))}
          </div>
          <p className="mt-3 text-sm">
            "Product shots to cinematic motion clips in minutes. It replaced two tools and a
            freelancer."
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Emma W. — E-commerce brand</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-8">
        <h2 className="font-display text-xl font-bold">Simple pricing</h2>
        <p className="mt-1 text-sm text-muted-foreground">Start free, upgrade when you scale.</p>
        <div className="mt-4">
          <PricingPacks compact />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-10">
        <div className="rounded-2xl gradient-primary p-6 text-center">
          <h2 className="font-display text-xl font-bold text-primary-foreground">
            Your first video is 30 seconds away
          </h2>
          <p className="mt-2 text-sm text-primary-foreground/80">
            10 free credits on signup. No card required.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-4 h-12 w-full text-base"
            onClick={() => navigate("/auth")}
          >
            Start creating free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 px-4 py-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
        </div>
        <p className="mt-2 max-w-[260px] text-xs text-muted-foreground">
          AI image and video studio for creators, brands, and agencies.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider">Product</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li><Link to="/images" className="block py-0.5">AI Images</Link></li>
              <li><Link to="/videos" className="block py-0.5">AI Videos</Link></li>
              <li><Link to="/image-to-video" className="block py-0.5">Image to Video</Link></li>
              <li><Link to="/pricing" className="block py-0.5">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider">Company</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li><Link to="/faq" className="block py-0.5">FAQ</Link></li>
              <li><Link to="/contact" className="block py-0.5">Contact</Link></li>
              <li><Link to="/privacy-policy" className="block py-0.5">Privacy</Link></li>
              <li><Link to="/terms" className="block py-0.5">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <a href="mailto:hello@clipmotion.ai" className="text-muted-foreground hover:text-primary">
            <Mail className="h-4 w-4" />
            <span className="sr-only">Email</span>
          </a>
          <a href="https://linkedin.com/company/clipmotion" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Linkedin className="h-4 w-4" />
            <span className="sr-only">LinkedIn</span>
          </a>
          <a href="https://instagram.com/clipmotion.ai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Instagram className="h-4 w-4" />
            <span className="sr-only">Instagram</span>
          </a>
          <a href="https://twitter.com/clipmotionai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Twitter className="h-4 w-4" />
            <span className="sr-only">X / Twitter</span>
          </a>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} ClipMotion. All rights reserved.
        </p>
      </footer>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/90 p-3 backdrop-blur-xl">
        <Button
          size="lg"
          className="h-12 w-full gradient-primary text-base shadow-glow"
          onClick={() => navigate("/auth")}
        >
          Start free — 10 credits
        </Button>
      </div>
    </div>
  );
};

export default MobileLandingPage;
