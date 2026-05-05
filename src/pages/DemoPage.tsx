import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Sparkles, Images as ImagesIcon, ArrowRight, Heart, MessageCircle, Share2, Music2, Play, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import sofaOriginal from "@/assets/demo/sofa-original.jpg";
import sofa1 from "@/assets/demo/sofa-1.jpg";
import sofa2 from "@/assets/demo/sofa-2.jpg";
import sofa3 from "@/assets/demo/sofa-3.jpg";
import sofa4 from "@/assets/demo/sofa-4.jpg";
import sofa5 from "@/assets/demo/sofa-5.jpg";
import sofa6 from "@/assets/demo/sofa-6.jpg";
import watchOriginal from "@/assets/demo/watch-original.jpg";
import watch1 from "@/assets/demo/watch-1.jpg";
import watch2 from "@/assets/demo/watch-2.jpg";
import watch3 from "@/assets/demo/watch-3.jpg";
import watch4 from "@/assets/demo/watch-4.jpg";
import watch5 from "@/assets/demo/watch-5.jpg";
import watch6 from "@/assets/demo/watch-6.jpg";

type DemoItem = {
  name: string;
  hashtag: string;
  original: string;
  generated: string[];
  angles: string[];
  kinds: ("Studio" | "Lifestyle")[];
  caption: string;
};

const DEMOS: DemoItem[] = [
  {
    name: "Sofa",
    hashtag: "#InteriorDesign",
    original: sofaOriginal,
    // 3 studio (white bg) + 3 lifestyle (ambiance)
    generated: [sofa2, sofa4, sofa5, sofa1, sofa3, sofa6],
    angles: ["Detail", "Side", "Back", "Lifestyle", "Boho", "Loft"],
    kinds: ["Studio", "Studio", "Studio", "Lifestyle", "Lifestyle", "Lifestyle"],
    caption: "1 photo → 3 studio + 3 lifestyle scenes 🛋️✨",
  },
  {
    name: "Watch",
    hashtag: "#LuxuryWatch",
    original: watchOriginal,
    generated: [watch1, watch4, watch5, watch2, watch3, watch6],
    angles: ["Detail", "Profile", "Caseback", "Lifestyle", "On wrist", "Cinematic"],
    kinds: ["Studio", "Studio", "Studio", "Lifestyle", "Lifestyle", "Lifestyle"],
    caption: "1 photo → 3 studio + 3 ambiance shots ⌚🔥",
  },
];

const STEPS = [
  { icon: Upload, title: "1. Upload", text: "Drop a single product photo" },
  { icon: Sparkles, title: "2. Generate", text: "Our AI re-imagines it" },
  { icon: ImagesIcon, title: "3. Multiply", text: "Get studio + lifestyle shots" },
];

function TikTokPhone({ demo }: { demo: DemoItem }) {
  const [stage, setStage] = useState<"intro" | "uploading" | "uploaded" | "generating" | "result">("intro");
  const [revealCount, setRevealCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let mounted = true;
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    const cycle = async () => {
      while (mounted) {
        setStage("intro");
        setRevealCount(0);
        setProgress(0);
        await new Promise((r) => setTimeout(r, 1600));
        if (!mounted) return;
        setStage("uploading");
        // animate progress 0 -> 100 in ~1.8s
        let p = 0;
        progressInterval = setInterval(() => {
          p += 6;
          if (p >= 100) { p = 100; if (progressInterval) clearInterval(progressInterval); }
          setProgress(p);
        }, 110);
        await new Promise((r) => setTimeout(r, 2200));
        if (!mounted) return;
        setStage("uploaded");
        await new Promise((r) => setTimeout(r, 900));
        if (!mounted) return;
        setStage("generating");
        await new Promise((r) => setTimeout(r, 2400));
        if (!mounted) return;
        setStage("result");
        for (let i = 1; i <= demo.generated.length; i++) {
          if (!mounted) return;
          setRevealCount(i);
          await new Promise((r) => setTimeout(r, 380));
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
    };
    cycle();
    return () => {
      mounted = false;
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [demo]);

  return (
    <div className="relative mx-auto w-[280px] h-[560px] rounded-[40px] bg-black p-2 shadow-2xl ring-1 ring-white/10">
      {/* Notch */}
      <div className="absolute left-1/2 top-2 z-30 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-black" />
      <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-gradient-to-b from-zinc-900 to-black">
        {/* Media */}
        <div className="absolute inset-0">
          {/* INTRO — empty drop zone with hand pointer */}
          {stage === "intro" && (
            <div key="intro" className="absolute inset-0 animate-fade-in bg-gradient-to-br from-zinc-900 to-black flex flex-col items-center justify-center gap-4 p-6">
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">Step 1</div>
              <div className="relative w-44 h-44 rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-2 bg-white/5 backdrop-blur-sm">
                <Upload className="h-8 w-8 text-white/70" />
                <span className="text-[11px] text-white/70 text-center px-2">Drop your product photo</span>
                {/* Animated hand pointer */}
                <div
                  className="absolute -right-4 -bottom-4 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                  style={{ animation: "tap-hand 1.4s ease-in-out infinite" }}
                >
                  <MousePointer2 className="h-8 w-8 fill-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <span>Tap to upload</span>
                <ArrowRight className="h-3 w-3 animate-pulse" />
              </div>
            </div>
          )}

          {/* UPLOADING — progress bar over original */}
          {stage === "uploading" && (
            <div key="uploading" className="absolute inset-0 animate-fade-in bg-white">
              <img src={demo.original} alt={`${demo.name} original`} className="h-full w-full object-contain" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between text-[11px] text-white mb-2">
                  <span className="flex items-center gap-1.5"><Upload className="h-3 w-3" /> Uploading {demo.name}.jpg</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* UPLOADED — checkmark */}
          {stage === "uploaded" && (
            <div key="uploaded" className="absolute inset-0 animate-fade-in bg-white">
              <img src={demo.original} alt="" className="h-full w-full object-contain" loading="lazy" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-green-500 p-3 animate-scale-in shadow-2xl">
                  <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </div>
          )}

          {/* GENERATING — magical sparkles */}
          {stage === "generating" && (
            <div key="gen" className="absolute inset-0 animate-fade-in">
              <img src={demo.original} alt="" className="h-full w-full object-cover blur-md scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/40 via-fuchsia-500/30 to-cyan-400/40" />
              {/* Floating sparkle particles */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-white"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: `${(i * 53) % 100}%`,
                    animation: `sparkle-float ${2 + (i % 3) * 0.5}s ease-in-out ${i * 0.15}s infinite`,
                    boxShadow: "0 0 8px rgba(255,255,255,0.9)",
                  }}
                />
              ))}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-pink-500/40" />
                  <div className="relative rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 p-5">
                    <Sparkles className="h-8 w-8 text-white animate-pulse" />
                  </div>
                </div>
                <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">AI generating 6 shots ✨</span>
                <div className="flex gap-1">
                  {[0,1,2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80" style={{ animation: `dot-bounce 1s ${i * 0.15}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-[slide-in-right_2.4s_ease-in-out_infinite]" />
            </div>
          )}

          {/* RESULT — 3x2 mosaic, mixing studio (white bg label) + lifestyle */}
          {stage === "result" && (
            <div key="res" className="absolute inset-0 animate-fade-in bg-black">
              <div className="grid grid-cols-2 grid-rows-3 gap-1 h-full w-full p-1 pt-10 pb-20">
                {demo.generated.map((g, i) => {
                  const isStudio = demo.kinds[i] === "Studio";
                  return (
                    <div
                      key={i}
                      className={`relative overflow-hidden rounded-md transition-all duration-500 ${
                        i < revealCount ? "opacity-100 scale-100" : "opacity-0 scale-90"
                      } ${isStudio ? "bg-white" : "bg-black"}`}
                    >
                      <img
                        src={g}
                        alt={`${demo.name} AI ${demo.angles[i]}`}
                        className={`h-full w-full ${isStudio ? "object-contain p-1" : "object-cover"}`}
                        loading="lazy"
                      />
                      <span
                        className={`absolute top-0.5 left-0.5 rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider ${
                          isStudio ? "bg-white text-black" : "bg-gradient-to-r from-pink-500 to-cyan-400 text-white"
                        }`}
                      >
                        {isStudio ? "Studio" : "Lifestyle"}
                      </span>
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-white">
                        {demo.angles[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-semibold text-white">
                <span className="rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 px-2 py-0.5">
                  ✨ {revealCount}/{demo.generated.length} shots
                </span>
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
          {(["intro", "uploading", "generating", "result"] as const).map((s) => {
            const active = stage === s || (s === "uploading" && stage === "uploaded");
            return <span key={s} className={`h-1 w-5 rounded-full ${active ? "bg-white" : "bg-white/30"}`} />;
          })}
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
      <style>{`
        @keyframes tap-hand {
          0%, 100% { transform: translate(0, 0) rotate(-15deg); opacity: 1; }
          50% { transform: translate(-8px, -8px) rotate(-25deg); opacity: 0.7; }
        }
        @keyframes sparkle-float {
          0%, 100% { transform: translateY(0) scale(0.6); opacity: 0; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
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
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <div className="text-center">
                    <img src={d.original} alt={`${d.name} input`} className="h-20 w-20 rounded-lg object-cover ring-2 ring-primary/40" loading="lazy" />
                    <span className="block mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Original</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="grid grid-cols-3 gap-1.5">
                    {d.generated.map((g, i) => {
                      const isStudio = d.kinds[i] === "Studio";
                      return (
                        <div key={i} className={`relative rounded-lg overflow-hidden ${isStudio ? "bg-white ring-1 ring-border" : ""}`}>
                          <img
                            src={g}
                            alt={`${d.name} ${d.angles[i]}`}
                            className={`h-16 w-16 ${isStudio ? "object-contain p-0.5" : "object-cover"}`}
                            loading="lazy"
                          />
                          <span className={`absolute top-0.5 left-0.5 rounded px-1 text-[7px] font-bold uppercase ${isStudio ? "bg-foreground text-background" : "bg-gradient-to-r from-pink-500 to-cyan-400 text-white"}`}>
                            {isStudio ? "Studio" : "Live"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
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
