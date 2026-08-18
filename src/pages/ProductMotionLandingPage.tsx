import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingPacks } from "@/components/PricingPacks";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileProductMotionLandingPage } from "@/components/landing/MobileProductMotionLandingPage";
import {
  ArrowRight,
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Video,
  Wand2,
  Zap,
} from "lucide-react";

const HERO_VIDEO =
  "https://cloud-cdn.higgsfield.ai/6a3799cd-f426-48fd-be4c-857325f13a1e/06a2e341-3f3f-40cc-8b20-44239e74af4d.mp4";

const workflows = [
  {
    icon: ImageIcon,
    title: "Product visuals",
    label: "IMAGE",
    description: "Create studio-style and lifestyle image concepts from a prompt or reference image.",
  },
  {
    icon: Film,
    title: "Product motion",
    label: "IMAGE → VIDEO",
    description: "Animate an existing product shot into a short clip for social, ads, and product pages.",
  },
  {
    icon: Video,
    title: "Text → video",
    label: "VIDEO",
    description: "Generate short scenes directly from text when you need motion without a source image.",
  },
];

const features = [
  [Target, "Outcome-first creative", "Start from the asset you want to make, not from a model name."],
  [Upload, "Reference-image workflow", "Use a real product image when product consistency matters most."],
  [Layers, "One credit balance", "Use supported image and video models from the same ClipMotion balance."],
  [Wand2, "Creative controls", "Choose ratio, resolution, duration, motion settings, and prompting options."],
  [Sparkles, "Up to 1080p exports", "Export supported generations in HD for social, ads, and product creative."],
  [ShieldCheck, "Clear expectations", "Generative AI can need retries; ClipMotion makes that clear before you buy."],
] as const;

const expectations = [
  "Outputs vary between runs — another generation can produce a stronger take.",
  "Logos, tiny text, hands, reflections, and exact product geometry can occasionally distort.",
  "Clean, well-lit product images generally give more consistent image-to-video results.",
  "ClipMotion is best for creative concepts and short-form motion, not frame-perfect VFX replacement.",
];

const ProductMotionLandingPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) navigate("/dashboard");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isMobile) return <MobileProductMotionLandingPage />;

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-glow">
              <img src="/logo.png" alt="ClipMotion" className="h-full w-full scale-125 object-contain" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">ClipMotion</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground">Use Cases</Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
            <Button size="sm" className="gradient-primary" onClick={() => navigate("/auth")}>Start Creating</Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pb-20 pt-32">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container relative mx-auto px-4">
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI product visuals + motion</span>
              </div>
              <h1 className="mt-7 font-display text-5xl font-bold leading-[1.02] lg:text-7xl">
                Turn product photos into <span className="text-gradient">motion clips</span>
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-8 text-muted-foreground">
                Upload a product image or start from a prompt. Create product visuals and short AI videos for Reels, TikTok, ads, and product pages.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {["No filming", "No timeline editing", "One credit balance", "Up to 1080p"].map((item) => (
                  <span key={item} className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm text-muted-foreground">{item}</span>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap gap-4">
                <Button size="lg" className="h-14 px-8 text-lg gradient-primary shadow-glow" onClick={() => navigate("/auth")}>
                  <Sparkles className="mr-2 h-5 w-5" /> Create from a product
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => document.getElementById("example-output")?.scrollIntoView({ behavior: "smooth" })}>
                  See example output <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> Credits are visible before generation. Outputs vary by image, prompt, and model.
              </p>
            </motion.div>

            <motion.figure id="example-output" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-full max-w-sm">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-glow">
                <video src={HERO_VIDEO} className="aspect-[9/16] w-full object-cover" autoPlay muted loop playsInline preload="metadata" aria-label="Example AI motion clip generated with ClipMotion" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  <Play className="h-3.5 w-3.5" /> Example output
                </span>
              </div>
              <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                Example image-to-video result. Generative outputs vary from one run to another.
              </figcaption>
            </motion.figure>
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 bg-muted/20 py-8">
        <div className="container mx-auto grid grid-cols-4 gap-4 px-4 text-center">
          {[
            ["1 product image", "can start the workflow"],
            ["3 creation paths", "image, video, image → video"],
            ["1080p", "supported HD exports"],
            ["1 balance", "across available models"],
          ].map(([value, label]) => (
            <div key={value} className="rounded-2xl border border-border/60 bg-card/50 px-4 py-5">
              <div className="font-display text-2xl font-bold text-gradient">{value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">One product, multiple directions</p>
            <h2 className="mt-3 font-display text-4xl font-bold lg:text-5xl">Create the result you actually need</h2>
            <p className="mt-4 text-lg text-muted-foreground">The models stay available, but the workflow starts with the creative outcome.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {workflows.map((workflow) => (
              <Card key={workflow.title} className="h-full border-border/60 bg-card/60 hover:border-primary/30">
                <CardContent className="p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary"><workflow.icon className="h-6 w-6 text-primary-foreground" /></div>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold tracking-wider text-muted-foreground">{workflow.label}</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold">{workflow.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{workflow.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/25 py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center">
            <h2 className="font-display text-4xl font-bold lg:text-5xl">From product to motion in 3 steps</h2>
            <p className="mt-4 text-lg text-muted-foreground">No need to master every model before creating something useful.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ["01", "Start with a photo or prompt", "A clean product image gives the model a stronger visual reference."],
              ["02", "Choose the creation path", "Generate an image, generate a video, or animate an image you already have."],
              ["03", "Review, retry, export", "Keep the strongest take, retry when needed, then export your chosen result."],
            ].map(([n, title, text]) => (
              <div key={n} className="rounded-2xl border border-border bg-card/60 p-7">
                <span className="font-display text-sm font-bold text-primary">{n}</span>
                <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-4xl font-bold lg:text-5xl">Built around the workflow</h2>
            <p className="mt-4 text-lg text-muted-foreground">Leading models underneath, a simpler creative experience on top.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, description]) => (
              <Card key={title} className="border-border/60 bg-card/50">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted"><Icon className="h-5 w-5 text-primary" /></div>
                  <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/25 py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">What to expect</p>
            <h2 className="mt-3 font-display text-4xl font-bold">AI generation is creative, not deterministic.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              ClipMotion can produce strong creative directions, but exact details are not guaranteed on every run.
            </p>
          </div>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-7">
            <ul className="space-y-4">
              {expectations.map((item) => (
                <li key={item} className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-primary" /><span className="leading-7 text-muted-foreground">{item}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-14 text-center">
        <div className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground">Powered by leading generative models</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {["Higgsfield Soul", "Reve", "DoP", "Kling v2.1 Pro", "Seedance"].map((model) => (
              <span key={model} className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-sm text-muted-foreground">{model}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-muted/25 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-4xl font-bold lg:text-5xl">Simple credit pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground">Choose the plan that matches how much image and video generation you need.</p>
          </div>
          <div className="mt-12"><PricingPacks showFlashSale={false} /></div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl rounded-3xl gradient-primary p-12 text-center">
            <h2 className="font-display text-4xl font-bold text-primary-foreground">Make your product move.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">Start with one product image and explore image and motion concepts without a shoot or editing timeline.</p>
            <Button size="lg" variant="secondary" className="mt-7 h-14 px-8 text-lg" onClick={() => navigate("/auth")}>Start creating <ArrowRight className="ml-2 h-5 w-5" /></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/20 py-10">
        <div className="container mx-auto flex flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2"><img src="/logo.png" alt="ClipMotion" className="h-9 w-9 rounded-xl object-contain" /><span className="font-display text-lg font-bold text-gradient">ClipMotion</span></div>
            <p className="mt-2 text-sm text-muted-foreground">AI product visuals and motion clips for creators, brands, and agencies.</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <Link to="/features">Features</Link><Link to="/pricing">Pricing</Link><Link to="/use-cases">Use Cases</Link><Link to="/faq">FAQ</Link><Link to="/contact">Contact</Link><Link to="/privacy-policy">Privacy</Link><Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductMotionLandingPage;
