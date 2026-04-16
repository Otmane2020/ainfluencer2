import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const VIDEOS = [
  {
    src: "/videos/saas-promo.mp4",
    label: "SaaS Promo",
    badge: "16:9 · Brand",
    description: "Vidéo de présentation produit avec mockup 3D animé",
    accent: "#6c47ff",
    orientation: "landscape" as const,
  },
  {
    src: "/videos/quote-reel.mp4",
    label: "Quote Reel",
    badge: "9:16 · Viral",
    description: "Citation animée mot par mot, style TikTok/Reels",
    accent: "#ff6b35",
    orientation: "portrait" as const,
  },
  {
    src: "/videos/podcast-clip.mp4",
    label: "Podcast Clip",
    badge: "9:16 · Content",
    description: "Captions synchronisées avec waveform audio réactif",
    accent: "#00d4ff",
    orientation: "portrait" as const,
  },
];

const VideoCard = ({
  video,
  isActive,
  onClick,
}: {
  video: (typeof VIDEOS)[0];
  isActive: boolean;
  onClick: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive]);

  const isPortrait = video.orientation === "portrait";

  return (
    <motion.div
      layout
      onClick={onClick}
      className="relative cursor-pointer group"
      animate={{
        flex: isActive ? 2.2 : 1,
        opacity: isActive ? 1 : 0.6,
      }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      style={{ minWidth: 0 }}
    >
      {/* Video container */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10"
        style={{
          aspectRatio: isPortrait ? "9/16" : "16/9",
          maxHeight: "520px",
          background: "#0a0a0f",
          boxShadow: isActive
            ? `0 0 0 2px ${video.accent}, 0 32px 80px rgba(0,0,0,0.5)`
            : "0 8px 32px rgba(0,0,0,0.3)",
          transition: "box-shadow 0.4s ease",
        }}
      >
        <video
          ref={videoRef}
          src={video.src}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />

        {/* Overlay gradient quand inactif */}
        <AnimatePresence>
          {!isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Play className="h-6 w-6 text-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls quand actif */}
        {isActive && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => !m);
              }}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-white" />
              ) : (
                <Volume2 className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: `${video.accent}cc`, backdropFilter: "blur(8px)" }}
          >
            {video.badge}
          </span>
        </div>
      </div>

      {/* Info sous la video */}
      <motion.div
        className="mt-3 px-1"
        animate={{ opacity: isActive ? 1 : 0.5 }}
      >
        <p className="font-semibold text-sm text-foreground">{video.label}</p>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground mt-0.5"
          >
            {video.description}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

export const VideoShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Avance automatiquement toutes les 7s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % VIDEOS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-4">
            <Maximize2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide uppercase">Made with ClipMotion</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Real Videos,{" "}
            <span className="text-gradient">Zero Effort</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Ces vidéos ont été générées en quelques secondes avec ClipMotion.
            Prêtes à poster sur Instagram, TikTok et YouTube.
          </p>
        </motion.div>

        {/* Video cards */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="flex gap-4 items-end justify-center"
          style={{ maxWidth: 1100, margin: "0 auto" }}
        >
          {VIDEOS.map((video, i) => (
            <VideoCard
              key={video.src}
              video={video}
              isActive={activeIndex === i}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </motion.div>

        {/* Dots navigation */}
        <div className="flex justify-center gap-2 mt-8">
          {VIDEOS.map((v, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: activeIndex === i ? 28 : 8,
                height: 8,
                background: activeIndex === i ? v.accent : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10"
        >
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-semibold">100% gratuit</span> pour commencer ·
            Aucune carte bancaire requise
          </p>
        </motion.div>
      </div>
    </section>
  );
};
