import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { VerseDisplay } from "@/components/VerseDisplay";
import { FeaturedVideo } from "@/components/FeaturedVideo";
import { LiveStreamSection } from "@/components/LiveStreamSection";
import { ReplaysList } from "@/components/ReplaysList";
import { MinistryAccordion } from "@/components/MinistryAccordion";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navigation />
      <Hero />
      <VerseDisplay />
      <FeaturedVideo />
      <LiveStreamSection />
      <ReplaysList />
      <MinistryAccordion />
      <footer className="bg-foreground text-background py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-4xl font-serif font-bold mb-6">JERRICKS FOR JESUS</h2>
            <p className="text-background/60 max-w-md">
              A sanctuary for the digital age. Bringing the word of God to wherever you are.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold uppercase tracking-widest mb-4 text-sm text-primary">Visit</h4>
              <p className="text-background/60">123 Faith Ave</p>
              <p className="text-background/60">Grace City, GC 40291</p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-widest mb-4 text-sm text-primary">Connect</h4>
              <p className="text-background/60">info@jerricks.church</p>
              <p className="text-background/60">(555) 123-4567</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-background/10 text-center md:text-left text-sm text-background/40">
          © 2024 Jerricks for Jesus. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
