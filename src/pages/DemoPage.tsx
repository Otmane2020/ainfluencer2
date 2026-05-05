import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Sparkles, Images as ImagesIcon, ArrowRight, Heart, MessageCircle, Share2, Music2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

import sofaOriginal from "@/assets/demo/sofa-original.jpg";
import sofa1 from "@/assets/demo/sofa-1.jpg";
import sofa2 from "@/assets/demo/sofa-2.jpg";
import sofa3 from "@/assets/demo/sofa-3.jpg";
import watchOriginal from "@/assets/demo/watch-original.jpg";
import watch1 from "@/assets/demo/watch-1.jpg";
import watch2 from "@/assets/demo/watch-2.jpg";
import watch3 from "@/assets/demo/watch-3.jpg";

type DemoItem = {
  name: string;
  hashtag: string;
  original: string;
  generated: string[];
  caption: string;
};

const DEMOS: DemoItem[] = [
  {
    name: "Sofa",
    hashtag: "#InteriorDesign",
    original: sofaOriginal,
    generated: [sofa1, sofa2, sofa3],
    caption: "From plain studio shot → 3 lifestyle scenes in seconds 🛋️✨",
  },
  {
    name: "Watch",
    hashtag: "#LuxuryWatch",
    original: watchOriginal,
    generated: [watch1, watch2, watch3],
    caption: "One product photo → editorial campaign ready ⌚🔥",
  },
];

const STEPS = [
  { icon: Upload, title: "1. Upload", text: "Drop a single product photo" },
  { icon: Sparkles, title: "2. Generate", text: "Our AI re-imagines it" },
  { icon: ImagesIcon, title: "3. Multiply", text: "Get dozens of stunning shots" },
];

function TikTokPhone({ demo }: { demo: DemoItem }) {
  const [stage, setStage] = useState<"upload" | "generating" | "result">("upload");
  const [resultIdx, setResultIdx] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const cycle = async () => {
      while (mounted) {
        setStage("upload");
        await new Promise((r) => setTimeout(r, 2200));
        setStage("generating");
        await new Promise((r) => setTimeout(r, 2400));
        setStage("result");
        for (let i = 0; i < demo.generated.length; i++) {
          if (!mounted) return;
          setResultIdx(i);
          await new Promise((r) => setTimeout(r, 1800));
        }
      }
    };
    cycle();
    return () => {
      mounted = false;
    };
  }, [demo]);

  return (
    <div className="relative mx-auto w-[280px] h-[560px] rounded-[40px] bg-black p-2 shadow-2xl ring-1 ring-white/10">
      {/* Notch */}
      <div className="absolute left-1/2 top-2 z-30 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-black" />
      <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-gradient-to-b from-zinc-900 to-black">
        {/* Media */}
        <div className="absolute inset-0">
          {stage === "upload" && (
            <div key="upload" className="absolute inset-0 animate-fade-in">
              <img src={demo.original} alt={`${demo.name} original product`} className="h-full w-full object-cover opacity-90" loading="lazy" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                <div className="rounded-full bg-white/15 backdrop-blur-md p-5 ring-1 ring-white/30 animate-scale-in">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">Uploading {demo.name}…</span>
              </div>
            </div>
          )}
          {stage === "generating" && (
            <div key="gen" className="absolute inset-0 animate-fade-in">
              <img src={demo.original} alt="" className="h-full w-full object-cover blur-md scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/30 via-fuchsia-500/20 to-cyan-400/30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-pink-500/40" />
                  <div className="relative rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 p-5">
                    <Sparkles className="h-8 w-8 text-white animate-pulse" />
                  </div>
                </div>
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">AI Generating ✨</span>
              </div>
              {/* Scan line */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-[slide-in-right_2.4s_ease-in-out_infinite]" />
            </div>
          )}
          {stage === "result" && (
            <div key={`res-${resultIdx}`} className="absolute inset-0 animate-fade-in">
              <img
                src={demo.generated[resultIdx]}
                alt={`${demo.name} AI generated scene ${resultIdx + 1}`}
                className="h-full w-full object-cover animate-scale-in"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-semibold text-white">
                <span className="rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 px-2 py-0.5">AI Shot {resultIdx + 1}/{demo.generated.length}</span>
                <span className="rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">For You</span>
              </div>
            </div>
          )}
        </div>

        {/* TikTok overlay UI */}
        <div className="pointer-events-none absolute inset-0 flex">
          <div className="flex-1 flex flex-col justify-end p-3 text-white">
            <div className="text-sm font-bold drop-shadow">@clipmotion.ai</div>
            <div className="text-xs opacity-90 max-w-[180px] drop-shadow">{demo.caption}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] opacity-80">
              <Music2 className="h-3 w-3" />
              <span className="truncate">original sound · viral remix</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-cyan-300 drop-shadow">{demo.hashtag} #ProductShotAI #Shopify</div>
          </div>
          <div className="w-14 flex flex-col items-center justify-end gap-4 pb-4 pointer-events-auto">
            <button onClick={() => setLiked((v) => !v)} className="flex flex-col items-center gap-0.5">
              <Heart className={`h-7 w-7 ${liked ? "fill-pink-500 text-pink-500" : "text-white"} transition-transform hover:scale-110`} />
              <span className="text-[10px] text-white">{liked ? "12.4K" : "12.3K"}</span>
            </button>
            <div className="flex flex-col items-center gap-0.5">
              <MessageCircle className="h-7 w-7 text-white" />
              <span className="text-[10px] text-white">842</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Share2 className="h-7 w-7 text-white" />
              <span className="text-[10px] text-white">Share</span>
            </div>
            <div className="h-9 w-9 rounded-full border-2 border-white bg-gradient-to-br from-pink-500 to-cyan-400 animate-spin-slow" style={{ animation: "spin 6s linear infinite" }}>
              <Music2 className="h-4 w-4 text-white m-2.5" />
            </div>
          </div>
        </div>

        {/* Stage indicator dots */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {(["upload", "generating", "result"] as const).map((s) => (
            <span key={s} className={`h-1 w-6 rounded-full ${stage === s ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  useEffect(() => {
    document.title = "Live Demo: AI Product Shots from One Photo | ClipMotion";
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", "See how ClipMotion turns a single product image into dozens of scroll-stopping AI product shots — sofa & watch examples in TikTok-style preview.");
    setMeta("og:title", "Live Demo — One image, infinite product shots", "property");
    setMeta("og:description", "Upload → AI Generate → Get multiple stunning product photos. Try the live demo.", "property");
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = "https://clipmotion.ai/demo";
  }, []);

  return (
    <>

      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-16 pb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
            <Play className="h-3 w-3" /> Live Demo
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
            One Photo. Infinite Product Shots.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Upload a single product image. Our AI generates dozens of stunning, scroll-stopping visuals — ready for TikTok, Instagram & Shopify.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-pink-500 to-cyan-400 hover:opacity-90">
              <Link to="/auth">Try it free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/product-shots">Open Wizard</Link>
            </Button>
          </div>
        </section>

        {/* Steps */}
        <section className="container mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border bg-card p-6 hover-scale animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-cyan-400/20 text-primary mb-3">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.text}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Phone demos */}
        <section className="container mx-auto px-4 pb-20">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-2">See it live in TikTok format</h2>
          <p className="text-center text-muted-foreground mb-10">Two real examples — watch the full Upload → Generate → Multiply flow.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {DEMOS.map((d) => (
              <div key={d.name} className="flex flex-col items-center gap-6 animate-fade-in">
                <TikTokPhone demo={d} />
                <div className="text-center">
                  <h3 className="text-xl font-bold">{d.name} example</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">{d.caption}</p>
                </div>
                {/* Generated thumbnails */}
                <div className="flex gap-2">
                  <img src={d.original} alt={`${d.name} input`} className="h-16 w-16 rounded-lg object-cover ring-2 ring-primary/40" loading="lazy" />
                  <ArrowRight className="self-center h-5 w-5 text-muted-foreground" />
                  {d.generated.map((g, i) => (
                    <img key={i} src={g} alt={`${d.name} generated ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" loading="lazy" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 pb-24 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-pink-500/10 via-fuchsia-500/5 to-cyan-400/10 border border-primary/20 p-10 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold">Ready to multiply your catalog?</h2>
            <p className="mt-3 text-muted-foreground">Start free — no credit card required. Generate your first AI product shots in under 30 seconds.</p>
            <Button asChild size="lg" className="mt-6 bg-gradient-to-r from-pink-500 to-cyan-400 hover:opacity-90">
              <Link to="/auth">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
