import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { WorshipMusicSection } from "./WorshipMusicSection";
import { FamilyPhotoGallery } from "./FamilyPhotoGallery";
import { CharityComingSoon } from "./CharityComingSoon";

const ministries = [
  {
    id: "item-1",
    title: "Worship & Music",
    description: "Join our choir or band. We believe in praising through song and spirit, blending traditional hymns with contemporary worship.",
    hasCustomContent: true,
  },
  {
    id: "item-2",
    title: "Youth & Family",
    description: "Programs for all ages, from Sunday school for the little ones to teen youth groups focused on navigating faith in the modern world.",
    hasCustomContent: false,
  },
  {
    id: "item-3",
    title: "Community Outreach",
    description: "We serve our local community through food drives, shelter support, and neighborhood cleanup events. Faith in action.",
    hasCustomContent: false,
  },
];

export function MinistryAccordion() {
  return (
    <section className="py-24 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">Our Ministries</h2>
          <p className="text-muted-foreground">Ways to connect, serve, and grow.</p>
        </motion.div>

        <Accordion type="single" collapsible className="w-full">
          {ministries.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-b border-border/60">
              <AccordionTrigger className="text-xl md:text-2xl font-serif hover:text-primary transition-colors py-6" data-testid={`accordion-trigger-${item.id}`}>
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="pb-8">
                <p className="text-lg text-muted-foreground font-sans leading-relaxed mb-4">
                  {item.description}
                </p>
                {item.id === "item-1" && <WorshipMusicSection />}
                {item.id === "item-2" && <FamilyPhotoGallery />}
                {item.id === "item-3" && <CharityComingSoon />}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
