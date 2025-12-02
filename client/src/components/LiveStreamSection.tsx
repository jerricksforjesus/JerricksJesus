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

  const { data: zoomData } = useQuery<{ zoomLink: string }>({
    queryKey: ["zoom-link"],
    queryFn: async () => {
      const response = await fetch("/api/settings/zoom-link");
      if (!response.ok) throw new Error("Failed to fetch zoom link");
      return response.json();
    },
  });

  const isLive = liveStatus?.isLive ?? false;
  const streamTitle = liveStatus?.title || "Live Service";
  const zoomLink = zoomData?.zoomLink || "";

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

          <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl">
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-zinc-400">Checking stream status...</p>
                </div>
              ) : isLive && liveStatus?.videoId ? (
                <>
                  <div className="absolute top-4 left-4 z-10 bg-red-600 px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-pulse" /> LIVE
                  </div>
                  <iframe
                    src={`https://www.youtube.com/embed/${liveStatus.videoId}?autoplay=1&rel=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Live Stream"
                    data-testid="youtube-live-embed-home"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-6 text-center">
                  <Video className="w-16 h-16 mb-6 text-primary opacity-80" data-testid="icon-video" />
                  <h2 className="text-3xl font-serif mb-4">We're Currently Offline</h2>
                  <p className="text-zinc-400 max-w-md mb-8">
                    Join us for our next live service. The stream will appear here automatically when we go live.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full">
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-left">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">Friday Morning Service</span>
                      </div>
                      <p className="text-lg font-serif">6:00 AM EST</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 text-left">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Friday Evening Service</span>
                      </div>
                      <p className="text-lg font-serif">6:00 PM EST</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-8">
                    <Link href="/live">
                      <Button 
                        size="lg" 
                        className="w-full bg-[#b47a5f] hover:bg-[#a06b52] text-white font-bold px-8"
                        data-testid="button-go-to-live"
                      >
                        Go to Live Stream Page
                      </Button>
                    </Link>
                    {zoomLink && (
                      <a href={zoomLink} target="_blank" rel="noopener noreferrer">
                        <Button 
                          size="lg" 
                          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-8"
                          data-testid="button-join-zoom"
                        >
                          Join the Zoom Link
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
        </motion.div>
      </div>
    </section>
  );
}
