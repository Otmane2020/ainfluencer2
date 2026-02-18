import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

interface LiveViewersCountProps {
  planId?: string;
}

export const LiveViewersCount = ({ planId }: LiveViewersCountProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Simulate a realistic live viewer count
    const base = planId === "pro" ? 18 : planId === "business" ? 7 : 12;
    const variation = Math.floor(Math.random() * 6);
    setCount(base + variation);

    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(3, prev + delta);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [planId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <Eye className="h-3 w-3" />
      <span>{count} people viewing this plan</span>
    </motion.div>
  );
};
