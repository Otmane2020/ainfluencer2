import { useEffect, useState } from "react";
import { Sparkles, Camera, Wand2, Zap, Music } from "lucide-react";

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
 * Demo3 REEL — Pure 9:16 canvas (1080x1920) for Facebook/Instagram/TikTok.
 * No header, no marketing copy, no phone shell. Designed to be screen-recorded
 * with puppeteer at 1080x1920.
 */

type Scene = { id: string; duration: number; render: (p: number) => JSX.Element };

const SOFA = [sofa1, sofa2, sofa3, sofa4, sofa5, sofa6];
const WATCH = [watch1, watch2, watch3, watch4, watch5, watch6];

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export default function Demo3ReelPage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.title = "ClipMotion.ai — Reel";
    (window as any).__setReelTick = (ms: number) => setTick(ms);
    if ((window as any).__reelDeterministic) return;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      setTick(now - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scenes: Scene[] = [
    // 1 — HOOK
    {
      id: "hook",
      duration: 2400,
      render: (p) => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-600 via-pink-500 to-orange-400 text-white">
          <div
            className="text-center px-12"
            style={{
              transform: `scale(${0.5 + ease(Math.min(1, p * 1.6)) * 0.5})`,
              opacity: Math.min(1, p * 3),
            }}
          >
            <Sparkles className="mx-auto h-24 w-24 mb-6 drop-shadow-lg" />
            <p className="text-2xl uppercase tracking-[0.4em] opacity-90">ClipMotion.ai</p>
            <h2 className="mt-6 text-[140px] font-black leading-[0.95] drop-shadow-2xl">
              Stop paying<br />for studio<br />shoots.
            </h2>
            <p className="mt-8 text-4xl font-semibold opacity-95">
              1 photo → 6 pro shots in 30s
            </p>
          </div>
        </div>
      ),
    },
    // 2 — UPLOAD SOFA
    {
      id: "upload-sofa",
      duration: 2200,
      render: (p) => (
        <div className="absolute inset-0 bg-neutral-900">
          <img src={sofaOriginal} className="absolute inset-0 h-full w-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ opacity: Math.min(1, p * 2) }}
          >
            <div className="h-44 w-44 rounded-full bg-white flex items-center justify-center shadow-2xl">
              <Camera className="h-20 w-20 text-fuchsia-600" />
            </div>
            <div className="mt-8 rounded-full bg-black/80 px-8 py-4 text-3xl font-semibold text-white">
              Uploading sofa.jpg
            </div>
            <div className="mt-6 h-3 w-[600px] bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${Math.min(100, p * 100)}%` }} />
            </div>
          </div>
          <div
            className="absolute bottom-56 left-0 right-0 text-white text-center px-12"
            style={{ transform: `translateY(${(1 - ease(p)) * 40}px)`, opacity: ease(p) }}
          >
            <p className="text-6xl font-black drop-shadow-lg">Just one phone shot 📱</p>
          </div>
        </div>
      ),
    },
    // 3 — GENERATING
    {
      id: "gen",
      duration: 1800,
      render: (p) => (
        <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
          <img
            src={sofaOriginal}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: `blur(${20 + p * 30}px) brightness(${0.6 - p * 0.3})` }}
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-600/30 via-transparent to-purple-700/40" />
          <div
            className="absolute left-0 right-0 h-2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_60px_rgba(34,211,238,0.9)]"
            style={{ top: `${(p * 200) % 100}%` }}
          />
          <div className="relative text-center text-white px-12">
            <Wand2 className="mx-auto h-32 w-32 mb-8 animate-pulse" />
            <p className="text-8xl font-black tracking-tight">AI is shooting...</p>
            <p className="mt-6 text-3xl opacity-80">Generating 6 angles & scenes</p>
          </div>
        </div>
      ),
    },
    // 4 — MOSAIC SOFA
    {
      id: "mosaic-sofa",
      duration: 3200,
      render: (p) => (
        <div className="absolute inset-0 bg-white p-6 grid grid-cols-2 grid-rows-3 gap-6">
          {SOFA.map((src, i) => {
            const delay = i * 0.1;
            const local = Math.max(0, Math.min(1, (p - delay) * 3));
            return (
              <div
                key={i}
                className="relative overflow-hidden rounded-3xl bg-neutral-100"
                style={{
                  transform: `scale(${0.7 + ease(local) * 0.3}) rotate(${(1 - local) * (i % 2 ? -4 : 4)}deg)`,
                  opacity: local,
                }}
              >
                <img src={src} className="h-full w-full object-cover" alt="" />
                <span className="absolute bottom-4 left-4 rounded-lg bg-black/80 px-4 py-2 text-2xl uppercase text-white tracking-wider font-bold">
                  {i < 3 ? "Studio" : "Lifestyle"}
                </span>
              </div>
            );
          })}
          <div
            className="absolute top-12 left-1/2 -translate-x-1/2 rounded-full bg-black px-10 py-5 text-4xl font-black text-white shadow-2xl"
            style={{ opacity: Math.min(1, p * 4) }}
          >
            ✨ 6 shots ready
          </div>
        </div>
      ),
    },
    // 5 — TRANSITION
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
            className="relative text-center text-white px-12"
            style={{ transform: `scale(${0.8 + ease(p) * 0.2})`, opacity: ease(p) }}
          >
            <Zap className="mx-auto h-28 w-28 mb-6" />
            <p className="text-7xl font-black">Works for ANY product</p>
          </div>
        </div>
      ),
    },
    // 6 — UPLOAD WATCH
    {
      id: "upload-watch",
      duration: 1800,
      render: (p) => (
        <div className="absolute inset-0 bg-neutral-900">
          <img src={watchOriginal} className="absolute inset-0 h-full w-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ opacity: Math.min(1, p * 2) }}
          >
            <div className="h-40 w-40 rounded-full bg-white flex items-center justify-center shadow-2xl">
              <Camera className="h-16 w-16 text-orange-500" />
            </div>
            <div className="mt-8 rounded-full bg-black/80 px-8 py-4 text-3xl font-semibold text-white">
              Uploading watch.jpg
            </div>
          </div>
        </div>
      ),
    },
    // 7 — MOSAIC WATCH
    {
      id: "mosaic-watch",
      duration: 3000,
      render: (p) => (
        <div className="absolute inset-0 bg-white p-6 grid grid-cols-2 grid-rows-3 gap-6">
          {WATCH.map((src, i) => {
            const delay = i * 0.08;
            const local = Math.max(0, Math.min(1, (p - delay) * 3));
            return (
              <div
                key={i}
                className="relative overflow-hidden rounded-3xl bg-neutral-100"
                style={{
                  transform: `translateY(${(1 - ease(local)) * 80}px)`,
                  opacity: local,
                }}
              >
                <img src={src} className="h-full w-full object-cover" alt="" />
                <span className="absolute bottom-4 left-4 rounded-lg bg-black/80 px-4 py-2 text-2xl uppercase text-white tracking-wider font-bold">
                  {i < 3 ? "Studio" : "Lifestyle"}
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    // 8 — OUTRO TEXT (smart, animated, big CTA)
    {
      id: "outro",
      duration: 4200,
      render: (p) => {
        // Multi-step outro: kicker -> headline words stagger -> tagline -> URL chip
        const kicker = Math.min(1, p * 4);
        const w1 = Math.max(0, Math.min(1, (p - 0.1) * 4));
        const w2 = Math.max(0, Math.min(1, (p - 0.22) * 4));
        const w3 = Math.max(0, Math.min(1, (p - 0.34) * 4));
        const tag = Math.max(0, Math.min(1, (p - 0.5) * 3));
        const chip = Math.max(0, Math.min(1, (p - 0.65) * 3));
        const pulse = 1 + Math.sin(p * Math.PI * 4) * 0.03;

        const word = (
          local: number,
          children: React.ReactNode,
          className = "",
        ) => (
          <span
            className={`inline-block ${className}`}
            style={{
              opacity: ease(local),
              transform: `translateY(${(1 - ease(local)) * 60}px) scale(${0.85 + ease(local) * 0.15})`,
              filter: `blur(${(1 - ease(local)) * 12}px)`,
            }}
          >
            {children}
          </span>
        );

        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black via-neutral-950 to-fuchsia-950 text-white px-12 overflow-hidden">
            {/* animated glow */}
            <div
              className="absolute -inset-32 bg-gradient-to-tr from-fuchsia-500/30 via-transparent to-orange-400/30 blur-3xl"
              style={{ transform: `rotate(${p * 40}deg) scale(${1 + p * 0.2})` }}
            />
            <div className="relative text-center">
              <p
                className="text-3xl uppercase tracking-[0.5em] text-fuchsia-300"
                style={{ opacity: ease(kicker), letterSpacing: `${0.5 - (1 - ease(kicker)) * 0.3}em` }}
              >
                Try it free
              </p>
              <h2 className="mt-10 text-[150px] font-black leading-[0.95] tracking-tight">
                {word(w1, "ClipMotion")}
                <span
                  className="bg-gradient-to-r from-fuchsia-400 to-orange-400 bg-clip-text text-transparent inline-block"
                  style={{
                    opacity: ease(w2),
                    transform: `scale(${0.7 + ease(w2) * 0.3})`,
                  }}
                >
                  .ai
                </span>
                <br />
                <span style={{ opacity: ease(w3) }}>
                  {word(w3, "Pro shots.")}{" "}
                  {word(Math.max(0, Math.min(1, (p - 0.42) * 4)), "Zero studio.")}
                </span>
              </h2>
              <p
                className="mt-12 text-4xl opacity-90 font-light"
                style={{
                  opacity: ease(tag),
                  transform: `translateY(${(1 - ease(tag)) * 30}px)`,
                }}
              >
                Generated by AI · Ready in 30 seconds.
              </p>
              <div
                className="mt-16 inline-block rounded-full bg-white px-16 py-8 text-5xl font-black text-black shadow-2xl"
                style={{
                  opacity: ease(chip),
                  transform: `translateY(${(1 - ease(chip)) * 40}px) scale(${ease(chip) * pulse})`,
                }}
              >
                clipmotion.ai →
              </div>
            </div>
          </div>
        );
      },
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
    <div
      data-reel-canvas
      data-total-duration={totalDuration}
      className="fixed inset-0 overflow-hidden"
      style={{
        width: "100vw",
        height: "100vh",
        background:
          "radial-gradient(ellipse at top, hsl(292 60% 12%) 0%, #06080A 60%, #000 100%)",
      }}
    >
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-12 py-10">
        <p className="text-white text-3xl font-bold">
          ClipMotion<span className="text-fuchsia-400">.ai</span>
        </p>
        <div className="rounded-full bg-white px-8 py-3 text-2xl font-bold text-black">
          Try free
        </div>
      </header>

      {/* Phone shell — centered */}
      <div className="absolute inset-0 flex items-center justify-center pt-32 pb-10">
        <div className="relative">
          <div className="absolute -inset-12 bg-gradient-to-tr from-fuchsia-500/30 via-transparent to-orange-400/20 blur-3xl rounded-full" />
          <div className="relative w-[820px] h-[1640px] rounded-[120px] bg-neutral-950 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 h-20 w-72 rounded-b-[40px] bg-black" />
            <div className="absolute right-2 top-44 z-40 h-20 w-20 rounded-full bg-white/95 shadow-xl flex items-center justify-center text-3xl">
              🔇
            </div>
            <div className="relative h-full w-full rounded-[96px] overflow-hidden bg-black">
              {active.render(localProgress)}

              <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                <div className="bg-gradient-to-t from-black/85 to-transparent p-8 pb-10">
                  <div className="flex items-end justify-between text-white">
                    <div className="max-w-[70%] space-y-2">
                      <p className="text-3xl font-bold">@clipmotion.ai</p>
                      <p className="text-2xl leading-snug opacity-95">
                        1 photo → 6 pro shots ✨ Studio + lifestyle, instantly.
                      </p>
                      <p className="text-xl opacity-80 flex items-center gap-2">
                        <Music className="h-5 w-5" /> original sound · viral remix
                      </p>
                      <p className="text-xl text-cyan-300">
                        #ProductShotAI #Shopify #AIads
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-5">
                      <div className="flex flex-col items-center">
                        <div className="text-5xl">❤</div>
                        <span className="text-lg font-semibold">12.3K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-5xl">💬</div>
                        <span className="text-lg font-semibold">842</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-5xl">↗</div>
                        <span className="text-lg font-semibold">Share</span>
                      </div>
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 ring-2 ring-white" />
                    </div>
                  </div>
                </div>
                <div className="h-1 bg-white/15">
                  <div className="h-full bg-white" style={{ width: `${(t / totalDuration) * 100}%` }} />
                </div>
              </div>

              <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {scenes.map((s, i) => (
                  <div
                    key={s.id}
                    className={`h-1 rounded-full ${i === activeIdx ? "w-12 bg-white" : "w-6 bg-white/30"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
