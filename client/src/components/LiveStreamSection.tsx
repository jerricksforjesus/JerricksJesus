import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Zap } from "lucide-react";

export function LiveStreamSection() {
  return (
    <section className="py-24 bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/20 border border-background/30">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">LIVE NOW</span>
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">Join the Live Sanctuary</h2>
          <p className="text-lg text-background/80 max-w-2xl mx-auto mb-8">
            Connect with your Zoom account to participate in the service, chat with members, and be part of the fellowship in real time.
          </p>
          
          <Link href="/live">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-bold rounded-full inline-flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Watch Live Stream
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
