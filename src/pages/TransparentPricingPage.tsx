import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { PricingPacks } from "@/components/PricingPacks";
import { Check, Coins, Image, ShieldCheck, Video } from "lucide-react";

const faq = [
  {
    q: "How do credits work?",
    a: "Your subscription includes a monthly credit balance. The cost of a generation is shown in the product before you submit it, so you can decide whether to run it.",
  },
  {
    q: "Will every generation look perfect?",
    a: "No. Generative AI varies from run to run. Product geometry, logos, small text, hands, reflections, and fine details can occasionally drift. A retry may produce a better take.",
  },
  {
    q: "Which input gives the most consistent product motion?",
    a: "For image-to-video, start with a clean, well-lit image where the product is clearly visible and not heavily obstructed. This gives the model a stronger visual reference.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. You can manage or cancel an active subscription from your account. Access and billing follow the terms shown during checkout.",
  },
  {
    q: "Which models are available?",
    a: "ClipMotion currently exposes supported image and video models including Higgsfield Soul, Reve, DoP, Kling, and Seedance. Availability can evolve as model providers change.",
  },
];

const TransparentPricingPage = () => {
  return (
    <PublicPageLayout>
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Transparent credit pricing
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold md:text-6xl">
              Pay for the creative volume you <span className="text-gradient">actually need</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Choose a monthly plan, see the generation cost before you create, and use one credit balance across ClipMotion's supported image and video workflows.
            </p>
          </div>

          <div className="mx-auto mt-9 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
            {[
              "No fake live-viewer counters",
              "No fake limited-time countdown",
              "Generation cost shown upfront",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <PricingPacks showFlashSale={false} />
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 bg-muted/25 py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold">How the balance is used</h2>
            <p className="mt-3 text-muted-foreground">
              Image and video generations consume different amounts of compute, so their credit costs are different.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/60 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Image className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI image generation</h3>
                  <p className="text-sm text-muted-foreground">Lower compute cost per generation</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Use image generations for studio concepts, lifestyle directions, backgrounds, and creative exploration before you animate the strongest result.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI video generation</h3>
                  <p className="text-sm text-muted-foreground">Higher compute cost per generation</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Use video credits for text-to-video and image-to-video motion. The exact cost shown in the interface is the source of truth before you submit a job.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-left">
            <Coins className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-6 text-muted-foreground">
              Model providers and compute costs can change. ClipMotion should show the current credit cost in-product rather than relying on an old marketing claim.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="text-center font-display text-3xl font-bold">Pricing FAQ</h2>
          <div className="mt-10 space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-border bg-card/60 p-6">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default TransparentPricingPage;
