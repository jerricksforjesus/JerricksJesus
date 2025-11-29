import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Clock, Radio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface LiveStatus {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
}

export function LiveStreamSection() {
  const { data: liveStatus, isLoading } = useQuery<LiveStatus>({
    queryKey: ["live-status"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/live-status");
      if (!response.ok) throw new Error("Failed to fetch live status");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const isLive = liveStatus?.isLive ?? false;
  const streamTitle = liveStatus?.title || "Sunday Morning Service";

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
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold">Live Stream</h2>
              {isLive && (
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                  <Radio className="w-3 h-3 animate-pulse" /> LIVE
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {isLive ? "We're streaming live right now!" : "Join us for our next live service."}
            </p>
          </div>

          <Link href="/live">
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl cursor-pointer group">
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : isLive ? (
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/90 to-zinc-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_70%)]" />
                  
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mb-6"
                  >
                    <Radio className="w-16 h-16 text-red-400" />
                  </motion.div>
                  
                  <h3 className="text-3xl font-serif font-bold mb-2">{streamTitle}</h3>
                  <p className="text-white/70 mb-6">Streaming live now</p>
                  
                  <Button 
                    size="lg" 
                    className="bg-white text-black hover:bg-white/90 font-bold px-8 group-hover:scale-105 transition-transform"
                    data-testid="button-watch-live"
                  >
                    Watch Live
                  </Button>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-6 text-center group-hover:bg-zinc-800 transition-colors">
                  <Video className="w-16 h-16 mb-6 text-primary opacity-80" data-testid="icon-video" />
                  <h3 className="text-3xl font-serif mb-4">Next Service</h3>
                  <p className="text-zinc-400 max-w-md mb-8">
                    The live stream will appear here automatically when we go live.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6 max-w-md">
                    <div className="text-left">
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">Sunday</span>
                      </div>
                      <p className="text-lg font-serif">10:00 AM EST</p>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Wednesday</span>
                      </div>
                      <p className="text-lg font-serif">7:00 PM EST</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
