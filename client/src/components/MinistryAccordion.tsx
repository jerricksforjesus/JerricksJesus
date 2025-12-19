import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { WorshipMusicSection } from "./WorshipMusicSection";
import { FamilyPhotoGallery } from "./FamilyPhotoGallery";
import { CharityComingSoon } from "./CharityComingSoon";
import { AddToHomeScreen } from "./AddToHomeScreen";

interface Ministry {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string | null;
  customContent: {
    type: string;
    playlistId?: string;
    message?: string;
  } | null;
}

export function MinistryAccordion() {
  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["ministries"],
    queryFn: async () => {
      const response = await fetch("/api/settings/ministries");
      if (!response.ok) throw new Error("Failed to fetch ministries");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const renderCustomContent = (ministry: Ministry) => {
    if (!ministry.customContent) return null;
    
    switch (ministry.customContent.type) {
      case "youtube_playlist":
        return <WorshipMusicSection />;
      case "family_photos":
        return <FamilyPhotoGallery />;
      case "charity_coming_soon":
        return <CharityComingSoon message={ministry.customContent.message} />;
      case "add_to_home_screen":
        return <AddToHomeScreen />;
      default:
        return null;
    }
  };

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
                {renderCustomContent(item)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
