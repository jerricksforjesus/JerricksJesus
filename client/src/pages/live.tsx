import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Video, Heart, Calendar, Clock, Radio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LiveStatus {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
}

export default function LiveStream() {
  const [chatKey, setChatKey] = useState(0);

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
      const response = await fetch("/api/settings/zoom-link", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch zoom link");
      return response.json();
    },
  });

  const isLive = liveStatus?.isLive ?? false;
  const videoId = liveStatus?.videoId;
  const streamTitle = liveStatus?.title || "Live Service";
  const zoomLink = zoomData?.zoomLink || "";

  const embedDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="flex-1 pt-24 pb-12 px-4 md:px-8 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Video Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="aspect-[9/16] md:aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-zinc-400">Checking stream status...</p>
              </div>
            ) : isLive && videoId ? (
              <>
                <div className="absolute top-4 left-4 z-10 bg-red-600 px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-2">
                  <Radio className="w-4 h-4 animate-pulse" /> LIVE
                </div>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&origin=${encodeURIComponent(window.location.origin)}&enablejsapi=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Live Stream"
                  data-testid="youtube-live-embed"
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-8 py-12 md:p-6 text-center">
                <Video className="w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 text-primary opacity-80" />
                <h2 className="text-2xl md:text-3xl font-serif mb-3 md:mb-4">We're Currently Offline</h2>
                <p className="text-zinc-400 max-w-md mb-6 md:mb-8 text-sm md:text-base">
                  Join us for our next live service. The stream will appear here automatically when we go live.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-lg w-full">
                  <div className="bg-zinc-800/50 rounded-xl p-3 md:p-4 text-left">
                    <div className="flex items-center gap-2 text-primary mb-1 md:mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Friday Morning Service</span>
                    </div>
                    <p className="text-base md:text-lg font-serif">6:00 AM EST</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-3 md:p-4 text-left">
                    <div className="flex items-center gap-2 text-primary mb-1 md:mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Friday Evening Service</span>
                    </div>
                    <p className="text-base md:text-lg font-serif">6:00 PM EST</p>
                  </div>
                </div>
                
                {zoomLink && (
                  <a href={zoomLink} target="_blank" rel="noopener noreferrer" className="mt-6 md:mt-8">
                    <Button 
                      size="lg" 
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-6 md:px-8"
                      data-testid="button-join-zoom-live"
                    >
                      Join the Zoom Link
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold" data-testid="text-stream-title">
                {isLive ? streamTitle : "Live Stream"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isLive ? "Currently streaming live" : "Check back during service times"}
              </p>
            </div>
            <Button variant="outline" className="gap-2" data-testid="button-offering">
              <Heart className="w-4 h-4 text-primary" /> Give Offering
            </Button>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:col-span-1 h-[600px] lg:h-auto bg-card rounded-xl border border-border/50 flex flex-col shadow-lg overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              Live Chat
            </h3>
            {isLive && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => setChatKey(k => k + 1)}
              >
                Refresh
              </Button>
            )}
          </div>
          
          <div className="flex-1 relative">
            {isLive && videoId ? (
              <iframe
                key={chatKey}
                src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${embedDomain}`}
                className="w-full h-full border-0"
                title="Live Chat"
                data-testid="youtube-chat-embed"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="font-serif text-lg mb-2">Chat Unavailable</h4>
                <p className="text-sm text-muted-foreground">
                  Live chat will be available when we go live. Join us during service times!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
