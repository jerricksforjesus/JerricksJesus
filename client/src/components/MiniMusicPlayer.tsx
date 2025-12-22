import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX, Volume1, Repeat, ChevronUp, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EqualizerBars } from "@/components/EqualizerBars";
import { useWorshipPlayer } from "@/contexts/WorshipPlayerContext";
import { usePlayerLogger } from "@/hooks/usePlayerLogger";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MiniMusicPlayer() {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);
  const { logEvent } = usePlayerLogger();

  // Close volume slider when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    }
    if (showVolumeSlider) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showVolumeSlider]);

  const {
    videos,
    currentVideo,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLooping,
    showMiniPlayer,
    togglePlay,
    next,
    previous,
    selectTrack,
    seek,
    setVolume,
    toggleMute,
    toggleLoop,
    dismissMiniPlayer,
  } = useWorshipPlayer();

  const [showPlaylist, setShowPlaylist] = useState(false);
  const currentTrackRef = useRef<HTMLButtonElement>(null);
  const prevIndexRef = useRef(currentIndex);

  // Logging handlers for user interactions
  const handlePlayPause = () => {
    logEvent("UI_TAP_PLAY_PAUSE", { videoId: currentVideo?.youtubeVideoId, videoIndex: currentIndex, payload: { isPlaying, component: "MiniMusicPlayer" } });
    togglePlay();
  };

  const handleNext = () => {
    logEvent("UI_TAP_NEXT", { videoId: currentVideo?.youtubeVideoId, videoIndex: currentIndex, payload: { component: "MiniMusicPlayer" } });
    next();
  };

  const handlePrevious = () => {
    logEvent("UI_TAP_PREVIOUS", { videoId: currentVideo?.youtubeVideoId, videoIndex: currentIndex, payload: { component: "MiniMusicPlayer" } });
    previous();
  };

  const handleSelectTrack = (index: number) => {
    logEvent("UI_TAP_PLAYLIST_TRACK", { videoId: videos[index]?.youtubeVideoId, videoIndex: index, payload: { component: "MiniMusicPlayer" } });
    selectTrack(index);
    setShowPlaylist(false);
  };

  const handleToggleLoop = () => {
    logEvent("UI_TAP_LOOP", { payload: { isLooping, component: "MiniMusicPlayer" } });
    toggleLoop();
  };

  const handleToggleMute = () => {
    logEvent("UI_TAP_MUTE", { payload: { isMuted, component: "MiniMusicPlayer" } });
    toggleMute();
  };

  const handleDismiss = () => {
    logEvent("UI_TAP_DISMISS", { videoId: currentVideo?.youtubeVideoId, videoIndex: currentIndex, payload: { component: "MiniMusicPlayer" } });
    dismissMiniPlayer();
  };

  const handleTogglePlaylist = () => {
    logEvent("UI_TAP_TOGGLE_PLAYLIST", { payload: { showPlaylist: !showPlaylist, component: "MiniMusicPlayer" } });
    setShowPlaylist(!showPlaylist);
  };

  // Scroll to current track when playlist opens or when track changes while playlist is visible
  useEffect(() => {
    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = currentIndex; // Update ref for next change
    
    if (!showPlaylist || !currentTrackRef.current) return;
    
    // Detect wrap-around in either direction
    const isForwardWrap = prevIndex === videos.length - 1 && currentIndex === 0;
    const isBackwardWrap = prevIndex === 0 && currentIndex === videos.length - 1;
    const isWrapAround = isForwardWrap || isBackwardWrap;
    
    // Use instant scroll for wrap-around, smooth for normal navigation
    const behavior = isWrapAround ? 'auto' : 'smooth';
    
    setTimeout(() => {
      currentTrackRef.current?.scrollIntoView({ behavior, block: 'center' });
    }, 50);
  }, [showPlaylist, currentIndex, videos.length]);

  return (
    <AnimatePresence>
      {showMiniPlayer && currentVideo && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-2xl"
          data-testid="mini-music-player"
        >
          {/* Mini Playlist Panel */}
          <AnimatePresence>
            {showPlaylist && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="overflow-hidden border-b bg-background/50"
                data-testid="mini-playlist-panel"
              >
                <ScrollArea className="h-64">
                  <div className="p-2 space-y-1">
                    {videos.map((video, index) => (
                      <button
                        key={video.id}
                        ref={index === currentIndex ? currentTrackRef : null}
                        onClick={() => {
                          selectTrack(index);
                          setShowPlaylist(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                          index === currentIndex 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted"
                        )}
                        data-testid={`mini-playlist-track-${index}`}
                      >
                        <div className="w-12 h-9 flex-shrink-0 rounded overflow-hidden bg-black flex items-center justify-center">
                          {video.thumbnailUrl ? (
                            <img 
                              src={video.thumbnailUrl} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-4 h-4 text-white/50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium line-clamp-1",
                            index === currentIndex && "text-primary"
                          )}>
                            {video.title}
                          </p>
                        </div>
                        {index === currentIndex && (
                          <EqualizerBars isActive={isPlaying && !isMuted} className="h-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar */}
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

          <div className="container mx-auto px-6 py-3">
            {/* Row 1: Thumbnail and Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-10 flex-shrink-0 rounded overflow-hidden bg-black flex items-center justify-center">
                {currentVideo.thumbnailUrl ? (
                  <img 
                    src={currentVideo.thumbnailUrl} 
                    alt={currentVideo.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white/50 text-xs">♪</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2" data-testid="mini-track-title">
                  {currentVideo.title}
                </p>
              </div>
            </div>

            {/* Row 2: Time + All Controls - evenly spaced */}
            <div className="flex items-center justify-evenly">
              {/* Time Display */}
              <div className="text-xs text-muted-foreground tabular-nums" data-testid="mini-track-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Volume Control with Popup */}
              <div className="relative" ref={volumeRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  onDoubleClick={toggleMute}
                  className={cn("h-8 w-8", showVolumeSlider && "invisible")}
                  data-testid="mini-button-volume"
                  title="Click to adjust volume, double-click to mute"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : volume < 50 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                
                <AnimatePresence>
                  {showVolumeSlider && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-card border rounded-lg shadow-lg p-3 flex flex-col items-center gap-2 z-50"
                    >
                      <div 
                        className="relative h-28 w-6 flex items-center justify-center cursor-pointer"
                        data-testid="mini-volume-slider"
                      >
                        {/* Background track */}
                        <div className="absolute h-24 w-2 bg-muted-foreground/20 rounded-full" />
                        
                        {/* Filled track */}
                        <div 
                          className="absolute bottom-2 w-2 bg-primary rounded-full transition-all"
                          style={{ height: `${(isMuted ? 0 : volume) * 0.96}px` }}
                        />
                        
                        {/* Knob/thumb */}
                        <div 
                          className="absolute w-4 h-4 bg-primary rounded-full shadow-md border-2 border-background transition-all"
                          style={{ bottom: `${Math.max(0, (isMuted ? 0 : volume) * 0.96)}px` }}
                        />
                        
                        {/* Invisible input for interaction */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          style={{
                            writingMode: "vertical-lr",
                            direction: "rtl",
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          toggleMute();
                          setShowVolumeSlider(false);
                        }}
                        className="h-8 w-8"
                        data-testid="mini-button-mute"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4" />
                        ) : volume < 50 ? (
                          <Volume1 className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Previous */}
              <Button
                variant="ghost"
                size="icon"
                onClick={previous}
                className="h-8 w-8"
                data-testid="mini-button-previous"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              {/* Play/Pause */}
              <Button
                variant="default"
                size="icon"
                onClick={togglePlay}
                className="h-10 w-10 rounded-full"
                data-testid="mini-button-play-pause"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </Button>

              {/* Next */}
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                className="h-8 w-8"
                data-testid="mini-button-next"
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              {/* Loop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLoop}
                className={cn(
                  "h-8 w-8",
                  isLooping && "text-primary bg-primary/10"
                )}
                data-testid="mini-button-loop"
              >
                <Repeat className="w-4 h-4" />
              </Button>

              {/* Playlist Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPlaylist(!showPlaylist)}
                className={cn(
                  "h-8 w-8 transition-transform",
                  showPlaylist && "rotate-180"
                )}
                data-testid="mini-button-playlist-toggle"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>

              {/* Close */}
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
