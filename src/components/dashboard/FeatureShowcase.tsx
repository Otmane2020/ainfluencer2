import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";

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

const features: Feature[] = [];

export function FeatureShowcase() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg md:text-xl font-semibold">
          AI Creation Studio
        </h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {features.map((feature, index) => (
          <motion.button
            key={feature.id}
            onClick={() => navigate(feature.route)}
            initial={{ opacity: 0, y: 30, rotateX: -15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{
              delay: index * 0.08,
              type: "spring",
              stiffness: 100,
              damping: 15,
            }}
            whileHover={{
              scale: 1.05,
              rotateY: 5,
              rotateX: 5,
              z: 50,
            }}
            whileTap={{ scale: 0.98 }}
            className={`
              group relative overflow-hidden rounded-2xl p-4 md:p-5 
              text-left transition-all duration-300
              hover:shadow-2xl ${feature.shadowColor}
              bg-gradient-to-br ${feature.gradient}
              transform-gpu perspective-1000
            `}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60" />
            
            {/* Animated shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            {/* Badge */}
            {feature.badge && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                <span className="text-[9px] md:text-[10px] font-bold text-white uppercase tracking-wider">
                  {feature.badge}
                </span>
              </div>
            )}

            {/* Content */}
            <div className="relative z-10 text-white h-full flex flex-col">
              {/* 3D Icon container */}
              <div 
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-lg transform-gpu transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1"
                style={{
                  transform: "translateZ(20px)",
                }}
              >
                <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-lg" />
              </div>

              {/* Text */}
              <h3 
                className="font-display font-bold text-sm md:text-base text-white drop-shadow-md"
                style={{ transform: "translateZ(15px)" }}
              >
                {feature.title}
              </h3>
              <p 
                className="text-[10px] md:text-xs text-white/80 mt-1 line-clamp-2 drop-shadow"
                style={{ transform: "translateZ(10px)" }}
              >
                {feature.description}
              </p>

              {/* Floating particles effect */}
              <div className="absolute -bottom-2 -right-2 h-16 w-16 opacity-20">
                <div className="absolute h-2 w-2 rounded-full bg-white animate-pulse" style={{ top: "20%", left: "30%" }} />
                <div className="absolute h-1.5 w-1.5 rounded-full bg-white animate-pulse" style={{ top: "50%", left: "60%", animationDelay: "0.3s" }} />
                <div className="absolute h-1 w-1 rounded-full bg-white animate-pulse" style={{ top: "70%", left: "40%", animationDelay: "0.6s" }} />
              </div>
            </div>

            {/* Bottom reflection */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
