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
    togglePlay,
    next,
    previous,
    selectTrack: contextSelectTrack,
    seek,
    setVolume,
    toggleMute,
    setMainPlayerVisible,
    mainPlayerRef,
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
        <div className="flex gap-3">
          <div 
            ref={mainPlayerRef as React.RefObject<HTMLDivElement>}
            className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-black"
          >
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="mb-2">
              <h3 className="font-semibold text-base line-clamp-1" data-testid="current-track-title">
                {currentVideo?.title || "No track selected"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Track {currentIndex + 1} of {videos.length}
              </p>
            </div>

            <div className="mb-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={(value) => seek(value[0])}
                className="w-full"
                data-testid="progress-slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previous}
                  disabled={currentIndex === 0}
                  className="h-8 w-8"
                  data-testid="button-previous"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={next}
                  disabled={currentIndex === videos.length - 1}
                  className="h-8 w-8"
                  data-testid="button-next"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 ml-auto">
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
                  className="w-16"
                  data-testid="volume-slider"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t">
        <Button
          variant="ghost"
          className="w-full h-10 rounded-none flex items-center justify-center gap-2 text-sm"
          onClick={() => setShowPlaylist(!showPlaylist)}
          data-testid="button-toggle-playlist"
        >
          <Music className="w-4 h-4" />
          <span>Playlist ({videos.length} tracks)</span>
          {showPlaylist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        <AnimatePresence>
          {showPlaylist && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto">
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => handleSelectTrack(index)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left ${
                      index === currentIndex ? "bg-primary/10" : ""
                    }`}
                    data-testid={`playlist-item-${index}`}
                  >
                    <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm line-clamp-1 ${index === currentIndex ? "font-medium text-primary" : ""}`}>
                        {video.title}
                      </p>
                    </div>
                    {index === currentIndex && isPlaying && (
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-primary animate-pulse" />
                        <div className="w-0.5 h-3 bg-primary animate-pulse delay-75" />
                        <div className="w-0.5 h-3 bg-primary animate-pulse delay-150" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
