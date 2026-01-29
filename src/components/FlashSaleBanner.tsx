import { motion } from "framer-motion";
import { Zap, Clock, Gift } from "lucide-react";
import { useState, useEffect } from "react";

interface FlashSaleBannerProps {
  className?: string;
}

export function FlashSaleBanner({ className }: FlashSaleBannerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 33 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 py-2 px-4 ${className}`}
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-2 md:gap-4 text-white text-sm">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 animate-pulse" />
          <span className="font-bold">FLASH SALE</span>
        </div>
        <span className="hidden sm:inline">•</span>
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          <span>Up to <strong>50% OFF</strong> all plans</span>
        </div>
        <span className="hidden sm:inline">•</span>
        <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono font-bold">
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default FlashSaleBanner;
