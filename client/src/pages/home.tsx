import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { VerseDisplay } from "@/components/VerseDisplay";
import { FeaturedVideo } from "@/components/FeaturedVideo";
import { LiveStreamSection } from "@/components/LiveStreamSection";
import { ReplaysList } from "@/components/ReplaysList";
import { FamilyPhotoCarousel } from "@/components/FamilyPhotoCarousel";
import { BibleQuizSection } from "@/components/BibleQuizSection";
import { FamilyEventsSection } from "@/components/FamilyEventsSection";
import { MinistryAccordion } from "@/components/MinistryAccordion";
import { MobilePlayerSpacer } from "@/components/MobilePlayerSpacer";
import { useQuery } from "@tanstack/react-query";

interface FooterInfo {
  churchName: string;
  tagline: string;
  address: {
    line1: string;
    line2: string;
  };
  contact: {
    email: string;
    phone: string;
  };
  copyright: string;
}

export default function Home() {
  const { data: footer } = useQuery<FooterInfo>({
    queryKey: ["footer-info"],
    queryFn: async () => {
      const response = await fetch("/api/settings/footer");
      if (!response.ok) throw new Error("Failed to fetch footer info");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navigation />
      <Hero />
      <VerseDisplay />
      <FeaturedVideo />
      <ReplaysList />
      <FamilyEventsSection />
      <LiveStreamSection />
      <FamilyPhotoCarousel />
      <BibleQuizSection />
      <div id="ministries">
        <MinistryAccordion />
      </div>
      <footer className="bg-foreground text-background py-16 px-6" data-testid="footer">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-4xl font-serif font-bold mb-6" data-testid="text-footer-church-name">
              {footer?.churchName || "JERRICKS FOR JESUS"}
            </h2>
            <p className="text-background/60 max-w-md" data-testid="text-footer-tagline">
              {footer?.tagline || "A sanctuary for the digital age. Bringing the word of God to wherever you are."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold uppercase tracking-widest mb-4 text-sm text-primary">Visit</h4>
              <p className="text-background/60" data-testid="text-footer-address-line1">
                {footer?.address?.line1 || "99 Hillside Avenue Suite F"}
              </p>
              <p className="text-background/60" data-testid="text-footer-address-line2">
                {footer?.address?.line2 || "Williston Park NY 11596"}
              </p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-widest mb-4 text-sm text-primary">Connect</h4>
              <p className="text-background/60" data-testid="text-footer-email">
                {footer?.contact?.email || "family@jerricksforjesus.com"}
              </p>
              <p className="text-background/60" data-testid="text-footer-phone">
                {footer?.contact?.phone || "516-240-5503"}
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-background/10 text-center md:text-left text-sm text-background/40" data-testid="text-footer-copyright">
          {footer?.copyright || `© ${new Date().getFullYear()} Jerricks for Jesus. All rights reserved.`}
        </div>
      </footer>
      <MobilePlayerSpacer variant="dark" />
    </div>
  );
}
