import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, Image as ImageIcon, Megaphone, Wand2, Layers, Calendar } from "lucide-react";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
  route: string;
  badge?: string;
}

const features: Feature[] = [
  {
    id: "product-shots",
    title: "Product Shots",
    description: "1 photo → 10 pro images",
    icon: Camera,
    gradient: "from-emerald-500 via-green-500 to-lime-500",
    shadowColor: "shadow-emerald-500/30",
    route: "/product-shots",
    badge: "FLAGSHIP",
  },
  {
    id: "images",
    title: "AI Image",
    description: "Smart visuals on demand",
    icon: ImageIcon,
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    shadowColor: "shadow-orange-500/30",
    route: "/images",
    badge: "AI",
  },
  {
    id: "campaigns",
    title: "Campaigns",
    description: "Auto-generate content series",
    icon: Megaphone,
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    shadowColor: "shadow-rose-500/30",
    route: "/campaigns",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Plan your posts",
    icon: Calendar,
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    shadowColor: "shadow-sky-500/30",
    route: "/calendar",
  },
  {
    id: "projects",
    title: "Projects",
    description: "Brand kits & catalogs",
    icon: Layers,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    shadowColor: "shadow-violet-500/30",
    route: "/projects",
  },
];

export function FeatureShowcase() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg md:text-xl font-semibold">
          Product Shot Studio
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {features.map((feature, index) => (
          <motion.button
            key={feature.id}
            onClick={() => navigate(feature.route)}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 100, damping: 15 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative overflow-hidden rounded-2xl p-4 md:p-5 text-left transition-all duration-300 hover:shadow-2xl ${feature.shadowColor} bg-gradient-to-br ${feature.gradient}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60" />
            {feature.badge && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                <span className="text-[9px] md:text-[10px] font-bold text-white uppercase tracking-wider">
                  {feature.badge}
                </span>
              </div>
            )}
            <div className="relative z-10 text-white h-full flex flex-col">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-lg" />
              </div>
              <h3 className="font-display font-bold text-sm md:text-base text-white drop-shadow-md">
                {feature.title}
              </h3>
              <p className="text-[10px] md:text-xs text-white/80 mt-1 line-clamp-2 drop-shadow">
                {feature.description}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
