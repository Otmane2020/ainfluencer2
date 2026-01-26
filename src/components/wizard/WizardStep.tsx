import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface WizardStepProps {
  children: ReactNode;
  isActive: boolean;
  direction?: "forward" | "backward";
}

const variants = {
  enter: (direction: "forward" | "backward") => ({
    x: direction === "forward" ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: "forward" | "backward") => ({
    x: direction === "forward" ? -100 : 100,
    opacity: 0,
  }),
};

export const WizardStep = ({ children, isActive, direction = "forward" }: WizardStepProps) => {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      {isActive && (
        <motion.div
          key="step"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface WizardStepContainerProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export const WizardStepContainer = ({ children, title, description }: WizardStepContainerProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.h2 
          className="text-2xl font-bold text-foreground"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h2>
        {description && (
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {description}
          </motion.p>
        )}
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-6 md:p-8"
      >
        {children}
      </motion.div>
    </div>
  );
};
