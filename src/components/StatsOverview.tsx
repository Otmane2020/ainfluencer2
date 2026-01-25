import { motion } from "framer-motion";
import { TrendingUp, Users, Heart, MessageCircle } from "lucide-react";

interface Stat {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
}

export const StatsOverview = () => {
  const stats: Stat[] = [
    {
      label: "Posts générés",
      value: "156",
      change: "+12 cette semaine",
      changeType: "positive",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Abonnés totaux",
      value: "24.5K",
      change: "+1.2K ce mois",
      changeType: "positive",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Engagement moyen",
      value: "8.4%",
      change: "+0.5% vs mois dernier",
      changeType: "positive",
      icon: <Heart className="h-5 w-5" />,
    },
    {
      label: "Commentaires",
      value: "3,847",
      change: "+234 cette semaine",
      changeType: "positive",
      icon: <MessageCircle className="h-5 w-5" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * index }}
          className="rounded-2xl bg-card p-5 shadow-card transition-all hover:shadow-glow"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white">
              {stat.icon}
            </div>
            <span
              className={`text-sm font-medium ${
                stat.changeType === "positive"
                  ? "text-green-600"
                  : stat.changeType === "negative"
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {stat.change}
            </span>
          </div>
          <div className="mt-4">
            <p className="font-display text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
