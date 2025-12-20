import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useWorshipPlayer } from "@/contexts/WorshipPlayerContext";

export function MiniMusicPlayer() {
  const videoHostRef = useRef<HTMLDivElement>(null);

  const {
    currentVideo,
    isPlaying,
    currentTime,
    duration,
    showMiniPlayer,
    togglePlay,
    next,
    previous,
    seek,
    dismissMiniPlayer,
    registerMiniHost,
  } = useWorshipPlayer();

  useEffect(() => {
    if (showMiniPlayer && videoHostRef.current) {
      registerMiniHost(videoHostRef.current);
    }
    return () => {
      registerMiniHost(null);
    };
  }, [registerMiniHost, showMiniPlayer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {showMiniPlayer && currentVideo && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t shadow-2xl"
          data-testid="mini-music-player"
        >
          <div className="relative">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={(value) => seek(value[0])}
              className="absolute -top-1.5 left-0 right-0 h-1.5 rounded-none [&>span:first-child]:h-1.5 [&>span:first-child]:rounded-none [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:-top-0.5"
              data-testid="mini-progress-slider"
            />
          </div>

          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <div 
                ref={videoHostRef}
                className="w-16 h-12 flex-shrink-0 rounded overflow-hidden bg-black"
              >
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1" data-testid="mini-track-title">
                  {currentVideo.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previous}
                  className="h-9 w-9"
                  data-testid="mini-button-previous"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full"
                  data-testid="mini-button-play-pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={next}
                  className="h-9 w-9"
                  data-testid="mini-button-next"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={dismissMiniPlayer}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                data-testid="mini-button-close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
