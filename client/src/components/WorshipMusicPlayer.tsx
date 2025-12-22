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
  ChevronUp,
  Repeat
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
    isLooping,
    toggleLooping,
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
      <div className="p-4 lg:p-6">
        {/* Mobile Layout - Reorganized for full title visibility */}
        <div className="lg:hidden">
          {/* Row 1: Thumbnail + Track info */}
          <div className="flex items-center gap-3 mb-2">
            <div 
              ref={mainPlayerRef as React.RefObject<HTMLDivElement>}
              className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-black"
            >
              {currentVideo?.thumbnailUrl && (
                <img 
                  src={currentVideo.thumbnailUrl} 
                  alt={currentVideo.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Track {currentIndex + 1} of {videos.length}
            </p>
          </div>

          {/* Row 2: Full title */}
          <h3 className="font-semibold text-base mb-5" data-testid="current-track-title">
            {currentVideo?.title || "No track selected"}
          </h3>

          {/* Row 3: Progress bar */}
          <div className="mb-3">
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

          {/* Row 4: Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={previous}
              className="h-9 w-9"
              data-testid="button-previous"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={togglePlay}
              className="h-11 w-11 rounded-full"
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="h-9 w-9"
              data-testid="button-next"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLooping}
              className={`h-9 w-9 ${isLooping ? "text-primary bg-primary/10" : ""}`}
              data-testid="button-loop"
            >
              <Repeat className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-9 w-9"
              data-testid="button-mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0])}
              className="w-20"
              data-testid="volume-slider"
            />
          </div>
        </div>

        {/* Desktop Layout - Improved design */}
        <div className="hidden lg:block">
          {/* Top row: Thumbnail + Title */}
          <div className="flex gap-5 mb-4">
            <div 
              className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-black shadow-md"
            >
              {currentVideo?.thumbnailUrl && (
                <img 
                  src={currentVideo.thumbnailUrl} 
                  alt={currentVideo.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="font-serif font-semibold text-xl mb-1" data-testid="current-track-title-desktop">
                {currentVideo?.title || "No track selected"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Track {currentIndex + 1} of {videos.length}
              </p>
            </div>
          </div>

          {/* Bottom row: Progress bar + Controls + Volume - all on one line */}
          <div className="flex items-center gap-4">
            {/* Time & Progress */}
            <span className="text-sm text-muted-foreground w-10 text-right flex-shrink-0">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={(value) => seek(value[0])}
              className="flex-1"
              data-testid="progress-slider-desktop"
            />
            <span className="text-sm text-muted-foreground w-10 flex-shrink-0">{formatTime(duration)}</span>

            {/* Divider */}
            <div className="h-6 w-px bg-border flex-shrink-0" />

            {/* Playback Controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={previous}
                className="h-9 w-9"
                data-testid="button-previous-desktop"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                onClick={togglePlay}
                className="h-12 w-12 rounded-full shadow-sm"
                data-testid="button-play-pause-desktop"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                className="h-9 w-9"
                data-testid="button-next-desktop"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLooping}
                className={`h-9 w-9 ${isLooping ? "text-primary bg-primary/10" : ""}`}
                data-testid="button-loop-desktop"
              >
                <Repeat className="w-4 h-4" />
              </Button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-border flex-shrink-0" />

            {/* Volume Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-9 w-9"
                data-testid="button-mute-desktop"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="w-24"
                data-testid="volume-slider-desktop"
              />
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
