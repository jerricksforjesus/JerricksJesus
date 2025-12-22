import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX, Repeat, ChevronUp, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorshipPlayer } from "@/contexts/WorshipPlayerContext";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MiniMusicPlayer() {
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
                        {index === currentIndex && isPlaying && (
                          <div className="flex gap-0.5">
                            <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                            <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-75" />
                            <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
                          </div>
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

          <div className="container mx-auto px-4 py-3">
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
            <div className="flex items-center justify-between">
              {/* Time Display */}
              <div className="flex-shrink-0 text-xs text-muted-foreground tabular-nums min-w-[70px]" data-testid="mini-track-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Volume Controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-9 w-9"
                  data-testid="mini-button-mute"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0])}
                  className="w-16 sm:w-20"
                  data-testid="mini-volume-slider"
                />
              </div>

              {/* Playback Controls */}
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

              {/* Right Controls: Loop, Playlist, Close */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleLoop}
                  className={cn(
                    "h-9 w-9",
                    isLooping && "text-primary bg-primary/10"
                  )}
                  data-testid="mini-button-loop"
                >
                  <Repeat className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className={cn(
                    "h-9 w-9 transition-transform",
                    showPlaylist && "rotate-180"
                  )}
                  data-testid="mini-button-playlist-toggle"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={dismissMiniPlayer}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  data-testid="mini-button-close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
