import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio, Video, LogIn, Music, Square, Loader2, Phone } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { EqualizerBars } from "@/components/EqualizerBars";
import { useAuth } from "@/lib/auth";
import { useWorshipPlayer } from "@/contexts/WorshipPlayerContext";
import heroBg from "@assets/generated_images/sunlight_through_stained_glass_in_modern_church.png";

interface LiveStatus {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
}

interface ZoomSettings {
  zoomLink: string | null;
}

const ZOOM_ONE_TAP_NUMBER = "+13052241968,,87538675196#,,,,*949343#";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { showMiniPlayer, play, dismissMiniPlayer, videos, isInitializing, isPlaying, isMuted, iOSNeedsTap, showiOSModal, isIOS } = useWorshipPlayer();
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobileDevice(isMobile);
    };
    checkMobile();
  }, []);
  
  // Hide worship music button for iOS users (temporary fix for WebKit playback issues)
  // Superadmins can still see it for debugging purposes
  const isSuperAdmin = user?.role === "superadmin";
  const showWorshipButton = !isIOS || isSuperAdmin;
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  const { data: liveStatus } = useQuery<LiveStatus>({
    queryKey: ["live-status"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/live-status");
      if (!response.ok) throw new Error("Failed to fetch live status");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: zoomData } = useQuery<ZoomSettings>({
    queryKey: ["zoom-link"],
    queryFn: async () => {
      const response = await fetch("/api/settings/zoom-link");
      if (!response.ok) throw new Error("Failed to fetch zoom link");
      return response.json();
    },
  });

  const isLive = liveStatus?.isLive ?? false;

  return (
    <div ref={containerRef} className="relative h-[100vh] w-full overflow-hidden bg-black flex items-center justify-center">
      {/* Background Image Parallax */}
      <motion.div 
        style={{ y, scale, opacity }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-black/20 z-10" />
        <img 
          src={heroBg} 
          alt="Sanctuary" 
          className="w-full h-full object-cover opacity-60"
        />
      </motion.div>
      {/* LIVE NOW Indicator */}
      {isLive && (
        <Link href="/live">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-30 cursor-pointer"
            data-testid="link-live-indicator"
          >
            <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 hover:bg-red-700 transition-colors">
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-sm">We're Live Now</span>
              <span className="text-white/80 text-sm">Watch Service</span>
            </div>
          </motion.div>
        </Link>
      )}
      {/* Content */}
      <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        >
          <h2 className="text-sm md:text-base font-sans font-medium tracking-[0.3em] uppercase mb-4 text-white/80">
            Welcome to the Sanctuary
          </h2>
          <h1 className="text-5xl md:text-8xl font-serif font-bold tracking-tight mb-6 leading-tight">
            Jerricks for Jesus
          </h1>
          <p className="text-lg md:text-xl font-sans font-light text-white/90 max-w-2xl mx-auto leading-relaxed">
            A digital home for faith, fellowship, and the{" "}
            <br className="hidden md:block" />
            living word. Join us in spirit and truth.
          </p>
        </motion.div>

        {/* Join Zoom Button */}
        {zoomData?.zoomLink && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 mb-[20px]"
          >
            <Button 
              asChild
              size="lg" 
              className="font-bold px-8 w-[220px] justify-between"
              style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
              data-testid="button-join-zoom-hero"
            >
              <a href={zoomData.zoomLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between">
                <span>Join the Zoom</span>
                <Video className="w-5 h-5" />
              </a>
            </Button>
          </motion.div>
        )}

        {/* Listen to Zoom - One-Tap Phone Dial-In (Mobile Only) */}
        {isMobileDevice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mb-[20px]"
          >
            <Button 
              asChild
              size="lg" 
              className="font-bold px-8 w-[220px] justify-between"
              style={{ backgroundColor: "#4a7c59", color: "#ffffff" }}
              data-testid="button-listen-zoom-hero"
            >
              <a href={`tel:${ZOOM_ONE_TAP_NUMBER.replace(/\+/g, '%2B').replace(/#/g, '%23').replace(/\*/g, '%2A')}`} className="flex items-center justify-between">
                <span>Listen to Zoom</span>
                <Phone className="w-5 h-5" />
              </a>
            </Button>
          </motion.div>
        )}

        {/* Sign In Button - only show when not logged in */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-0 mb-[20px]"
          >
            <Button 
              asChild
              size="lg" 
              className="font-bold px-8 w-[220px] justify-between"
              style={{ backgroundColor: "#ffffff", color: "#b47a5f", border: "2px solid #ffffff" }}
              data-testid="button-sign-in-hero"
            >
              <Link href="/login" className="flex items-center justify-between">
                <span>Sign In Here</span>
                <LogIn className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        )}

        {/* Play Worship Music / Stop Music Button */}
        {/* Hidden for iOS users due to WebKit playback issues - superadmins can still see it */}
        {videos.length > 0 && showWorshipButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="mt-0 mb-[20px]"
          >
            <Button 
              size="lg" 
              className="font-bold px-8 w-[220px] justify-between"
              style={{ 
                backgroundColor: showMiniPlayer ? "#dc2626" : "#ffffff", 
                color: showMiniPlayer ? "#ffffff" : "#b47a5f", 
                border: showMiniPlayer ? "2px solid #dc2626" : "2px solid #ffffff",
                opacity: isInitializing ? 0.8 : 1,
              }}
              onClick={() => {
                if (showMiniPlayer) {
                  dismissMiniPlayer();
                } else if (iOSNeedsTap) {
                  // iOS requires direct tap on YouTube player - show modal
                  showiOSModal();
                } else {
                  play();
                }
              }}
              data-testid="button-worship-music-hero"
            >
              {isInitializing ? (
                <>
                  <span>Loading...</span>
                  <Loader2 className="w-5 h-5 animate-spin" />
                </>
              ) : showMiniPlayer ? (
                <>
                  <span>Stop Music</span>
                  <EqualizerBars isActive={isPlaying && !isMuted} className="h-4 mx-2" />
                  <Square className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span>Play Worship Music</span>
                  <Music className="w-5 h-5" />
                </>
              )}
            </Button>
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12"
        >
          <div className="h-16 w-[1px] bg-white/50 mx-auto mb-4" />
          <span className="text-xs uppercase tracking-widest text-white/60">Scroll to Enter</span>
        </motion.div>
      </div>

    </div>
  );
}
