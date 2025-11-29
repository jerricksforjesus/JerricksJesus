import { motion } from "framer-motion";
import paperTexture from "@assets/generated_images/handmade_organic_paper_texture.png";

export function VerseDisplay() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Texture Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src={paperTexture} 
          alt="Texture" 
          className="w-full h-full object-cover opacity-40 grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-background/60 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="block text-primary text-sm font-bold tracking-widest uppercase mb-8">
            Verse of the Day
          </span>
          <h3 className="font-serif text-4xl md:text-6xl leading-tight text-foreground mb-8 italic">
            "For where two or three are gathered together in my name, there am I in the midst of them."
          </h3>
          <span className="block font-sans text-lg text-muted-foreground tracking-wide">
            — Matthew 18:20
          </span>
        </motion.div>
      </div>
    </section>
  );
}
