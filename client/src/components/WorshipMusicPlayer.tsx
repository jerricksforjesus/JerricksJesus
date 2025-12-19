import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Music,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { useWorshipPlayer } from "@/contexts/WorshipPlayerContext";

export function WorshipMusicPlayer() {
  const [showPlaylist, setShowPlaylist] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  
  const {
    videos,
    isLoading,
    currentIndex,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    currentVideo,
    mainPlayerSlotRef,
    togglePlay,
    next,
    previous,
    selectTrack: contextSelectTrack,
    seek,
    setVolume,
    toggleMute,
    setMainPlayerVisible,
  } = useWorshipPlayer();

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setMainPlayerVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      setMainPlayerVisible(false);
    };
  }, [setMainPlayerVisible]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectTrack = (index: number) => {
    contextSelectTrack(index);
    setShowPlaylist(false);
  };

  if (isLoading) {
    return (
      <div className="mt-6 p-4 rounded-xl bg-card border flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
        <span className="text-muted-foreground">Loading player...</span>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div 
      ref={observerRef}
      className="mt-6 rounded-xl bg-gradient-to-br from-card to-muted/30 border shadow-lg overflow-hidden" 
      data-testid="worship-music-player"
    >
      <div className="p-4">
        <div className="flex gap-4">
          <div 
            ref={mainPlayerSlotRef}
            className="relative w-32 h-24 md:w-40 md:h-28 rounded-lg overflow-hidden bg-black flex-shrink-0"
          >
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Music className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Now Playing</span>
            </div>
            <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-2" data-testid="current-track-title">
              {currentVideo?.title || "Select a track"}
            </h3>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={(value) => seek(value[0])}
                className="flex-1"
                data-testid="progress-slider"
              />
              <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8"
              data-testid="button-mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0])}
              className="w-20 md:w-24"
              data-testid="volume-slider"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={previous}
              className="h-10 w-10"
              data-testid="button-previous"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={togglePlay}
              className="h-12 w-12 rounded-full"
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="h-10 w-10"
              data-testid="button-next"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaylist(!showPlaylist)}
            className="gap-1"
            data-testid="button-toggle-playlist"
          >
            <span className="text-xs hidden sm:inline">{currentIndex + 1}/{videos.length}</span>
            {showPlaylist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showPlaylist && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="max-h-64 overflow-y-auto">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  onClick={() => handleSelectTrack(index)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
                    index === currentIndex ? "bg-primary/10" : ""
                  }`}
                  data-testid={`playlist-track-${video.youtubeVideoId}`}
                >
                  <div className="w-12 h-9 rounded overflow-hidden bg-muted flex-shrink-0">
                    {video.thumbnailUrl && (
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm line-clamp-1 ${index === currentIndex ? "text-primary font-medium" : ""}`}>
                      {video.title}
                    </p>
                  </div>
                  {index === currentIndex && isPlaying && (
                    <div className="flex gap-0.5 items-end h-4">
                      <div className="w-1 bg-primary animate-pulse" style={{ height: "60%" }} />
                      <div className="w-1 bg-primary animate-pulse" style={{ height: "100%", animationDelay: "0.2s" }} />
                      <div className="w-1 bg-primary animate-pulse" style={{ height: "40%", animationDelay: "0.4s" }} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
