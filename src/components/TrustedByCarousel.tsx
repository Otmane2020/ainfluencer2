import { motion } from "framer-motion";

const brands = [
  "NAKED WARDROBE",
  "GYMSHARK",
  "FASHION NOVA",
  "REVOLVE",
  "BOOHOO",
  "PRETTYLITTLETHING",
  "MISSGUIDED",
  "ASOS",
  "SHEIN",
  "ZARA",
  "H&M",
  "UNIQLO",
];

export const TrustedByCarousel = () => {
  return (
    <section className="py-8 md:py-12 border-y border-border/30 bg-muted/20 overflow-hidden">
      <div className="container mx-auto px-4 mb-6">
        <p className="text-center text-sm md:text-base text-muted-foreground">
          Trusted by <span className="font-semibold text-foreground">7,000+</span> satisfied merchants
        </p>
      </div>
      
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-background to-transparent z-10" />
        
        {/* Scrolling container */}
        <div className="flex overflow-hidden">
          <motion.div
            className="flex gap-12 md:gap-16"
            animate={{ x: [0, -1920] }}
            transition={{
              x: {
                duration: 30,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            {/* Double the brands for seamless loop */}
            {[...brands, ...brands].map((brand, index) => (
              <div
                key={`${brand}-${index}`}
                className="flex-shrink-0 flex items-center justify-center"
              >
                <span className="text-lg md:text-xl font-semibold tracking-wide text-muted-foreground/60 hover:text-muted-foreground transition-colors whitespace-nowrap">
                  {brand}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
