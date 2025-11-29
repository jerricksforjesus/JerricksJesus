import { motion } from "framer-motion";
import { Play } from "lucide-react";
import thumb1 from "@assets/generated_images/preacher_at_podium.png";
import thumb2 from "@assets/generated_images/open_bible_on_table.png";
import thumb3 from "@assets/generated_images/warm_limestone_wall_texture.png"; // Fallback texture as thumb
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const replays = [
  { id: 1, title: "Walking in Faith", date: "Nov 24, 2024", image: thumb1, duration: "45:20" },
  { id: 2, title: "The Power of Prayer", date: "Nov 17, 2024", image: thumb2, duration: "52:10" },
  { id: 3, title: "Community & Spirit", date: "Nov 10, 2024", image: thumb3, duration: "38:45" },
  { id: 4, title: "Finding Peace", date: "Nov 03, 2024", image: thumb1, duration: "41:30" },
];

export function ReplayGallery() {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-6 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2">Sermon Replays</h2>
            <p className="text-muted-foreground">Watch past services and messages.</p>
          </div>
          <button className="hidden md:block text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">
            View All Archive →
          </button>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap pb-8">
        <div className="flex w-max space-x-6 px-6 md:px-12">
          {replays.map((replay, index) => (
            <motion.div
              key={replay.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative w-[300px] md:w-[400px] group cursor-pointer"
            >
              <div className="overflow-hidden rounded-lg aspect-[16/9] mb-4 relative">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10 flex items-center justify-center">
                   <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                     <Play fill="currentColor" className="ml-1 w-5 h-5" />
                   </div>
                </div>
                <img 
                  src={replay.image} 
                  alt={replay.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded z-20">
                  {replay.duration}
                </span>
              </div>
              <h3 className="text-xl font-serif font-medium whitespace-normal group-hover:text-primary transition-colors">
                {replay.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{replay.date}</p>
            </motion.div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
