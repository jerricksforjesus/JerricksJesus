import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Video, Users, MessageCircle, Heart } from "lucide-react";

export function LiveStreamSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2">Live Stream</h2>
            <p className="text-muted-foreground">Join us for the live service right now.</p>
          </div>

          <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl">
            {!isLoggedIn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-6 text-center">
                <Video className="w-16 h-16 mb-6 text-primary opacity-80" data-testid="icon-video" />
                <h2 className="text-3xl font-serif mb-4">Join the Live Sanctuary</h2>
                <p className="text-zinc-400 max-w-md mb-8">
                  Connect with your Zoom account to participate in the service, chat with members, and be part of the fellowship.
                </p>
                <Button 
                  size="lg" 
                  className="bg-[#2D8CFF] hover:bg-[#2D8CFF]/90 text-white font-bold px-8 py-6 text-lg rounded-full"
                  onClick={() => setIsLoggedIn(true)}
                  data-testid="button-signin-zoom"
                >
                  Sign in with Zoom
                </Button>
              </div>
            ) : (
              <div className="relative w-full h-full bg-zinc-800">
                <div className="absolute top-4 right-4 z-10 bg-black/50 px-3 py-1 rounded text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> LIVE
                </div>
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <span className="text-2xl font-serif">Stream Feed Connected...</span>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex justify-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-start mt-6">
            <div>
              <h3 className="text-2xl font-serif font-bold">Sunday Morning Service</h3>
              <p className="text-muted-foreground mt-2">Started streaming 15 minutes ago</p>
            </div>
            <Button variant="outline" className="gap-2">
              <Heart className="w-4 h-4 text-primary" /> Give Offering
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
