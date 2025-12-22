import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

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

interface WorshipPlayerContextType {
  videos: WorshipVideo[];
  isLoading: boolean;
  currentIndex: number;
  isPlaying: boolean;
  isInitializing: boolean;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  playerReady: boolean;
  currentVideo: WorshipVideo | undefined;
  mainPlayerVisible: boolean;
  miniPlayerDismissed: boolean;
  showMiniPlayer: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  selectTrack: (index: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  setMainPlayerVisible: (visible: boolean) => void;
  dismissMiniPlayer: () => void;
  mainPlayerRef: React.RefObject<HTMLDivElement | null>;
}

const WorshipPlayerContext = createContext<WorshipPlayerContextType | null>(null);

export function useWorshipPlayer() {
  const context = useContext(WorshipPlayerContext);
  if (!context) {
    throw new Error("useWorshipPlayer must be used within a WorshipPlayerProvider");
  }
  return context;
}

function PlayerPortal({ 
  mainPlayerVisible, 
  showMiniPlayer,
  mainPlayerRef,
  playerContainerRef,
  currentVideo,
}: { 
  mainPlayerVisible: boolean;
  showMiniPlayer: boolean;
  mainPlayerRef: React.RefObject<HTMLDivElement | null>;
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  currentVideo: WorshipVideo | undefined;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 96, height: 64 });

  useEffect(() => {
    if (!mainPlayerVisible) {
      setPosition({ top: -9999, left: -9999, width: 0, height: 0 });
      return;
    }

    const updatePosition = () => {
      if (mainPlayerRef.current && mainPlayerVisible) {
        const rect = mainPlayerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= -100) {
          setPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        } else {
          setPosition({ top: -9999, left: -9999, width: 0, height: 0 });
        }
      }
    };

    updatePosition();
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    const interval = setInterval(updatePosition, 100);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearInterval(interval);
    };
  }, [mainPlayerRef, mainPlayerVisible]);

  if (!currentVideo) return null;

  const hasValidMainPosition = mainPlayerVisible && 
    position.width > 50 && 
    position.height > 30 && 
    position.top > 100 && 
    position.left > 50;
  const isMainMode = hasValidMainPosition;
  const isMiniMode = showMiniPlayer && !mainPlayerVisible;
  const shouldHide = !isMainMode && !isMiniMode;

  return createPortal(
    <div
      ref={playerContainerRef}
      data-testid="global-video-player"
      style={{
        position: isMiniMode ? 'fixed' : 'absolute',
        top: isMainMode ? position.top : '-9999px',
        left: isMainMode ? position.left : '-9999px',
        bottom: 'auto',
        width: isMainMode ? position.width : '1px',
        height: isMainMode ? position.height : '1px',
        zIndex: isMainMode ? 50 : -1,
        overflow: 'hidden',
        borderRadius: '8px',
        pointerEvents: shouldHide ? 'none' : 'auto',
        opacity: shouldHide ? 0 : 1,
        visibility: shouldHide ? 'hidden' : 'visible',
        transition: 'none',
      }}
    />,
    document.body
  );
}

export function WorshipPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [mainPlayerVisible, setMainPlayerVisible] = useState(false);
  const [miniPlayerDismissed, setMiniPlayerDismissed] = useState(false);
  const [miniPlayerActivated, setMiniPlayerActivated] = useState(false);
  const [playerCreated, setPlayerCreated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [lastPlayedLoaded, setLastPlayedLoaded] = useState(false);
  
  const playerRef = useRef<YTPlayer | null>(null);
  const isLoopingRef = useRef(isLooping);
  const isPlayingRef = useRef(isPlaying);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const mainPlayerRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeRef = useRef(volume);
  const autoPlayOnReadyRef = useRef(false);
  const lastBackPressRef = useRef<number>(0);

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
  const lastUserIdRef = useRef<string | null>(null);

  // Reset state when user changes (login/logout/different user)
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserIdRef.current;
    
    if (previousUserId !== currentUserId) {
      // User changed - stop music for any user change (login or logout)
      // Check if music was playing using ref (not state, as state might be stale)
      const wasPlaying = isPlayingRef.current || miniPlayerActivated;
      
      if (wasPlaying || previousUserId !== null || currentUserId !== null) {
        // Stop the YouTube player completely - try multiple methods
        const stopPlayer = () => {
          if (playerRef.current) {
            try {
              const playerState = playerRef.current.getPlayerState?.();
              // Only stop if actually playing (state 1 = playing, 3 = buffering)
              if (playerState === 1 || playerState === 3 || playerState === undefined) {
                playerRef.current.stopVideo();
              }
              playerRef.current.pauseVideo();
            } catch (e) {
              // Player might not be ready
            }
          }
        };
        
        // Try to stop immediately and after a short delay
        stopPlayer();
        setTimeout(stopPlayer, 100);
        setTimeout(stopPlayer, 300);
        
        // Clear progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setMiniPlayerDismissed(true);
        setMiniPlayerActivated(false);
        
        // Only reset to beginning on logout
        if (currentUserId === null) {
          setCurrentIndex(0);
        }
      }
      lastUserIdRef.current = currentUserId;
      setLastPlayedLoaded(false);
    }
  }, [user?.id, miniPlayerActivated]);

  // Load last played video for logged-in users
  useEffect(() => {
    if (!user || videos.length === 0 || lastPlayedLoaded) return;
    
    const loadLastPlayed = async () => {
      try {
        const response = await fetch("/api/user/last-played", { credentials: "include" });
        if (response.ok) {
          const { videoId } = await response.json();
          if (videoId) {
            const index = videos.findIndex(v => v.youtubeVideoId === videoId);
            if (index !== -1) {
              setCurrentIndex(index);
            }
          }
          setLastPlayedLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load last played video:", error);
      }
    };
    
    loadLastPlayed();
  }, [user, videos, lastPlayedLoaded]);

  // Save last played video when track changes (for logged-in users)
  useEffect(() => {
    if (!user || !currentVideo || !lastPlayedLoaded) return;
    
    const saveLastPlayed = async () => {
      try {
        await fetch("/api/user/last-played", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ videoId: currentVideo.youtubeVideoId }),
        });
      } catch (error) {
        console.error("Failed to save last played video:", error);
      }
    };
    
    saveLastPlayed();
  }, [user, currentVideo?.youtubeVideoId, lastPlayedLoaded]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const showMiniPlayer = miniPlayerActivated && !mainPlayerVisible && !miniPlayerDismissed;

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
    if (!playerCreated) return;

    if (playerRef.current) return;

    const player = new window.YT.Player(playerContainerRef.current, {
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
          playerRef.current = event.target;
          setPlayerReady(true);
          event.target.setVolume(volumeRef.current);
          
          if (autoPlayOnReadyRef.current) {
            event.target.playVideo();
            autoPlayOnReadyRef.current = false;
          }
        },
        onStateChange: (event) => {
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setMiniPlayerActivated(true);
            setIsInitializing(false);
            
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);
            
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            progressIntervalRef.current = setInterval(() => {
              if (playerRef.current) {
                try {
                  const time = playerRef.current.getCurrentTime();
                  setCurrentTime(time);
                } catch {
                }
              }
            }, 500);
          } else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          } else if (state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            if (isLoopingRef.current) {
              event.target.seekTo(0, true);
              event.target.playVideo();
            } else if (currentIndex < videos.length - 1) {
              setCurrentIndex((prev) => prev + 1);
            }
          }
        },
      },
    });

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [apiLoaded, currentVideo, videos.length, currentIndex, playerCreated]);

  useEffect(() => {
    if (playerRef.current && currentVideo && playerReady) {
      playerRef.current.loadVideoById(currentVideo.youtubeVideoId);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentIndex, currentVideo, playerReady]);

  const play = useCallback(() => {
    setMiniPlayerDismissed(false);
    if (!playerCreated) {
      setPlayerCreated(true);
      autoPlayOnReadyRef.current = true;
      setIsInitializing(true);
      return;
    }
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.playVideo();
      } catch (e) {
        console.error("Error playing:", e);
      }
    } else {
      autoPlayOnReadyRef.current = true;
      setIsInitializing(true);
    }
  }, [playerCreated, playerReady]);

  const pause = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        console.error("Error pausing:", e);
      }
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (videos.length > 0) {
      // At end of playlist, wrap to beginning
      setCurrentIndex(0);
    }
  }, [currentIndex, videos.length]);

  const previous = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastBackPressRef.current;
    
    // If within first 3 seconds of song OR double-tapped within 3 seconds, go to previous track
    if (currentTime < 3 || timeSinceLastPress < 3000) {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (videos.length > 0) {
        // At beginning of playlist, wrap to end
        setCurrentIndex(videos.length - 1);
      }
      lastBackPressRef.current = 0; // Reset so next press restarts song
    } else {
      // Otherwise restart the current song
      if (playerRef.current) {
        try {
          playerRef.current.seekTo(0, true);
          setCurrentTime(0);
        } catch (e) {
          console.error("Error seeking to start:", e);
        }
      }
      lastBackPressRef.current = now; // Record this press
    }
  }, [currentIndex, currentTime, videos.length]);

  const selectTrack = useCallback((index: number) => {
    if (index >= 0 && index < videos.length) {
      setCurrentIndex(index);
    }
  }, [videos.length]);

  const seek = useCallback((time: number) => {
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(time, true);
        setCurrentTime(time);
      } catch (e) {
        console.error("Error seeking:", e);
      }
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(newVolume);
      } catch (e) {
        console.error("Error setting volume:", e);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      try {
        if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        } else {
          playerRef.current.mute();
          setIsMuted(true);
        }
      } catch (e) {
        console.error("Error toggling mute:", e);
      }
    }
  }, [isMuted]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const dismissMiniPlayer = useCallback(() => {
    setMiniPlayerDismissed(true);
    setMiniPlayerActivated(false);
    setIsInitializing(false);
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        console.error("Error pausing on dismiss:", e);
      }
    }
  }, []);

  const value: WorshipPlayerContextType = {
    videos,
    isLoading,
    currentIndex,
    isPlaying,
    isInitializing,
    volume,
    isMuted,
    isLooping,
    currentTime,
    duration,
    playerReady,
    currentVideo,
    mainPlayerVisible,
    miniPlayerDismissed,
    showMiniPlayer,
    play,
    pause,
    togglePlay,
    next,
    previous,
    selectTrack,
    seek,
    setVolume,
    toggleMute,
    toggleLoop,
    setMainPlayerVisible,
    dismissMiniPlayer,
    mainPlayerRef,
  };

  return (
    <WorshipPlayerContext.Provider value={value}>
      {children}
      {playerCreated && (
        <PlayerPortal
          mainPlayerVisible={mainPlayerVisible}
          showMiniPlayer={showMiniPlayer}
          mainPlayerRef={mainPlayerRef}
          playerContainerRef={playerContainerRef}
          currentVideo={currentVideo}
        />
      )}
    </WorshipPlayerContext.Provider>
  );
}
