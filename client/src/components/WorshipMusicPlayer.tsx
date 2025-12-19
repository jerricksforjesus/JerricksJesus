import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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

interface WorshipVideo {
  id: number;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string | HTMLElement, config: {
        height: string;
        width: string;
        videoId: string;
        playerVars?: Record<string, number | string>;
        events?: {
          onReady?: (event: { target: YTPlayer }) => void;
          onStateChange?: (event: { data: number; target: YTPlayer }) => void;
        };
      }) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (videoId: string) => void;
  cueVideoById: (videoId: string) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
}

export function WorshipMusicPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeRef = useRef(volume);
  const autoPlayOnReadyRef = useRef(false);

  const { data: videos = [], isLoading } = useQuery<WorshipVideo[]>({
    queryKey: ["worship-videos"],
    queryFn: async () => {
      const response = await fetch("/api/worship-videos");
      if (!response.ok) throw new Error("Failed to fetch worship videos");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (videos.length === 0) return;

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        setApiLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        setApiLoaded(true);
      };
    };

    loadAPI();
  }, [videos.length]);

  useEffect(() => {
    if (!apiLoaded || !currentVideo || !playerContainerRef.current) return;

    const createPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const containerDiv = playerContainerRef.current;
      if (!containerDiv) return;

      const existingIframe = containerDiv.querySelector('#worship-player-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const playerDiv = document.createElement('div');
      playerDiv.id = 'worship-player-iframe';
      containerDiv.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerDiv, {
        height: "100%",
        width: "100%",
        videoId: currentVideo.youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            setPlayerReady(true);
            event.target.setVolume(volumeRef.current);
            if (autoPlayOnReadyRef.current) {
              event.target.playVideo();
              autoPlayOnReadyRef.current = false;
            }
            setDuration(event.target.getDuration());
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startProgressTracking();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopProgressTracking();
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopProgressTracking();
              setCurrentIndex(prev => (prev < videos.length - 1) ? prev + 1 : 0);
            }
          },
        },
      });
    };

    createPlayer();

    return () => {
      stopProgressTracking();
    };
  }, [apiLoaded, currentIndex, currentVideo?.youtubeVideoId, videos.length]);

  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const startProgressTracking = () => {
    stopProgressTracking();
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current) {
        try {
          setCurrentTime(playerRef.current.getCurrentTime());
          setDuration(playerRef.current.getDuration());
        } catch {
          stopProgressTracking();
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (e) {
      console.error("Error controlling playback:", e);
    }
  };

  const handlePrevious = () => {
    autoPlayOnReadyRef.current = isPlaying;
    setIsPlaying(false);
    setCurrentIndex(prev => (prev > 0) ? prev - 1 : videos.length - 1);
    setCurrentTime(0);
    setPlayerReady(false);
    stopProgressTracking();
  };

  const handleNext = () => {
    autoPlayOnReadyRef.current = isPlaying;
    setIsPlaying(false);
    setCurrentIndex(prev => (prev < videos.length - 1) ? prev + 1 : 0);
    setCurrentTime(0);
    setPlayerReady(false);
    stopProgressTracking();
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(newVolume);
        if (newVolume === 0) {
          setIsMuted(true);
        } else if (isMuted) {
          setIsMuted(false);
          playerRef.current.unMute();
        }
      } catch (e) {
        console.error("Error changing volume:", e);
      }
    }
  };

  const handleMuteToggle = () => {
    if (!playerRef.current) return;
    
    try {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.error("Error toggling mute:", e);
    }
  };

  const handleSeek = (value: number[]) => {
    const seekTime = value[0];
    setCurrentTime(seekTime);
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(seekTime, true);
      } catch (e) {
        console.error("Error seeking:", e);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const selectTrack = (index: number) => {
    autoPlayOnReadyRef.current = isPlaying;
    setIsPlaying(false);
    setCurrentIndex(index);
    setCurrentTime(0);
    setPlayerReady(false);
    setShowPlaylist(false);
    stopProgressTracking();
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
    <div className="mt-6 rounded-xl bg-gradient-to-br from-card to-muted/30 border shadow-lg overflow-hidden" data-testid="worship-music-player">
      <div className="p-4">
        <div className="flex gap-4">
          <div 
            ref={playerContainerRef}
            className="relative w-32 h-24 md:w-40 md:h-28 rounded-lg overflow-hidden bg-black flex-shrink-0"
          >
            {!playerReady && currentVideo?.thumbnailUrl && (
              <img 
                src={currentVideo.thumbnailUrl} 
                alt={currentVideo.title}
                className="absolute inset-0 w-full h-full object-cover z-10"
              />
            )}
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
                onValueChange={handleSeek}
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
              onClick={handleMuteToggle}
              className="h-8 w-8"
              data-testid="button-mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-20 md:w-24"
              data-testid="volume-slider"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="h-10 w-10"
              data-testid="button-previous"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={handlePlayPause}
              className="h-12 w-12 rounded-full"
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
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
                  onClick={() => selectTrack(index)}
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
