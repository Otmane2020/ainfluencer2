import { motion } from "framer-motion";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-glow">
            <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gradient">ClipMotion</h1>
            <p className="text-xs text-muted-foreground">Automatisez votre influence</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-muted px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            <span className="text-sm text-muted-foreground">En ligne</span>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-full gradient-primary p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
              <span className="text-sm font-bold text-gradient">U</span>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
};
