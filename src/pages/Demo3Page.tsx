import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Share2, Music, Sparkles, Zap, Camera, Wand2 } from "lucide-react";

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

/**
 * Demo3 — TikTok-style vertical "video" promo for ClipMotion.ai Product Shot.
 * Pure CSS/React frame-based animation (no external video). Loops automatically.
 * Designed for Facebook / Instagram / TikTok ad creatives.
 */

type Scene = {
  id: string;
  duration: number; // ms
  render: (progress: number) => JSX.Element;
};

const SOFA_SHOTS = [sofa1, sofa2, sofa3, sofa4, sofa5, sofa6];
const WATCH_SHOTS = [watch1, watch2, watch3, watch4, watch5, watch6];

export default function Demo3Page() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      setTick(now - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Build the storyboard (two products)
  const scenes: Scene[] = [
    // 1 — Hook
    {
      id: "hook",
      duration: 2400,
      render: (p) => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-600 via-pink-500 to-orange-400 text-white">
          <div
            className="text-center px-6"
            style={{
              transform: `scale(${0.6 + Math.min(1, p * 2) * 0.4})`,
              opacity: Math.min(1, p * 3),
            }}
          >
            <Sparkles className="mx-auto h-10 w-10 mb-3 drop-shadow" />
            <p className="text-xs uppercase tracking-[0.3em] opacity-90">ClipMotion.ai</p>
            <h2 className="mt-2 text-3xl font-black leading-tight drop-shadow">
              Stop paying<br />for studio shoots.
            </h2>
            <p className="mt-3 text-sm opacity-95">1 photo → 6 pro shots in 30s</p>
          </div>
        </div>
      ),
    },
    // 2 — Upload sofa
    {
      id: "upload-sofa",
      duration: 2200,
      render: (p) => (
        <div className="absolute inset-0 bg-neutral-100">
          <img src={sofaOriginal} className="absolute inset-0 h-full w-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ opacity: Math.min(1, p * 2) }}
          >
            <div className="h-16 w-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl">
              <Camera className="h-7 w-7 text-fuchsia-600" />
            </div>
            <div className="mt-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              Uploading sofa.jpg
            </div>
            <div className="mt-2 h-1 w-40 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${Math.min(100, p * 100)}%` }} />
            </div>
          </div>
          <div
            className="absolute bottom-20 left-4 right-4 text-white text-center"
            style={{ transform: `translateY(${(1 - p) * 20}px)`, opacity: p }}
          >
            <p className="text-lg font-bold drop-shadow">Just one phone shot 📱</p>
          </div>
        </div>
      ),
    },
    // 3 — Generating
    {
      id: "gen-sofa",
      duration: 1800,
      render: (p) => (
        <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
          <img
            src={sofaOriginal}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: `blur(${8 + p * 12}px) brightness(${0.6 - p * 0.3})` }}
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-600/30 via-transparent to-purple-700/40" />
          {/* scanning line */}
          <div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_30px_rgba(34,211,238,0.9)]"
            style={{ top: `${(p * 200) % 100}%` }}
          />
          <div className="relative text-center text-white px-6">
            <Wand2 className="mx-auto h-12 w-12 mb-3 animate-pulse" />
            <p className="text-2xl font-black tracking-tight">AI is shooting...</p>
            <p className="mt-1 text-sm opacity-80">Generating 6 angles & scenes</p>
          </div>
        </div>
      ),
    },
    // 4 — Mosaic sofa reveal
    {
      id: "mosaic-sofa",
      duration: 3200,
      render: (p) => (
        <div className="absolute inset-0 bg-white p-1.5 grid grid-cols-2 grid-rows-3 gap-1.5">
          {SOFA_SHOTS.map((src, i) => {
            const delay = i * 0.1;
            const local = Math.max(0, Math.min(1, (p - delay) * 3));
            return (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg bg-neutral-100"
                style={{
                  transform: `scale(${0.7 + local * 0.3}) rotate(${(1 - local) * (i % 2 ? -4 : 4)}deg)`,
                  opacity: local,
                }}
              >
                <img src={src} className="h-full w-full object-cover" alt="" />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] uppercase text-white tracking-wider">
                  {i < 3 ? "Studio" : "Lifestyle"}
                </span>
              </div>
            );
          })}
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/85 px-3 py-1 text-[11px] font-bold text-white"
            style={{ opacity: Math.min(1, p * 4) }}
          >
            ✨ 6 shots ready
          </div>
        </div>
      ),
    },
    // 5 — Transition card
    {
      id: "transition",
      duration: 1200,
      render: (p) => (
        <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-tr from-orange-500 via-pink-500 to-fuchsia-600"
            style={{ clipPath: `circle(${p * 120}% at 50% 50%)` }}
          />
          <div
            className="relative text-center text-white px-6"
            style={{ transform: `scale(${0.8 + p * 0.2})`, opacity: p }}
          >
            <Zap className="mx-auto h-10 w-10 mb-2" />
            <p className="text-2xl font-black">Works for ANY product</p>
          </div>
        </div>
      ),
    },
    // 6 — Upload watch
    {
      id: "upload-watch",
      duration: 1800,
      render: (p) => (
        <div className="absolute inset-0 bg-neutral-50">
          <img src={watchOriginal} className="absolute inset-0 h-full w-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ opacity: Math.min(1, p * 2) }}
          >
            <div className="h-14 w-14 rounded-full bg-white/95 flex items-center justify-center shadow-2xl">
              <Camera className="h-6 w-6 text-orange-500" />
            </div>
            <div className="mt-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              Uploading watch.jpg
            </div>
          </div>
        </div>
      ),
    },
    // 7 — Mosaic watch
    {
      id: "mosaic-watch",
      duration: 3000,
      render: (p) => (
        <div className="absolute inset-0 bg-white p-1.5 grid grid-cols-2 grid-rows-3 gap-1.5">
          {WATCH_SHOTS.map((src, i) => {
            const delay = i * 0.08;
            const local = Math.max(0, Math.min(1, (p - delay) * 3));
            return (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg bg-neutral-100"
                style={{
                  transform: `translateY(${(1 - local) * 30}px)`,
                  opacity: local,
                }}
              >
                <img src={src} className="h-full w-full object-cover" alt="" />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] uppercase text-white tracking-wider">
                  {i < 3 ? "Studio" : "Lifestyle"}
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    // 8 — CTA
    {
      id: "cta",
      duration: 2600,
      render: (p) => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-fuchsia-950 text-white px-6">
          <div style={{ transform: `scale(${0.7 + Math.min(1, p * 2) * 0.3})`, opacity: Math.min(1, p * 2) }}>
            <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Try it free</p>
            <h2 className="mt-2 text-center text-4xl font-black leading-tight">
              ClipMotion<span className="text-fuchsia-400">.ai</span>
            </h2>
            <p className="mt-3 text-center text-sm opacity-80">
              Pro product shots — generated by AI.
            </p>
          </div>
          <div
            className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-black shadow-2xl"
            style={{
              opacity: Math.max(0, p - 0.3),
              transform: `translateY(${(1 - Math.max(0, p - 0.3)) * 20}px)`,
            }}
          >
            👉 Start now — free trial
          </div>
        </div>
      ),
    },
  ];

  const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);
  const t = tick % totalDuration;

  let acc = 0;
  let activeIdx = 0;
  let localProgress = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (t >= acc && t < acc + scenes[i].duration) {
      activeIdx = i;
      localProgress = (t - acc) / scenes[i].duration;
      break;
    }
    acc += scenes[i].duration;
  }
  const active = scenes[activeIdx];

  return (
    <>
      {/* SEO via document head effect */}
      <SeoHead />


      <div className="min-h-screen bg-[#06080A] text-white">
        {/* Header */}
        <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
          <Link to="/" className="text-sm font-bold tracking-wide">
            ClipMotion<span className="text-fuchsia-400">.ai</span>
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-white text-black text-xs font-bold px-4 py-2 hover:scale-105 transition-transform"
          >
            Try free
          </Link>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10 items-center">
          {/* LEFT — copy */}
          <div className="space-y-5 order-2 md:order-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 text-fuchsia-300 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3 w-3" /> AI Product Shot
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              One photo.<br />
              Six pro shots.<br />
              <span className="bg-gradient-to-r from-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
                Thirty seconds.
              </span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              ClipMotion.ai turns any product photo into a complete catalog —
              studio packshots and lifestyle scenes — ready for Shopify,
              Amazon, TikTok and Meta ads.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="rounded-full bg-white text-black px-5 py-3 font-bold text-sm hover:scale-105 transition-transform"
              >
                Start free →
              </Link>
              <Link
                to="/demo"
                className="rounded-full border border-white/20 px-5 py-3 font-semibold text-sm hover:bg-white/5"
              >
                See more examples
              </Link>
            </div>
            <div className="flex gap-6 pt-4 text-xs text-white/50">
              <div><span className="text-white text-lg font-bold block">30s</span>per generation</div>
              <div><span className="text-white text-lg font-bold block">6×</span>shots per upload</div>
              <div><span className="text-white text-lg font-bold block">$0</span>studio cost</div>
            </div>
          </div>

          {/* RIGHT — phone frame with looping promo */}
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-8 bg-gradient-to-tr from-fuchsia-500/30 via-transparent to-orange-400/20 blur-3xl rounded-full" />

              {/* iPhone shell */}
              <div className="relative w-[300px] h-[620px] rounded-[48px] bg-neutral-950 p-3 shadow-2xl ring-1 ring-white/10">
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 h-7 w-28 rounded-b-2xl bg-black" />
                {/* Screen */}
                <div className="relative h-full w-full rounded-[36px] overflow-hidden bg-black">
                  {/* Active scene */}
                  {active.render(localProgress)}

                  {/* Persistent TikTok UI overlay */}
                  <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                    <div className="bg-gradient-to-t from-black/80 to-transparent p-3 pb-4">
                      <div className="flex items-end justify-between text-white">
                        <div className="max-w-[70%] space-y-1">
                          <p className="text-sm font-bold">@clipmotion.ai</p>
                          <p className="text-[11px] leading-snug opacity-95">
                            1 photo → 6 pro shots ✨ Studio + lifestyle, instantly.
                          </p>
                          <p className="text-[10px] opacity-80 flex items-center gap-1">
                            <Music className="h-3 w-3" /> original sound · viral remix
                          </p>
                          <p className="text-[10px] text-cyan-300">
                            #ProductShotAI #Shopify #AIads
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 text-white">
                          <div className="flex flex-col items-center">
                            <Heart className="h-6 w-6" fill="currentColor" />
                            <span className="text-[10px]">12.3K</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <MessageCircle className="h-6 w-6" />
                            <span className="text-[10px]">842</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Share2 className="h-6 w-6" />
                            <span className="text-[10px]">Share</span>
                          </div>
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 ring-2 ring-white" />
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-0.5 bg-white/15">
                      <div
                        className="h-full bg-white"
                        style={{ width: `${(t / totalDuration) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Scene dots */}
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex gap-1">
                    {scenes.map((s, i) => (
                      <div
                        key={s.id}
                        className={`h-0.5 rounded-full transition-all ${
                          i === activeIdx ? "w-6 bg-white" : "w-3 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom strip */}
        <section className="border-t border-white/5 py-12 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Trusted by creators</p>
          <h2 className="mt-3 text-2xl md:text-3xl font-black">
            Replace your $500 photoshoot with one upload.
          </h2>
          <Link
            to="/auth"
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-7 py-3 text-sm font-bold text-black hover:scale-105 transition-transform"
          >
            Generate my product shots →
          </Link>
        </section>
      </div>
    </>
  );
}
