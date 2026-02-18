import { motion } from "framer-motion";
import { Users, Flame, TrendingUp } from "lucide-react";

interface PlanPopularityBadgeProps {
  planId: string;
}

const PLAN_NUDGES: Record<string, { icon: typeof Users; text: string; color: string }> = {
  starter: {
    icon: Users,
    text: "324 creators chose this month",
    color: "text-blue-400",
  },
  pro: {
    icon: Flame,
    text: "Most popular · 1,247 active users",
    color: "text-primary",
  },
  business: {
    icon: TrendingUp,
    text: "Top agencies pick this · 89 this week",
    color: "text-purple-400",
  },
};

export const PlanPopularityBadge = ({ planId }: PlanPopularityBadgeProps) => {
  const nudge = PLAN_NUDGES[planId];
  if (!nudge) return null;

  const Icon = nudge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 }}
      className="flex items-center justify-center gap-1.5 text-[11px] font-medium mt-2"
    >
      <Icon className={`h-3 w-3 ${nudge.color}`} />
      <span className="text-muted-foreground">{nudge.text}</span>
    </motion.div>
  );
};
