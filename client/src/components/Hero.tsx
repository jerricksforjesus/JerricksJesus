import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import heroBg from "@assets/generated_images/sunlight_through_stained_glass_in_modern_church.png";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <div ref={containerRef} className="relative h-[100vh] w-full overflow-hidden bg-background flex items-center justify-center">
      {/* Background Image Parallax */}
      <motion.div 
        style={{ y, scale, opacity }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-black/30 z-10" />
        <img 
          src={heroBg} 
          alt="Sanctuary" 
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        >
          <h2 className="text-sm md:text-base font-sans font-medium tracking-[0.3em] uppercase mb-4 text-white/80">
            Welcome to the Sanctuary
          </h2>
          <h1 className="text-5xl md:text-8xl font-serif font-bold tracking-tight mb-6 leading-tight">
            Jerricks for Jesus
          </h1>
          <p className="text-lg md:text-xl font-sans font-light text-white/90 max-w-2xl mx-auto leading-relaxed">
            A digital home for faith, fellowship, and the living word. 
            Join us in spirit and truth.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12"
        >
          <div className="h-16 w-[1px] bg-white/50 mx-auto mb-4" />
          <span className="text-xs uppercase tracking-widest text-white/60">Scroll to Enter</span>
        </motion.div>
      </div>
    </div>
  );
}
