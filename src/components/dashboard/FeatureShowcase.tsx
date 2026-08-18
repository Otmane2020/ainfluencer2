import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router-compat";
import { ArrowRight, Film, Image as ImageIcon, Mic2, Sparkles } from "lucide-react";

const features = [
  {
    id: "motion",
    title: "Product Motion",
    description: "Upload a product photo and turn it into a short ad-ready motion clip.",
    icon: Film,
    route: "/create",
    badge: "CORE",
  },
  {
    id: "visuals",
    title: "Product Visuals",
    description: "Create studio, lifestyle, luxury and social campaign concepts.",
    icon: ImageIcon,
    route: "/images",
    badge: "",
  },

  {
    id: "voice",
    title: "AI Voiceover",
    description: "Generate natural Deepgram Aura-2 narration for your product ads.",
    icon: Mic2,
    route: "/voiceover",
    badge: "NEW",
  },
] as const;

export function FeatureShowcase() {
  const navigate = useNavigate();

  return (
    <section className="rounded-3xl border border-border bg-card/50 p-5 md:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Create with ClipMotion</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">One product. Three creative outputs.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start from the result you need. Model selection stays optional and lives under Advanced controls.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.button
            key={feature.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate(feature.route)}
            className="group relative overflow-hidden rounded-2xl border border-border bg-background p-5 text-left transition-all hover:border-primary/30 hover:shadow-lg"
          >
            {feature.badge && (
              <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold tracking-wider text-primary">
                {feature.badge}
              </span>
            )}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Create <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
