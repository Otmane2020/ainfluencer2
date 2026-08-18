import { useNavigate, Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingPacks } from "@/components/PricingPacks";
import {
  ArrowRight,
  Check,
  Film,
  Image as ImageIcon,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  Wand2,
  Zap,
} from "lucide-react";

const HERO_VIDEO =
  "https://cloud-cdn.higgsfield.ai/6a3799cd-f426-48fd-be4c-857325f13a1e/06a2e341-3f3f-40cc-8b20-44239e74af4d.mp4";

const WORKFLOWS = [
  {
    icon: ImageIcon,
    title: "Product visuals",
    description: "Create new studio-style and lifestyle image concepts from a prompt or reference image.",
  },
  {
    icon: Film,
    title: "Product motion",
    description: "Animate a product image into a short motion clip for social, ads, and product pages.",
  },
  {
    icon: Video,
    title: "Text → video",
    description: "Generate short video concepts and creative scenes directly from a text prompt.",
  },
];

const STEPS = [
  { icon: Upload, title: "Start with a photo or prompt", text: "Use a clean product image for the most consistent product-focused result." },
  { icon: Wand2, title: "Choose the result", text: "Create an image, a video, or animate an existing product shot." },
  { icon: Play, title: "Generate, review, export", text: "Keep the best take, retry when needed, then export up to 1080p." },
];

const EXPECTATIONS = [
  "Generative results vary between runs — a retry can produce a better take.",
  "Logos, small text, hands, and fine geometry can occasionally distort.",
  "Clear, well-lit reference images generally preserve products more consistently.",
  "ClipMotion is best for creative concepts and short-form motion, not frame-perfect VFX editing.",
];

const MODELS = ["Higgsfield Soul", "Reve", "DoP", "Kling v2.1 Pro", "Seedance"];

export const MobileProductMotionLandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl shadow-glow">
              <img src="/logo.png" alt="ClipMotion" className="h-full w-full scale-125 object-contain" />
            </div>
            <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
          </Link>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-10 pt-8">
        <div className="absolute -top-16 left-1/4 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-44 right-0 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium">AI product visuals + motion</span>
          </div>

          <h1 className="font-display mt-5 text-4xl font-bold leading-[1.05]">
            Turn product photos into <span className="text-gradient">motion clips</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Upload a product image or start from a prompt. Create product visuals and short AI videos for Reels, TikTok, ads, and product pages.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
            {["No filming", "No timeline editing", "One credit balance"].map((item) => (
              <span key={item} className="rounded-full border border-border bg-card/60 px-2.5 py-1">
                {item}
              </span>
            ))}
          </div>

          <motion.figure
            id="examples"
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
                aria-label="Example AI motion clip generated with ClipMotion"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                <Play className="h-3 w-3" /> Example output
              </span>
            </div>
            <figcaption className="mt-2 text-[11px] text-muted-foreground">
              Example image-to-video result. Outputs vary by image, prompt, and model.
            </figcaption>
          </motion.figure>

          <div className="mt-6 space-y-2.5">
            <Button
              size="lg"
              className="h-12 w-full gradient-primary text-base shadow-glow"
              onClick={() => navigate("/auth")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create from a product
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full text-base"
              onClick={() => navigate("/pricing")}
            >
              See transparent pricing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Credits shown before you generate • Cancel anytime
          </p>
        </motion.div>
      </section>

      <section className="border-y border-border/40 bg-muted/20 px-4 py-8">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          One product. Multiple creative directions.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 text-center text-xs">
          {["Studio visual", "Lifestyle concept", "Motion clip", "Vertical social video"].map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card/60 px-3 py-3 font-medium">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-9">
        <h2 className="font-display text-2xl font-bold">Create the result you actually need</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The models stay under the hood. Start from the creative outcome instead.
        </p>
        <div className="mt-5 space-y-3">
          {WORKFLOWS.map((workflow) => (
            <Card key={workflow.title} className="border-border/60 bg-card/60">
              <CardContent className="flex gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
                  <workflow.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{workflow.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{workflow.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/20 px-4 py-9">
        <h2 className="font-display text-2xl font-bold">From product to motion in 3 steps</h2>
        <div className="mt-5 space-y-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex gap-3 rounded-xl border border-border bg-card/60 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-9">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="font-display text-xl font-bold">What to expect from AI generation</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            ClipMotion is a generative creative tool. We would rather set the right expectation than promise a perfect render every time.
          </p>
          <ul className="mt-4 space-y-3">
            {EXPECTATIONS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-xs leading-5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-8 text-center">
        <p className="text-xs text-muted-foreground">Powered by leading generative models</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {MODELS.map((model) => (
            <span key={model} className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[10px] text-muted-foreground">
              {model}
            </span>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-muted/20 px-4 py-9">
        <h2 className="font-display text-2xl font-bold">Simple credit pricing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No fake countdowns. Pick the plan that matches how much you generate.
        </p>
        <div className="mt-5">
          <PricingPacks compact showFlashSale={false} />
        </div>
      </section>

      <section className="px-4 py-9">
        <div className="rounded-2xl gradient-primary p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-primary-foreground">Make your product move</h2>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Start with one product image and explore image and motion concepts in ClipMotion.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-4 h-12 w-full text-base"
            onClick={() => navigate("/auth")}
          >
            Start creating
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/20 px-4 py-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl">
            <img src="/logo.png" alt="ClipMotion" className="h-full w-full scale-125 object-contain" />
          </div>
          <span className="font-display text-lg font-bold text-gradient">ClipMotion</span>
        </div>
        <p className="mt-2 max-w-[290px] text-xs leading-5 text-muted-foreground">
          AI product visuals and motion clips for creators, e-commerce brands, and agencies.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/use-cases">Use Cases</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/terms">Terms</Link>
        </div>
        <p className="mt-6 text-[11px] text-muted-foreground">© {new Date().getFullYear()} ClipMotion. All rights reserved.</p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/92 p-3 backdrop-blur-xl">
        <Button
          size="lg"
          className="h-12 w-full gradient-primary text-base shadow-glow"
          onClick={() => navigate("/auth")}
        >
          Create from a product
        </Button>
      </div>
    </div>
  );
};
