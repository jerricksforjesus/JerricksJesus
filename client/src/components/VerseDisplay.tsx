import { motion } from "framer-motion";
import paperTexture from "@assets/generated_images/handmade_organic_paper_texture.png";
import { useQuery } from "@tanstack/react-query";
import type { Verse } from "@shared/schema";

export function VerseDisplay() {
  const { data: verse } = useQuery<Verse>({
    queryKey: ["active-verse"],
    queryFn: async () => {
      const response = await fetch("/api/verses/active");
      if (!response.ok) {
        return {
          id: 0,
          verseText: "For where two or three are gathered together in my name, there am I in the midst of them.",
          reference: "Matthew 18:20",
          isActive: 1,
          createdAt: new Date(),
        };
      }
      return response.json();
    },
  });

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={paperTexture} 
          alt="Texture" 
          className="w-full h-full object-cover opacity-15 grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-background/30 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="block text-primary text-sm font-bold tracking-widest uppercase mb-8" data-testid="text-verse-label">
            Verse of the Day
          </span>
          <h3 className="font-serif text-4xl md:text-6xl leading-tight text-foreground mb-8 italic" data-testid="text-verse-text">
            "{verse?.verseText}"
          </h3>
          <span className="block font-sans text-lg text-muted-foreground tracking-wide" data-testid="text-verse-reference">
            — {verse?.reference}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
