import { motion } from "framer-motion";
import { Wand2, Zap, Volume2, Check } from "lucide-react";

export function AudioGenerationFlow() {
  const steps = [
    {
      icon: Wand2,
      title: "Script / Prompt",
      description: "Write or paste your text",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Zap,
      title: "AI Processing",
      description: "Convert text to natural speech",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Volume2,
      title: "Voice Generation",
      description: "30+ professional voices available",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Check,
      title: "Ready to Use",
      description: "Download or use in your video",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="w-full">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+56px)] top-12 w-[calc(100%-112px)] h-1 bg-gradient-to-r from-primary/50 to-transparent hidden lg:block" />
                )}

                <div className="relative">
                  {/* Step card */}
                  <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 h-full">
                    {/* Icon circle */}
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${step.color} mb-4 text-white shadow-lg`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm md:text-base">{step.title}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>

                    {/* Step number */}
                    <div className="absolute top-3 right-3 text-xs font-bold text-muted-foreground/50">
                      Step {index + 1}
                    </div>
                  </div>

                  {/* Arrow for mobile */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center lg:hidden my-2">
                      <div className="text-primary/50">↓</div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Features list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Audio Generation Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Natural language processing",
              "Multiple voice options",
              "Custom pronunciation",
              "Adjustable speech rate",
              "Background noise removal",
              "Multi-language support",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
