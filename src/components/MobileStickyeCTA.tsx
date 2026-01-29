import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface MobileStickyCtaProps {
  showFlashSale?: boolean;
}

export function MobileStickyCta({ showFlashSale = true }: MobileStickyCtaProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 33 });

  // Show CTA after scrolling a bit
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Countdown timer for flash sale
  useEffect(() => {
    if (!showFlashSale) return;
    
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
  }, [showFlashSale]);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Flash Sale Banner */}
          {showFlashSale && (
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-4 py-2">
              <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
                <Zap className="h-4 w-4 animate-pulse" />
                <span>FLASH SALE - Up to 50% OFF</span>
                <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-0.5">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Main CTA */}
          <div className="bg-background/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Start creating viral content</p>
                <p className="text-xs text-muted-foreground">Free trial • No credit card</p>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className="gradient-primary shadow-glow shrink-0"
                size="default"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                Get Started
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MobileStickyCta;
