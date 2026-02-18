import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, CheckCircle2 } from "lucide-react";

const SOCIAL_PROOF_MESSAGES = [
  { icon: Users, text: "Sarah from Austin just subscribed to Pro", time: "2 min ago" },
  { icon: CheckCircle2, text: "Mike generated 14 videos today with Business", time: "5 min ago" },
  { icon: TrendingUp, text: "127 creators signed up this week", time: "Just now" },
  { icon: Users, text: "Emma from Sydney upgraded to Business", time: "8 min ago" },
  { icon: CheckCircle2, text: "Alex launched 3 campaigns on Pro plan", time: "12 min ago" },
  { icon: TrendingUp, text: "2,340 videos generated today", time: "Live" },
  { icon: Users, text: "Jessica from LA chose the Pro plan", time: "3 min ago" },
  { icon: CheckCircle2, text: "David saved 20 hours this week with AI", time: "15 min ago" },
];

interface SocialProofToastProps {
  /** Delay before first toast in ms */
  initialDelay?: number;
  /** Interval between toasts in ms */
  interval?: number;
}

export const SocialProofToast = ({ initialDelay = 5000, interval = 15000 }: SocialProofToastProps) => {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setCurrentIndex(0);
      setVisible(true);
    }, initialDelay);

    return () => clearTimeout(startTimer);
  }, [initialDelay]);

  useEffect(() => {
    if (currentIndex < 0) return;

    // Hide after 4 seconds
    const hideTimer = setTimeout(() => setVisible(false), 4000);

    // Show next after interval
    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % SOCIAL_PROOF_MESSAGES.length);
      setVisible(true);
    }, interval);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [currentIndex, interval]);

  const message = currentIndex >= 0 ? SOCIAL_PROOF_MESSAGES[currentIndex] : null;

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-6 z-50 max-w-xs"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <message.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">{message.text}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{message.time}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
