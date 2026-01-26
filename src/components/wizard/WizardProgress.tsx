import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface WizardStep {
  id: string;
  title: string;
  icon: LucideIcon;
}

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export const WizardProgress = ({ steps, currentStep, onStepClick }: WizardProgressProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border mx-12" />
        
        {/* Animated progress line */}
        <motion.div 
          className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-primary to-accent mx-12"
          initial={{ width: "0%" }}
          animate={{ 
            width: `${(currentStep / (steps.length - 1)) * 100}%` 
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep;
          
          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.button
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  "border-2 backdrop-blur-sm",
                  isCompleted && "bg-primary border-primary text-primary-foreground shadow-glow",
                  isCurrent && "bg-background border-primary text-primary shadow-lg scale-110",
                  !isCompleted && !isCurrent && "bg-muted/50 border-border text-muted-foreground",
                  isClickable && "cursor-pointer hover:scale-105",
                  !isClickable && "cursor-not-allowed"
                )}
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </motion.button>
              
              <motion.span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px]",
                  isCurrent && "text-primary font-semibold",
                  isCompleted && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
                animate={{
                  scale: isCurrent ? 1.05 : 1,
                }}
              >
                {step.title}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
